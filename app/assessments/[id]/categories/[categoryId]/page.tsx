"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Action {
  id: string;
  statement: string;
  weight: number;
  score: number | null;
}

interface Competency {
  id: string;
  name: string;
  isConditional: boolean;
  conditionalQuestionText: string | null;
  conditionalAnswer: boolean | null;
  actions: Action[];
}

interface LevelPayload {
  id: string;
  name: string;
  shortName: string;
  description: string;
  targetPercent: number | null;
  competencies: Competency[];
}

interface ScalePoint {
  score: number;
  label: string;
  percent: number;
}

interface CategoryPayload {
  category: { id: string; name: string };
  scale: { id: string; points: ScalePoint[] };
  levels: LevelPayload[];
}

interface CategoryProgress {
  id: string;
  name: string;
  totalActions: number;
  scoredActions: number;
}

export default function CategoryScoringPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CategoryPayload | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [infoOpenId, setInfoOpenId] = useState<string | null>(null);
  const [categoriesProgress, setCategoriesProgress] = useState<CategoryProgress[] | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const wasComplete = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/assessments/${id}/category/${categoryId}`);
    if (res.ok) setData(await res.json());
  }, [id, categoryId]);

  const loadCategoriesProgress = useCallback(async () => {
    const res = await fetch(`/api/assessments/${id}/categories`);
    if (res.ok) setCategoriesProgress(await res.json());
  }, [id]);

  // Fetch-on-mount: setState happens after the awaited response inside
  // load(), not synchronously during the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
     
    loadCategoriesProgress();
  }, [load, loadCategoriesProgress]);

  async function setScore(actionId: string, score: number) {
    setSaving(actionId);
    setData((prev) =>
      prev
        ? {
            ...prev,
            levels: prev.levels.map((lvl) => ({
              ...lvl,
              competencies: lvl.competencies.map((c) => ({
                ...c,
                actions: c.actions.map((a) => (a.id === actionId ? { ...a, score } : a)),
              })),
            })),
          }
        : prev,
    );
    await fetch(`/api/assessments/${id}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ actionId, score }]),
    });
    setSaving(null);
  }

  async function setAnswer(competencyId: string, answer: boolean) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            levels: prev.levels.map((lvl) => ({
              ...lvl,
              competencies: lvl.competencies.map((c) =>
                c.id === competencyId ? { ...c, conditionalAnswer: answer } : c,
              ),
            })),
          }
        : prev,
    );
    await fetch(`/api/assessments/${id}/answers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ competencyId, answer }]),
    });
  }

  // Live completion for this category, counted across all levels shown here
  // (mirrors the exclusion logic in /api/assessments/:id/categories).
  let liveTotal = 0;
  let liveScored = 0;
  for (const level of data?.levels ?? []) {
    for (const comp of level.competencies) {
      if (comp.isConditional && comp.conditionalAnswer === false) continue;
      liveTotal += comp.actions.length;
      liveScored += comp.actions.filter((a) => a.score != null).length;
    }
  }
  const isCurrentComplete = liveTotal > 0 && liveScored === liveTotal;

  const overallTotal =
    categoriesProgress?.reduce(
      (sum, c) => sum + (c.id === categoryId ? liveTotal : c.totalActions),
      0,
    ) ?? 0;
  const overallScored =
    categoriesProgress?.reduce(
      (sum, c) => sum + (c.id === categoryId ? liveScored : c.scoredActions),
      0,
    ) ?? 0;
  const allComplete = categoriesProgress != null && overallTotal > 0 && overallScored === overallTotal;

  let nextCategory: CategoryProgress | null = null;
  if (categoriesProgress && isCurrentComplete && !allComplete) {
    const n = categoriesProgress.length;
    const idx = categoriesProgress.findIndex((c) => c.id === categoryId);
    for (let step = 1; step <= n; step++) {
      const c = categoriesProgress[(idx + step) % n];
      if (c.id === categoryId) continue;
      const total = c.totalActions;
      const scored = c.scoredActions;
      if (scored < total) {
        nextCategory = c;
        break;
      }
    }
  }

  // Reset the dismissal whenever this category transitions from incomplete
  // to complete again, so the invitation reappears if relevant.
  useEffect(() => {
    if (isCurrentComplete && !wasComplete.current) {
      wasComplete.current = true;
       
      setBannerDismissed(false);
    } else if (!isCurrentComplete) {
      wasComplete.current = false;
    }
  }, [isCurrentComplete]);

  const showBanner = isCurrentComplete && !bannerDismissed && (allComplete || nextCategory);

  if (!data) {
    return <p className="p-8 text-sm text-black/50 dark:text-white/50">Loading…</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
      <div>
        <Link href={`/assessments/${id}`} className="text-sm underline">
          ← Back to assessment
        </Link>
        <h1 className="text-xl font-semibold">{data.category.name}</h1>
        <p className="text-sm text-black/50 dark:text-white/50">Score every level below.</p>
      </div>

      {showBanner && (
        <div className="flex items-center justify-between gap-3 rounded border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
          <span>
            {allComplete
              ? "All categories are scored. Ready to see your results?"
              : `This category is fully scored. Move on to "${nextCategory!.name}"?`}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() =>
                allComplete
                  ? router.push(`/assessments/${id}/dashboard`)
                  : router.push(`/assessments/${id}/categories/${nextCategory!.id}`)
              }
              className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black"
            >
              {allComplete ? "Go to dashboard" : "Next category"}
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="rounded border border-black/20 px-3 py-1 dark:border-white/20"
            >
              Stay here
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {data.levels.map((level) => (
          <div
            key={level.id}
            className="w-[85vw] max-w-sm flex-shrink-0 space-y-6 rounded border border-black/10 p-4 dark:border-white/10 sm:w-80"
          >
            <div>
              <h2 className="font-semibold">{level.name}</h2>
              <p className="mt-1 text-xs text-black/60 dark:text-white/60">{level.description}</p>
            </div>

            {level.competencies.length === 0 && (
              <p className="text-xs text-black/40 dark:text-white/40">
                No competencies defined for this category at this level.
              </p>
            )}

            {level.competencies.map((comp) => {
              const disabled = comp.isConditional && comp.conditionalAnswer === false;
              return (
                <div key={comp.id} className="space-y-3 border-t border-black/10 pt-4 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-bold">{comp.name}</h3>
                    {!disabled && (
                      <p className="mt-1 text-xs font-medium text-black/50 dark:text-white/50">
                        Competence actions:
                      </p>
                    )}
                  </div>

                  {comp.isConditional && (
                    <div className="flex items-center gap-2 text-xs">
                      <span>{comp.conditionalQuestionText}</span>
                      <button
                        onClick={() => setAnswer(comp.id, true)}
                        className={
                          "rounded px-2 py-0.5 " +
                          (comp.conditionalAnswer === true
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "border border-black/20 dark:border-white/20")
                        }
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setAnswer(comp.id, false)}
                        className={
                          "rounded px-2 py-0.5 " +
                          (comp.conditionalAnswer === false
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "border border-black/20 dark:border-white/20")
                        }
                      >
                        No
                      </button>
                    </div>
                  )}

                  {!disabled &&
                    comp.actions.map((action, actionIdx) => (
                      <div
                        key={action.id}
                        className={
                          "space-y-1" +
                          (actionIdx > 0 ? " mt-5 border-t border-black/5 pt-5 dark:border-white/5" : "")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <p className="flex-1 text-sm">{action.statement}</p>
                          <select
                            value={action.score ?? ""}
                            onChange={(e) => setScore(action.id, Number(e.target.value))}
                            className={
                              "w-16 shrink-0 rounded border px-2 py-1 text-sm text-center " +
                              (action.score != null
                                ? "border-green-500 bg-green-500/10 dark:border-green-400 dark:bg-green-400/10"
                                : "border-amber-400 bg-amber-400/10 dark:border-amber-300 dark:bg-amber-300/10")
                            }
                          >
                            <option value="" disabled>
                              –
                            </option>
                            {data.scale.points.map((p) => (
                              <option key={p.score} value={p.score}>
                                {p.score}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setInfoOpenId((cur) => (cur === action.id ? null : action.id))
                            }
                            aria-label="Show score meanings"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/20 text-xs font-medium dark:border-white/20"
                          >
                            i
                          </button>
                        </div>

                        {infoOpenId === action.id && (
                          <div className="space-y-0.5 rounded border border-black/10 bg-black/[0.02] p-2 text-xs dark:border-white/10 dark:bg-white/[0.04]">
                            {data.scale.points.map((p) => (
                              <div key={p.score} className="flex gap-2">
                                <span className="w-6 shrink-0 font-medium">{p.score}</span>
                                <span className="text-black/70 dark:text-white/70">{p.label}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {saving === action.id && (
                          <span className="text-[10px] text-black/40 dark:text-white/40">
                            Saving…
                          </span>
                        )}
                      </div>
                    ))}

                  {disabled && (
                    <p className="text-xs text-black/40 dark:text-white/40">
                      Excluded (answered &quot;No&quot; above).
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
