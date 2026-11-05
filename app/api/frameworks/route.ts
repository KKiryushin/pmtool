import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/assessments/access";

// Read-only, any authenticated user: needed so a self-assessor can pick a
// framework + level when starting a new assessment. Full framework CRUD
// stays under /api/admin/frameworks (ADMIN only).
export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const frameworks = await prisma.framework.findMany({
    orderBy: { name: "asc" },
    include: { levels: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(frameworks);
}
