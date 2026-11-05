import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { scalePointSchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(prisma.scalePoint, scalePointSchema);
