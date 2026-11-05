import { prisma } from "@/lib/prisma";
import { listCreateHandlers } from "@/lib/admin/crud";
import { actionSchema } from "@/lib/admin/schemas";

export const { GET, POST } = listCreateHandlers(prisma.action, actionSchema, {
  orderBy: [{ competencyId: "asc" }, { sortOrder: "asc" }],
});
