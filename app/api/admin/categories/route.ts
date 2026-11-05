import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { categorySchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(prisma.category, categorySchema, {
  orderBy: [{ frameworkId: "asc" }, { sortOrder: "asc" }],
});
