import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { levelSchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(prisma.level, levelSchema, {
  orderBy: [{ frameworkId: "asc" }, { sortOrder: "asc" }],
});
