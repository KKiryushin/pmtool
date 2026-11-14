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

/**
 * One level's worth of competencies for a category. `isTarget` marks the
 * level the assessment is actually being taken at — every other level in
 * a category's `levels` array is a lower, "foundation" level that the
 * target level's score is blended against.
 */
export interface CategoryLevelGroup {
  sortOrder: number;
  isTarget: boolean;
  competencies: CompetencyInput[];
}

export interface CategoryInput {
  id: string;
  name: string;
  targetPercent: number | null;
  levels: CategoryLevelGroup[];
}

export interface LevelPercentResult {
  sortOrder: number;
  isTarget: boolean;
  /** null when this category has no competency defined at this level at all. */
  percent: number | null;
}

export interface CategoryResult {
  id: string;
  name: string;
  currentPercent: number | null;
  targetPercent: number | null;
  /** One entry per level passed in, in the same order, for a per-level breakdown. */
  levelPercents: LevelPercentResult[];
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

/**
 * Computes a single level's percent for a category.
 *
 * At the assessment's own (target) level, a competency with no scored
 * actions is excluded from the average — unscored items aren't held
 * against you at the level you're actually being assessed at.
 *
 * At a lower, foundation level, a competency with no scored actions
 * contributes 0% instead of being excluded. Skipping a foundation level
 * must count against you — otherwise cross-level scoring is gameable by
 * simply never touching anything below your target level.
 */
function computeLevelPercent(
  competencies: CompetencyInput[],
  isTarget: boolean,
  strategy: RollupStrategy,
  scalePoints: ScalePointInput[],
): number | null {
  const scored = isTarget ? competencies.filter((c) => c.actions.length > 0) : competencies;

  const percents = scored.map((c) => ({
    percent: c.actions.length > 0 ? computeCompetencyPercent(c.actions, strategy, scalePoints) : 0,
    weight: c.weight,
  }));

  return computeCategoryPercent(percents);
}

/**
 * Combines a category's per-level percents into one cross-level score
 * using a weighted geometric mean (equal weight per level here — all
 * levels at or below the assessment's target level matter equally,
 * since a lower level that's been strong for a while shouldn't count
 * less just because it's not the current target).
 *
 * A geometric mean is deliberately harsher than a plain average on a
 * weak or unscored lower level: one low level pulls the whole category
 * down disproportionately (true "punishment" for skipping the
 * foundation), while several solid levels land close to a plain
 * average. It degrades smoothly rather than via a hard cutoff.
 */
function combineLevelPercents(percents: number[]): number | null {
  if (percents.length === 0) return null;
  const product = percents.reduce((acc, p) => acc * (p / 100), 1);
  return 100 * Math.pow(product, 1 / percents.length);
}

export function computeAssessmentRollup(
  categories: CategoryInput[],
  strategy: RollupStrategy,
  scalePoints: ScalePointInput[],
): AssessmentRollupResult {
  const results: CategoryResult[] = categories.map((cat) => {
    const levelPercents: LevelPercentResult[] = cat.levels.map((lvl) => ({
      sortOrder: lvl.sortOrder,
      isTarget: lvl.isTarget,
      percent: computeLevelPercent(lvl.competencies, lvl.isTarget, strategy, scalePoints),
    }));
    const defined = levelPercents
      .map((lp) => lp.percent)
      .filter((p): p is number => p !== null);

    return {
      id: cat.id,
      name: cat.name,
      currentPercent: combineLevelPercents(defined),
      targetPercent: cat.targetPercent,
      levelPercents,
    };
  });

  const defined = results.filter((r) => r.currentPercent !== null).map((r) => r.currentPercent!);
  const overallPercent = defined.length > 0 ? mean(defined) : null;

  return { categories: results, overallPercent };
}
