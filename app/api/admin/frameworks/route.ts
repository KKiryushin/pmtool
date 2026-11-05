import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { frameworkSchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(prisma.framework, frameworkSchema, {
  orderBy: { name: "asc" },
});
