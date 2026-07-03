import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";
import type { EnrollmentEligibility } from "../types/enrollment.types.ts";
import ProductService from "./product.service.ts";
import GamificationService from "./gamification.service.ts";
import NotificationService from "./notification.service.ts";


const ENROLLMENT_WITH_PRODUCT = {
  id: true,
  productId: true,
  userId: true,
  progress: true,
  completedLessons: true,
  moduleResults: true,
  product: {
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      price: true,
      modules: true,
      producerId: true,
    },
  },
} as const;

type LessonKey = `${number}-${number}`;

class EnrollmentService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async checkEligibility(
    productId: string,
    userId: string,
  ): Promise<EnrollmentEligibility> {
    const product = await ProductService.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const producer = await this.prisma.profiles.findUnique({
      where: { id: product.producerId },
      select: { banned: true },
    });

    const existing = await this.prisma.enrollments.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    const reasons: string[] = [];

    if (producer?.banned) {
      reasons.push("El creador del producto está suspendido");
    }

    if (product.status !== "PUBLISHED") {
      reasons.push("El producto no está publicado");
    }

    if (existing) {
      reasons.push("Ya estás inscrito en este producto");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      productId: product.id,
      productStatus: product.status,
      alreadyEnrolled: Boolean(existing),
    };
  }

  async enroll(productId: string, userId: string) {
    const eligibility = await this.checkEligibility(productId, userId);
    if (!eligibility.eligible) {
      throw new HttpError(400, eligibility.reasons.join(". "));
    }

    return this.prisma.enrollments.create({
      data: { productId, userId, progress: 0, completedLessons: [] },
      select: ENROLLMENT_WITH_PRODUCT,
    });
  }

  async listByStudent(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [enrollments, total] = await Promise.all([
      this.prisma.enrollments.findMany({
        where: { userId },
        select: ENROLLMENT_WITH_PRODUCT,
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.enrollments.count({ where: { userId } }),
    ]);
    return {
      enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCourseContent(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: ENROLLMENT_WITH_PRODUCT,
    });

    if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
    if (enrollment.userId !== userId) {
      throw new HttpError(403, "No tienes acceso a este curso");
    }

    const modules = (enrollment.product.modules as any[]) || [];
    const completedLessons: LessonKey[] =
      (enrollment.completedLessons as LessonKey[]) || [];
    const moduleResults: Record<string, any> =
      (enrollment.moduleResults as Record<string, any>) || {};

    return {
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        completedLessons,
        moduleResults,
      },
      product: {
        id: enrollment.product.id,
        title: enrollment.product.title,
        description: enrollment.product.description,
        thumbnail: enrollment.product.thumbnail,
        modules: modules.map((mod: any, modIdx: number) => {
          const mr = moduleResults[String(modIdx)];
          return {
            title: mod.title,
            hasEvaluation: Boolean(mod.evaluation?.questions?.length),
            evaluationPassed: mr?.passed ?? false,
            evaluationScore: mr?.score ?? null,
            lessons: mod.lessons.map((lesson: any, lesIdx: number) => ({
              title: lesson.title,
              durationMinutes: lesson.durationMinutes,
              hlsUrl: lesson.hlsUrl || null,
              content: lesson.content || null,
              completed: completedLessons.includes(`${modIdx}-${lesIdx}` as LessonKey),
            })),
          };
        }),
      },
    };
  }

  async completeLesson(
    enrollmentId: string,
    userId: string,
    moduleIndex: number,
    lessonIndex: number,
  ) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        userId: true,
        progress: true,
        completedLessons: true,
        productId: true,
      },
    });

    if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
    if (enrollment.userId !== userId) {
      throw new HttpError(403, "No tienes acceso a este curso");
    }

    const completedLessons: LessonKey[] =
      (enrollment.completedLessons as LessonKey[]) || [];
    const key = `${moduleIndex}-${lessonIndex}` as LessonKey;

    if (completedLessons.includes(key)) {
      return { alreadyCompleted: true };
    }

    const product = await ProductService.getById(enrollment.productId);
    const modules: any[] = (product?.modules as any[]) || [];
    const totalLessons = modules.reduce(
      (acc: number, m: any) => acc + (m.lessons?.length || 0),
      0,
    );

    if (totalLessons === 0) {
      throw new HttpError(400, "Este curso no tiene lecciones");
    }

    const newCompleted = [...completedLessons, key];
    const progress = Math.round((newCompleted.length / totalLessons) * 100);

    const updated = await this.prisma.enrollments.update({
      where: { id: enrollmentId },
      data: {
        completedLessons: newCompleted,
        progress,
      },
      select: { id: true, progress: true, completedLessons: true },
    });

    if (progress === 100) {
      try {
        await GamificationService.addXP(userId, 200);
      } catch {}
      try {
        await NotificationService.create({
          userId,
          title: "¡Curso completado!",
          message: `Felicitaciones, has completado "${product?.title}". Has ganado +200 XP.`,
          link: "/user/courses",
        });
      } catch {}
    }

    return {
      progress: updated.progress,
      completedLessons: updated.completedLessons,
      courseCompleted: progress === 100,
    };
  }

  async getModuleEvaluation(
    enrollmentId: string,
    userId: string,
    moduleIndex: number,
  ) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        userId: true,
        product: { select: { modules: true } },
        moduleResults: true,
      },
    });

    if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
    if (enrollment.userId !== userId) {
      throw new HttpError(403, "No tienes acceso a este curso");
    }

    const modules: any[] = (enrollment.product.modules as any[]) || [];
    const mod = modules[moduleIndex];
    if (!mod) throw new HttpError(404, "Módulo no encontrado");

    const evaluation = mod.evaluation;
    if (!evaluation?.questions?.length) {
      throw new HttpError(404, "Este módulo no tiene evaluación");
    }

    const moduleResults = (enrollment.moduleResults as Record<string, any>) || {};
    const existing = moduleResults[String(moduleIndex)];

    const questions = evaluation.questions.map((q: any) => {
      const base = { id: q.id, type: q.type ?? "multiple-choice", question: q.question };
      if (q.type === "short-answer") return base;
      if (q.type === "true-false") return { ...base, options: ["Verdadero", "Falso"] };
      return { ...base, options: q.options };
    });

    return {
      moduleTitle: mod.title,
      passingScore: evaluation.passingScore ?? 60,
      questions,
      totalQuestions: evaluation.questions.length,
      previousAttempt: existing || null,
    };
  }

  async submitModuleEvaluation(
    enrollmentId: string,
    userId: string,
    moduleIndex: number,
    answers: { questionId: string; selectedIndex?: number; selectedIndices?: number[]; textAnswer?: string }[],
  ) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        userId: true,
        productId: true,
        product: { select: { modules: true, title: true } },
        moduleResults: true,
      },
    });

    if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
    if (enrollment.userId !== userId) {
      throw new HttpError(403, "No tienes acceso a este curso");
    }

    const modules: any[] = (enrollment.product.modules as any[]) || [];
    const mod = modules[moduleIndex];
    if (!mod) throw new HttpError(404, "Módulo no encontrado");

    const evaluation = mod.evaluation;
    if (!evaluation?.questions?.length) {
      throw new HttpError(404, "Este módulo no tiene evaluación");
    }

    const questions = evaluation.questions;
    let correctCount = 0;

    const gradedAnswers = questions.map((q: any) => {
      const userAnswer = answers.find((a) => a.questionId === q.id);
      const type = q.type ?? "multiple-choice";
      let isCorrect = false;
      const graded: any = { questionId: q.id };

      if (type === "multiple-choice" || type === "true-false") {
        const selected = userAnswer?.selectedIndex ?? -1;
        graded.selectedIndex = selected;
        isCorrect = selected === q.correctIndex;
      } else if (type === "multiple-answer") {
        const selected = userAnswer?.selectedIndices ?? [];
        graded.selectedIndices = selected;
        const correct = (q.correctIndices as number[]) ?? [];
        if (selected.length === correct.length) {
          isCorrect = selected.every((s: number) => correct.includes(s));
        }
      } else if (type === "short-answer") {
        const text = (userAnswer?.textAnswer ?? "").trim();
        graded.textAnswer = text;
        isCorrect = text.toLowerCase() === ((q.correctAnswer as string) ?? "").trim().toLowerCase();
      }

      if (isCorrect) correctCount++;
      graded.correct = isCorrect;
      return graded;
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passingScore = evaluation.passingScore ?? 60;
    const passed = score >= passingScore;

    const moduleKey = String(moduleIndex);
    const currentResults: Record<string, any> =
      (enrollment.moduleResults as Record<string, any>) || {};
    currentResults[moduleKey] = {
      score,
      passed,
      answers: gradedAnswers,
      attemptedAt: new Date().toISOString(),
    };

    // Recalcular progreso general basado en módulos aprobados
    const allModules = modules;
    const totalModules = allModules.length;
    const completedModules = allModules.filter((_m: any, i: number) => {
      const key = String(i);
      const result = i === moduleIndex ? passed : currentResults[key]?.passed;
      return result;
    }).length;
    const newProgress = Math.round((completedModules / totalModules) * 100);

    await this.prisma.enrollments.update({
      where: { id: enrollmentId },
      data: {
        moduleResults: currentResults,
        progress: newProgress,
      },
    });

    if (passed && newProgress === 100) {
      try {
        await GamificationService.addXP(userId, 200);
        await NotificationService.create({
          userId,
          title: "¡Curso completado!",
          message: `Felicitaciones, has completado "${enrollment.product.title}". Has ganado +200 XP.`,
          link: "/user/courses",
        });
      } catch {}
    }

    return {
      score,
      passed,
      passingScore,
      correctCount,
      totalQuestions,
      gradedAnswers,
    };
  }

  async getSignedVideoUrl(
    enrollmentId: string,
    userId: string,
    moduleIndex: number,
    lessonIndex: number,
  ) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        userId: true,
        product: { select: { modules: true, producerId: true } },
      },
    });

    if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
    if (enrollment.userId !== userId) {
      throw new HttpError(403, "No tienes acceso a este curso");
    }

    const modules: any[] = (enrollment.product.modules as any[]) || [];
    const lesson = modules[moduleIndex]?.lessons[lessonIndex];

    if (!lesson?.hlsUrl) {
      throw new HttpError(404, "Video no encontrado en esta lección");
    }

    return { hlsUrl: lesson.hlsUrl };
  }
}

export default new EnrollmentService();
