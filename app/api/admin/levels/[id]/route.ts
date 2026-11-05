import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { levelSchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(prisma.level, levelSchema);
