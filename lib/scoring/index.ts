// Pure scoring/rollup math: no DB or HTTP imports, plain data in/out.
// Called at read time for every dashboard/report view, so editing a
// ScalePoint or flipping Framework.rollupStrategy recomputes every
// historical assessment's percentages automatically — nothing here is
// ever persisted.

export type RollupStrategy = "WEIGHTED_AVERAGE" | "MEDIAN_PENALIZED";

export interface ScalePointInput {
  score: number;
  percent: number;
}

export interface ActionScoreInput {
  score: number;
  weight: number;
}

export interface CompetencyInput {
  id: string;
  weight: number;
  actions: ActionScoreInput[];
}

export interface CategoryInput {
  id: string;
  name: string;
  targetPercent: number | null;
  competencies: CompetencyInput[];
}

export interface CategoryResult {
  id: string;
  name: string;
  currentPercent: number | null;
  targetPercent: number | null;
}

export interface AssessmentRollupResult {
  categories: CategoryResult[];
  overallPercent: number | null;
}

/**
 * Maps a raw score (e.g. 0-10) to a percent using the scale's explicit
 * score -> percent points. Exact matches return that point's percent;
 * values between two points are linearly interpolated; values outside the
 * defined range clamp to the nearest endpoint's percent.
 */
export function scoreToPercent(rawScore: number, scalePoints: ScalePointInput[]): number {
  if (scalePoints.length === 0) return 0;

  const sorted = [...scalePoints].sort((a, b) => a.score - b.score);

  if (rawScore <= sorted[0].score) return sorted[0].percent;
  if (rawScore >= sorted[sorted.length - 1].score) return sorted[sorted.length - 1].percent;

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (rawScore >= lo.score && rawScore <= hi.score) {
      if (hi.score === lo.score) return lo.percent;
      const t = (rawScore - lo.score) / (hi.score - lo.score);
      return lo.percent + t * (hi.percent - lo.percent);
    }
  }

  return sorted[sorted.length - 1].percent;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Rounds down to 1 decimal place, e.g. 3.47 -> 3.4. */
function floorTo1Decimal(n: number): number {
  return Math.floor(n * 10) / 10;
}

/**
 * Rolls up a competency's action scores to a single raw score (still on
 * the raw scale, e.g. 0-10 — not yet converted to a percent).
 */
export function rollupCompetency(
  actionScores: ActionScoreInput[],
  strategy: RollupStrategy,
): number {
  if (actionScores.length === 0) return 0;

  if (strategy === "WEIGHTED_AVERAGE") {
    const totalWeight = actionScores.reduce((sum, a) => sum + a.weight, 0);
    if (totalWeight === 0) return 0;
    return actionScores.reduce((sum, a) => sum + a.score * a.weight, 0) / totalWeight;
  }

  // MEDIAN_PENALIZED: faithful port of the original spreadsheet's
  // conservative heuristic — if the median is at or above the mean (no
  // low outlier dragging the average down), use the average of the two,
  // rounded down to 1 decimal; otherwise fall back to the bare median,
  // rounded down to a whole number. This punishes inconsistent ratings
  // (one low score pulls the result down harder than a plain average
  // would).
  const scores = actionScores.map((a) => a.score);
  const med = median(scores);
  const avg = mean(scores);
  if (med >= avg) {
    return floorTo1Decimal((med + avg) / 2);
  }
  return Math.floor(med);
}

export function computeCompetencyPercent(
  actionScores: ActionScoreInput[],
  strategy: RollupStrategy,
  scalePoints: ScalePointInput[],
): number {
  const raw = rollupCompetency(actionScores, strategy);
  return scoreToPercent(raw, scalePoints);
}

export interface CompetencyPercentInput {
  percent: number;
  weight: number;
}

/**
 * Category percent is the weighted average of its competencies' percents,
 * using each competency's own weight (defaults to 1.0, admin-editable) —
 * mirrors how actions are weighted within a competency.
 */
export function computeCategoryPercent(competencies: CompetencyPercentInput[]): number | null {
  if (competencies.length === 0) return null;
  const totalWeight = competencies.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return null;
  return competencies.reduce((sum, c) => sum + c.percent * c.weight, 0) / totalWeight;
}

export function computeAssessmentRollup(
  categories: CategoryInput[],
  strategy: RollupStrategy,
  scalePoints: ScalePointInput[],
): AssessmentRollupResult {
  const results: CategoryResult[] = categories.map((cat) => {
    const competencyPercents = cat.competencies
      .filter((c) => c.actions.length > 0)
      .map((c) => ({
        percent: computeCompetencyPercent(c.actions, strategy, scalePoints),
        weight: c.weight,
      }));

    return {
      id: cat.id,
      name: cat.name,
      currentPercent: computeCategoryPercent(competencyPercents),
      targetPercent: cat.targetPercent,
    };
  });

  const defined = results.filter((r) => r.currentPercent !== null).map((r) => r.currentPercent!);
  const overallPercent = defined.length > 0 ? mean(defined) : null;

  return { categories: results, overallPercent };
}
