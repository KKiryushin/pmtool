import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadOwnedAssessment, requireSession } from "@/lib/assessments/access";

export async function POST(
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

  if (assessment!.status !== "DRAFT") {
    return NextResponse.json({ error: "Assessment already submitted" }, { status: 409 });
  }

  const scoreCount = await prisma.assessmentScore.count({
    where: { assessmentId: assessment!.id },
  });
  if (scoreCount === 0) {
    return NextResponse.json(
      { error: "Score at least one action before submitting" },
      { status: 400 },
    );
  }

  const updated = await prisma.assessment.update({
    where: { id: assessment!.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  return NextResponse.json(updated);
}
