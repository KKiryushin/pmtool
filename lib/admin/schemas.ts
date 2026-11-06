import { z } from "zod";

export const frameworkSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  scaleId: z.string().min(1),
  rollupStrategy: z.enum(["WEIGHTED_AVERAGE", "MEDIAN_PENALIZED"]).optional(),
});

export const scaleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const scalePointSchema = z.object({
  scaleId: z.string().min(1),
  score: z.number(),
  label: z.string().min(1),
  percent: z.number().min(0).max(100),
  sortOrder: z.number().int().optional(),
});

export const levelSchema = z.object({
  frameworkId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  description: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export const categorySchema = z.object({
  frameworkId: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export const categoryLevelTargetSchema = z.object({
  categoryId: z.string().min(1),
  levelId: z.string().min(1),
  targetPercent: z.number().min(0).max(100),
});

export const competencySchema = z.object({
  categoryId: z.string().min(1),
  levelId: z.string().min(1),
  name: z.string().min(1),
  isConditional: z.boolean().optional(),
  conditionalQuestionText: z.string().optional().nullable(),
  weight: z.number().min(0).optional(),
  sortOrder: z.number().int().optional(),
});

export const actionSchema = z.object({
  competencyId: z.string().min(1),
  statement: z.string().min(1),
  weight: z.number().min(0).optional(),
  sortOrder: z.number().int().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "SELF_ASSESSOR", "MANAGER_REVIEWER"]),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["ADMIN", "SELF_ASSESSOR", "MANAGER_REVIEWER"]).optional(),
});
