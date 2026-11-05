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

  const [categories, scores, answers] = await Promise.all([
    prisma.category.findMany({
      where: { frameworkId: assessment!.frameworkId },
      orderBy: { sortOrder: "asc" },
      include: {
        competencies: {
          include: { actions: { select: { id: true } } },
        },
      },
    }),
    prisma.assessmentScore.findMany({
      where: { assessmentId: assessment!.id },
      select: { actionId: true },
    }),
    prisma.assessmentAnswer.findMany({
      where: { assessmentId: assessment!.id },
      select: { competencyId: true, answer: true },
    }),
  ]);

  const scoredActionIds = new Set(scores.map((s) => s.actionId));
  const answerByCompetency = new Map(answers.map((a) => [a.competencyId, a.answer]));

  const result = categories.map((cat) => {
    let totalActions = 0;
    let scoredActions = 0;
    for (const comp of cat.competencies) {
      if (comp.isConditional && answerByCompetency.get(comp.id) === false) continue;
      totalActions += comp.actions.length;
      scoredActions += comp.actions.filter((a) => scoredActionIds.has(a.id)).length;
    }
    return { id: cat.id, name: cat.name, totalActions, scoredActions };
  });

  return NextResponse.json(result);
}
