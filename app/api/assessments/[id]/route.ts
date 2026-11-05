import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadOwnedAssessment, requireSession } from "@/lib/assessments/access";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;

  const { assessment, error: accessError } = await loadOwnedAssessment(
    id,
    session.user.id,
    session.user.role,
  );
  if (accessError) return accessError;

  const full = await prisma.assessment.findUnique({
    where: { id: assessment!.id },
    include: { framework: true, level: true },
  });

  return NextResponse.json(full);
}
