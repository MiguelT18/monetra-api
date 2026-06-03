import type { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import achievementService from "../services/achievement.service.ts";

export const getMyAchievements: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const profile = req.profile!;

    const achievements = await achievementService.getUserAchievements(
      profile.id,
      profile.role,
    );
    res.status(200).json(ok("Achievements retrieved", achievements));
  },
);

export const updateProgress: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const profile = req.profile!;
    const { achievementKey, progress, status } = req.body;

    if (!achievementKey || progress === undefined) {
      res
        .status(400)
        .json({ message: "achievementKey and progress are required" });
      return;
    }

    const result = await achievementService.updateProgress(
      profile.id,
      achievementKey,
      progress,
      status,
    );
    res.status(200).json(ok("Progress updated", result));
  },
);

export const getAllTemplates: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const templates = await achievementService.getAllTemplates();
    res.status(200).json(ok("Achievement templates retrieved", templates));
  },
);

export const createTemplate: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { key, title, description, icon, xpReward, role } = req.body;

    if (!key || !title || !description || !icon || !role) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const template = await achievementService.createTemplate({
      key,
      title,
      description,
      icon,
      xpReward: xpReward ?? 0,
      role,
    });
    res.status(201).json(ok("Achievement template created", template));
  },
);

export const updateTemplate: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { title, description, icon, xpReward, role } = req.body;

    const template = await achievementService.updateTemplate(id, {
      title,
      description,
      icon,
      xpReward,
      role,
    });
    res.status(200).json(ok("Achievement template updated", template));
  },
);

export const deleteTemplate: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await achievementService.deleteTemplate(id);
    res.status(200).json(ok("Achievement template deleted"));
  },
);
