import type { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import GamificationService from "../services/gamification.service.ts";

export const getMyProgress: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.profile!.id;

    let progress = await GamificationService.getUserProgress(userId);
    if (!progress) {
      progress = await GamificationService.createUserProgress(userId);
    }

    res.status(200).json(ok("Progreso de gamificación", progress));
  },
);

export const addXP: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.profile!.id;
    const { xp } = req.body;

    if (!xp || typeof xp !== "number" || xp <= 0) {
      res.status(400).json({ message: "xp debe ser un número positivo" });
      return;
    }

    const result = await GamificationService.addXP(userId, xp);

    res.status(200).json(ok("XP añadido correctamente", result));
  },
);

export const getXpRecommendation: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const difficulty = req.query.difficulty as string;

    if (!["easy", "medium", "hard", "epic"].includes(difficulty)) {
      res.status(400).json({
        message: "difficulty debe ser: easy, medium, hard o epic",
      });
      return;
    }

    const xp = GamificationService.recommendXpReward(
      difficulty as "easy" | "medium" | "hard" | "epic",
    );

    res.status(200).json(ok("Recomendación de XP", { difficulty, xp }));
  },
);

export const getLeaderBoard: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, parseInt(_req.query.limit as string) || 10));

    const leaderboard = await GamificationService.getLeaderBoard(limit);

    res.status(200).json(ok("Leaderboard", leaderboard));
  },
);
