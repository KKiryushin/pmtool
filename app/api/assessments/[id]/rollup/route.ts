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

  const allLevels = await prisma.level.findMany({
    where: { frameworkId: assessment!.frameworkId },
    orderBy: { sortOrder: "asc" },
  });
  const targetLevel = allLevels.find((l) => l.id === assessment!.levelId);
  // Every level at or below the assessment's own level feeds the category
  // score — levels above it never participate.
  const eligibleLevels = targetLevel
    ? allLevels.filter((l) => l.sortOrder <= targetLevel.sortOrder)
    : [];
  const eligibleLevelIds = eligibleLevels.map((l) => l.id);

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
          where: { levelId: { in: eligibleLevelIds } },
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

  const categoryInputs: CategoryInput[] = categories.map((cat) => {
    const competenciesByLevel = new Map<string, typeof cat.competencies>();
    for (const comp of cat.competencies) {
      if (comp.isConditional && answerByCompetency.get(comp.id) === false) continue;
      const list = competenciesByLevel.get(comp.levelId) ?? [];
      list.push(comp);
      competenciesByLevel.set(comp.levelId, list);
    }

    return {
      id: cat.id,
      name: cat.name,
      targetPercent: targetByCategory.get(cat.id) ?? null,
      levels: eligibleLevels.map((lvl) => ({
        sortOrder: lvl.sortOrder,
        isTarget: lvl.id === assessment!.levelId,
        competencies: (competenciesByLevel.get(lvl.id) ?? []).map((comp) => ({
          id: comp.id,
          weight: comp.weight,
          actions: comp.actions
            .filter((a) => scoreByAction.has(a.id))
            .map((a) => ({ score: scoreByAction.get(a.id)!, weight: a.weight })),
        })),
      })),
    };
  });

  const result = computeAssessmentRollup(
    categoryInputs,
    framework!.rollupStrategy,
    framework!.scale.points.map((p) => ({ score: p.score, percent: p.percent })),
  );

  return NextResponse.json(result);
}
