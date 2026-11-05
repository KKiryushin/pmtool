import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { scaleSchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(prisma.scale, scaleSchema, {
  orderBy: { name: "asc" },
  include: { points: { orderBy: { sortOrder: "asc" } } },
});
