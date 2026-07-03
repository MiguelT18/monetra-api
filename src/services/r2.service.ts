import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawn, execFile } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { HttpError } from "../errors/http-error.ts";
import { generatePresignedUploadUrl, uploadHLSFiles, getPublicUrl, hasR2Credentials } from "../lib/r2.ts";

const STATIC_DIR = join(homedir(), "ffmpeg-static");
const FFMPEG_PATH = existsSync(join(STATIC_DIR, "ffmpeg"))
  ? join(STATIC_DIR, "ffmpeg")
  : "ffmpeg";
const FFPROBE_PATH = existsSync(join(STATIC_DIR, "ffprobe"))
  ? join(STATIC_DIR, "ffprobe")
  : "ffprobe";

type JobStatus = "uploading" | "processing" | "completed" | "failed";

interface TranscodeJob {
  id: string;
  sourceKey: string;
  status: JobStatus;
  hlsUrl: string | null;
  durationMinutes: number | null;
  error: string | null;
  createdAt: Date;
}

const jobs = new Map<string, TranscodeJob>();

class R2Service {
  async requestUploadUrl(): Promise<{ url: string; uploadId: string }> {
    if (!hasR2Credentials) {
      throw new HttpError(500, "R2 no está configurado");
    }

    const uploadId = randomUUID();
    const key = `uploads/${uploadId}.mp4`;

    const url = await generatePresignedUploadUrl(key, "video/mp4");

    jobs.set(uploadId, {
      id: uploadId,
      sourceKey: key,
      status: "uploading",
      hlsUrl: null,
      durationMinutes: null,
      error: null,
      createdAt: new Date(),
    });

    return { url, uploadId };
  }

  async requestAttachmentUploadUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; fileId: string; key: string; publicUrl: string }> {
    if (!hasR2Credentials) {
      throw new HttpError(500, "R2 no está configurado");
    }

    const fileId = randomUUID();
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
    const key = `attachments/${fileId}${ext ? `.${ext}` : ""}`;

    const url = await generatePresignedUploadUrl(key, contentType);
    const publicUrl = getPublicUrl(key);

    return { url, fileId, key, publicUrl };
  }

  async startTranscoding(uploadId: string): Promise<void> {
    const job = jobs.get(uploadId);
    if (!job) throw new HttpError(404, "Subida no encontrada");
    if (job.status !== "uploading") throw new HttpError(400, "La subida ya está siendo procesada");

    job.status = "processing";

    this.runFfmpeg(uploadId, job.sourceKey).catch((err) => {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      console.error(`[r2] FFmpeg error for job ${uploadId}:`, err);
    });
  }

  private async runFfmpeg(uploadId: string, sourceKey: string): Promise<void> {
    const job = jobs.get(uploadId);
    if (!job) return;

    const sourceUrl = getPublicUrl(sourceKey);
    const tempDir = await mkdtemp(join(tmpdir(), `monetra-${uploadId}-`));
    const outputDir = join(tempDir, "hls");
    const inputPath = join(tempDir, "source.mp4");

    try {
      console.log(`[r2] Downloading source from ${sourceUrl}`);
      const resp = await fetch(sourceUrl);
      if (!resp.ok || !resp.body) {
        throw new Error(`Failed to download source: ${resp.status}`);
      }
      await pipeline(Readable.fromWeb(resp.body as any), createWriteStream(inputPath));

      const durationSeconds = await this.probeDuration(inputPath);
      job.durationMinutes = durationSeconds !== null
        ? Math.round(durationSeconds / 6) / 10
        : null;

      await this.transcodeToHLS(inputPath, outputDir);

      await uploadHLSFiles(uploadId, outputDir);

      job.status = "completed";
      job.hlsUrl = getPublicUrl(`hls/${uploadId}/master.m3u8`);
      console.log(`[r2] Transcoding complete: ${job.hlsUrl}`);
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      console.error(`[r2] Transcoding failed for ${uploadId}:`, err);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private transcodeToHLS(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      mkdirSync(outputDir, { recursive: true });

      const args = [
        "-i", inputPath,
        "-c:v", "libx264", "-b:v", "3000k",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-vf", "scale=1280:720",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-master_pl_name", "master.m3u8",
        join(outputDir, "index.m3u8"),
      ];

      const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";

      proc.stdout?.on("data", () => {});
      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`FFmpeg not found or failed to start: ${err.message}`));
      });
    });
  }

  private probeDuration(inputPath: string): Promise<number | null> {
    const ffprobePath = FFPROBE_PATH;
    return new Promise((resolve) => {
      execFile(
        ffprobePath,
        [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "csv=p=0",
          inputPath,
        ],
        { timeout: 30000 },
        (err, stdout) => {
          if (err) {
            console.error("[r2] ffprobe failed:", err.message);
            resolve(null);
            return;
          }
          const secs = parseFloat(stdout.trim());
          resolve(Number.isFinite(secs) ? secs : null);
        },
      );
    });
  }

  getJobStatus(uploadId: string): TranscodeJob | null {
    return jobs.get(uploadId) ?? null;
  }

  getJob(uploadId: string): TranscodeJob {
    const job = jobs.get(uploadId);
    if (!job) throw new HttpError(404, "Subida no encontrada");
    return job;
  }

  getHlsUrl(uploadId: string): string {
    const job = jobs.get(uploadId);
    if (!job || !job.hlsUrl) throw new HttpError(404, "Video no encontrado");
    return job.hlsUrl;
  }
}

export default new R2Service();
