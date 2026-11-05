import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadOwnedAssessment, requireSession } from "@/lib/assessments/access";

const bodySchema = z.array(
  z.object({ actionId: z.string().min(1), score: z.number().min(0) }),
);

export async function PUT(
  req: NextRequest,
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
    return NextResponse.json({ error: "Assessment is not editable" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.map((entry) =>
      prisma.assessmentScore.upsert({
        where: {
          assessmentId_actionId: { assessmentId: assessment!.id, actionId: entry.actionId },
        },
        create: { assessmentId: assessment!.id, actionId: entry.actionId, score: entry.score },
        update: { score: entry.score },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
