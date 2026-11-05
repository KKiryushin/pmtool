import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadOwnedAssessment, requireSession } from "@/lib/assessments/access";
import { computeAssessmentRollup, type CategoryInput } from "@/lib/scoring";

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

  const [framework, categories, scores, answers, targets] = await Promise.all([
    prisma.framework.findUnique({
      where: { id: assessment!.frameworkId },
      include: { scale: { include: { points: true } } },
    }),
    prisma.category.findMany({
      where: { frameworkId: assessment!.frameworkId },
      orderBy: { sortOrder: "asc" },
      include: {
        competencies: {
          where: { levelId: assessment!.levelId },
          include: { actions: true },
        },
      },
    }),
    prisma.assessmentScore.findMany({ where: { assessmentId: assessment!.id } }),
    prisma.assessmentAnswer.findMany({ where: { assessmentId: assessment!.id } }),
    prisma.categoryLevelTarget.findMany({ where: { levelId: assessment!.levelId } }),
  ]);

  const scoreByAction = new Map(scores.map((s) => [s.actionId, s.score]));
  const answerByCompetency = new Map(answers.map((a) => [a.competencyId, a.answer]));
  const targetByCategory = new Map(targets.map((t) => [t.categoryId, t.targetPercent]));

  const categoryInputs: CategoryInput[] = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    targetPercent: targetByCategory.get(cat.id) ?? null,
    competencies: cat.competencies
      .filter((comp) => !(comp.isConditional && answerByCompetency.get(comp.id) === false))
      .map((comp) => ({
        id: comp.id,
        actions: comp.actions
          .filter((a) => scoreByAction.has(a.id))
          .map((a) => ({ score: scoreByAction.get(a.id)!, weight: a.weight })),
      })),
  }));

  const result = computeAssessmentRollup(
    categoryInputs,
    framework!.rollupStrategy,
    framework!.scale.points.map((p) => ({ score: p.score, percent: p.percent })),
  );

  return NextResponse.json(result);
}
