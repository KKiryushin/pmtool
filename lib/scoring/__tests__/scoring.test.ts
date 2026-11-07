import { describe, expect, it } from "vitest";
import {
  computeAssessmentRollup,
  computeCategoryPercent,
  rollupCompetency,
  scoreToPercent,
} from "../index";

const SCALE = [
  { score: 0, percent: 0 },
  { score: 0.5, percent: 25 },
  { score: 1, percent: 50 },
  { score: 3, percent: 74 },
  { score: 4, percent: 79 },
  { score: 7, percent: 91 },
  { score: 10, percent: 100 },
];

describe("scoreToPercent", () => {
  it("returns exact matches", () => {
    expect(scoreToPercent(7, SCALE)).toBe(91);
    expect(scoreToPercent(0, SCALE)).toBe(0);
  });

  it("interpolates between points", () => {
    // halfway between 3 (74%) and 4 (79%) -> 76.5%
    expect(scoreToPercent(3.5, SCALE)).toBeCloseTo(76.5);
  });

  it("clamps below the minimum", () => {
    expect(scoreToPercent(-5, SCALE)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(scoreToPercent(50, SCALE)).toBe(100);
  });
});

describe("rollupCompetency — WEIGHTED_AVERAGE", () => {
  it("computes a plain average when weights are equal", () => {
    const result = rollupCompetency(
      [
        { score: 4, weight: 1 },
        { score: 6, weight: 1 },
      ],
      "WEIGHTED_AVERAGE",
    );
    expect(result).toBe(5);
  });

  it("weights higher-weight actions more heavily", () => {
    const result = rollupCompetency(
      [
        { score: 10, weight: 3 },
        { score: 0, weight: 1 },
      ],
      "WEIGHTED_AVERAGE",
    );
    expect(result).toBe(7.5);
  });
});

describe("rollupCompetency — MEDIAN_PENALIZED (ported from the original sheet)", () => {
  it("uses the median/average blend when median >= average", () => {
    // scores: 7, 7, 7, 7, 3 -> median 7, average 6.2, median >= average
    // -> floor((7 + 6.2) / 2 * 10) / 10 = floor(6.6*10)/10 = 6.6
    const result = rollupCompetency(
      [
        { score: 7, weight: 1 },
        { score: 7, weight: 1 },
        { score: 7, weight: 1 },
        { score: 7, weight: 1 },
        { score: 3, weight: 1 },
      ],
      "MEDIAN_PENALIZED",
    );
    expect(result).toBeCloseTo(6.6);
  });

  it("falls back to the floored median when median < average (an outlier pulls the average up)", () => {
    // scores: 0, 0, 0, 0, 10 -> median 0, average 2, median < average
    // -> floor(median) = 0
    const result = rollupCompetency(
      [
        { score: 0, weight: 1 },
        { score: 0, weight: 1 },
        { score: 0, weight: 1 },
        { score: 0, weight: 1 },
        { score: 10, weight: 1 },
      ],
      "MEDIAN_PENALIZED",
    );
    expect(result).toBe(0);
  });

  it("ignores weight (legacy formula is unweighted)", () => {
    const result = rollupCompetency(
      [
        { score: 4, weight: 100 },
        { score: 6, weight: 1 },
      ],
      "MEDIAN_PENALIZED",
    );
    // median(4,6)=5, average(4,6)=5, median>=average -> floor((5+5)/2*10)/10 = 5
    expect(result).toBe(5);
  });
});

describe("computeAssessmentRollup", () => {
  it("excludes conditional competencies the caller already filtered out", () => {
    const result = computeAssessmentRollup(
      [
        {
          id: "cat1",
          name: "Category 1",
          targetPercent: 91,
          levels: [
            {
              sortOrder: 1,
              isTarget: true,
              competencies: [{ id: "comp1", weight: 1, actions: [{ score: 7, weight: 1 }] }],
            },
          ],
        },
        {
          id: "cat2",
          name: "Category 2 (nothing applicable)",
          targetPercent: null,
          levels: [{ sortOrder: 1, isTarget: true, competencies: [] }],
        },
      ],
      "WEIGHTED_AVERAGE",
      SCALE,
    );

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].currentPercent).toBe(91);
    expect(result.categories[0].targetPercent).toBe(91);
    expect(result.categories[1].currentPercent).toBeNull();
    // overall only averages categories with a defined current percent
    expect(result.overallPercent).toBe(91);
  });

  it("averages multiple competencies within a category", () => {
    const result = computeAssessmentRollup(
      [
        {
          id: "cat1",
          name: "Category 1",
          targetPercent: 91,
          levels: [
            {
              sortOrder: 1,
              isTarget: true,
              competencies: [
                { id: "comp1", weight: 1, actions: [{ score: 10, weight: 1 }] }, // 100%
                { id: "comp2", weight: 1, actions: [{ score: 0, weight: 1 }] }, // 0%
              ],
            },
          ],
        },
      ],
      "WEIGHTED_AVERAGE",
      SCALE,
    );

    expect(result.categories[0].currentPercent).toBe(50);
  });

  it("weights competencies more heavily when their weight is higher", () => {
    const result = computeAssessmentRollup(
      [
        {
          id: "cat1",
          name: "Category 1",
          targetPercent: 91,
          levels: [
            {
              sortOrder: 1,
              isTarget: true,
              competencies: [
                { id: "comp1", weight: 3, actions: [{ score: 10, weight: 1 }] }, // 100%
                { id: "comp2", weight: 1, actions: [{ score: 0, weight: 1 }] }, // 0%
              ],
            },
          ],
        },
      ],
      "WEIGHTED_AVERAGE",
      SCALE,
    );

    // (100*3 + 0*1) / 4 = 75
    expect(result.categories[0].currentPercent).toBe(75);
  });

  it("blends a lower foundation level in via a geometric mean, not a plain average", () => {
    const result = computeAssessmentRollup(
      [
        {
          id: "cat1",
          name: "Category 1",
          targetPercent: 91,
          levels: [
            {
              // Junior: 100%
              sortOrder: 0,
              isTarget: false,
              competencies: [{ id: "jr", weight: 1, actions: [{ score: 10, weight: 1 }] }],
            },
            {
              // Senior (target): 79%
              sortOrder: 2,
              isTarget: true,
              competencies: [{ id: "sr", weight: 1, actions: [{ score: 4, weight: 1 }] }],
            },
          ],
        },
      ],
      "WEIGHTED_AVERAGE",
      SCALE,
    );

    // geometric mean of 100 and 79 -> sqrt(100*79) ≈ 88.88, not the plain average (89.5)
    expect(result.categories[0].currentPercent).toBeCloseTo(88.88, 1);
  });

  it("punishes an unscored foundation level instead of excluding it", () => {
    const result = computeAssessmentRollup(
      [
        {
          id: "cat1",
          name: "Category 1",
          targetPercent: 91,
          levels: [
            {
              // Junior competency exists but was never scored -> 0%, included
              sortOrder: 0,
              isTarget: false,
              competencies: [{ id: "jr", weight: 1, actions: [] }],
            },
            {
              // Senior (target): perfect score
              sortOrder: 2,
              isTarget: true,
              competencies: [{ id: "sr", weight: 1, actions: [{ score: 10, weight: 1 }] }],
            },
          ],
        },
      ],
      "WEIGHTED_AVERAGE",
      SCALE,
    );

    // geometric mean of 0 and 100 -> 0, a perfect target score can't paper over a
    // completely unscored foundation
    expect(result.categories[0].currentPercent).toBe(0);
  });

  it("excludes a lower level entirely when the category has no competency defined there", () => {
    const result = computeAssessmentRollup(
      [
        {
          id: "cat1",
          name: "Category 1",
          targetPercent: 91,
          levels: [
            { sortOrder: 0, isTarget: false, competencies: [] }, // nothing defined at Junior
            {
              sortOrder: 2,
              isTarget: true,
              competencies: [{ id: "sr", weight: 1, actions: [{ score: 7, weight: 1 }] }],
            },
          ],
        },
      ],
      "WEIGHTED_AVERAGE",
      SCALE,
    );

    // only the Senior level counts, same as if it were the only level at all
    expect(result.categories[0].currentPercent).toBe(91);
  });
});

describe("computeCategoryPercent", () => {
  it("returns null for an empty category", () => {
    expect(computeCategoryPercent([])).toBeNull();
  });

  it("weights each competency's percent by its own weight", () => {
    const result = computeCategoryPercent([
      { percent: 100, weight: 3 },
      { percent: 0, weight: 1 },
    ]);
    expect(result).toBe(75);
  });

  it("falls back to a plain average when all weights are equal", () => {
    const result = computeCategoryPercent([
      { percent: 80, weight: 1 },
      { percent: 40, weight: 1 },
    ]);
    expect(result).toBe(60);
  });
});
