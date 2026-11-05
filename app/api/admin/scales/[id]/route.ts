import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { scaleSchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(prisma.scale, scaleSchema);
