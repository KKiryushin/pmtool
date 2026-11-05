import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { categorySchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(prisma.category, categorySchema);
