import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { categoryLevelTargetSchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(
  prisma.categoryLevelTarget,
  categoryLevelTargetSchema,
);
