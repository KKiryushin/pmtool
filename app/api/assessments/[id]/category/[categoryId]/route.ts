import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadOwnedAssessment, requireSession } from "@/lib/assessments/access";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; categoryId: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id, categoryId } = await ctx.params;

  const { assessment, error: accessError } = await loadOwnedAssessment(
    id,
    session.user.id,
    session.user.role,
  );
  if (accessError) return accessError;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.frameworkId !== assessment!.frameworkId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [framework, levels, competencies, targets, scores, answers] = await Promise.all([
    prisma.framework.findUnique({
      where: { id: assessment!.frameworkId },
      include: { scale: { include: { points: { orderBy: { sortOrder: "asc" } } } } },
    }),
    prisma.level.findMany({
      where: { frameworkId: assessment!.frameworkId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.competency.findMany({
      where: { categoryId },
      orderBy: { sortOrder: "asc" },
      include: { actions: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.categoryLevelTarget.findMany({ where: { categoryId } }),
    prisma.assessmentScore.findMany({
      where: { assessmentId: assessment!.id, action: { competency: { categoryId } } },
    }),
    prisma.assessmentAnswer.findMany({
      where: { assessmentId: assessment!.id, competency: { categoryId } },
    }),
  ]);

  const scoreByAction = new Map(scores.map((s) => [s.actionId, s.score]));
  const answerByCompetency = new Map(answers.map((a) => [a.competencyId, a.answer]));
  const targetByLevel = new Map(targets.map((t) => [t.levelId, t.targetPercent]));

  const levelPayload = levels.map((level) => ({
    id: level.id,
    name: level.name,
    shortName: level.shortName,
    description: level.description,
    targetPercent: targetByLevel.get(level.id) ?? null,
    competencies: competencies
      .filter((c) => c.levelId === level.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        isConditional: c.isConditional,
        conditionalQuestionText: c.conditionalQuestionText,
        conditionalAnswer: answerByCompetency.get(c.id) ?? null,
        actions: c.actions.map((a) => ({
          id: a.id,
          statement: a.statement,
          weight: a.weight,
          score: scoreByAction.get(a.id) ?? null,
        })),
      })),
  }));

  return NextResponse.json({
    category: { id: category.id, name: category.name },
    scale: {
      id: framework!.scale.id,
      points: framework!.scale.points.map((p) => ({
        score: p.score,
        label: p.label,
        percent: p.percent,
      })),
    },
    levels: levelPayload,
  });
}
