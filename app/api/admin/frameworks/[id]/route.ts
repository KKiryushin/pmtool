import { prisma } from "@/lib/prisma";
import { itemHandlers } from "@/lib/admin/crud";
import { frameworkSchema } from "@/lib/admin/schemas";

export const { PATCH, DELETE } = itemHandlers(prisma.framework, frameworkSchema);
