import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { categoryLevelTargetSchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(
  prisma.categoryLevelTarget,
  categoryLevelTargetSchema,
);
