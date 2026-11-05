import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { competencySchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(prisma.competency, competencySchema);
