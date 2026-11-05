import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { competencySchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(prisma.competency, competencySchema, {
  orderBy: [{ categoryId: "asc" }, { levelId: "asc" }, { sortOrder: "asc" }],
  include: { actions: { orderBy: { sortOrder: "asc" } } },
});
