"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

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

export default function CategoryScoringPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = use(params);
  const [data, setData] = useState<CategoryPayload | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/assessments/${id}/category/${categoryId}`);
    if (res.ok) setData(await res.json());
  }, [id, categoryId]);

  // Fetch-on-mount: setState happens after the awaited response inside
  // load(), not synchronously during the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
        <p className="text-sm text-black/50 dark:text-white/50">
          Score every level below — seeing the full progression helps you calibrate.
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {data.levels.map((level) => (
          <div
            key={level.id}
            className="w-[85vw] max-w-sm flex-shrink-0 space-y-4 rounded border border-black/10 p-4 dark:border-white/10 sm:w-80"
          >
            <div>
              <h2 className="font-semibold">
                {level.name}
                {level.targetPercent != null && (
                  <span className="ml-2 text-xs font-normal text-black/50 dark:text-white/50">
                    target {level.targetPercent}%
                  </span>
                )}
              </h2>
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
                <div key={comp.id} className="space-y-2 border-t border-black/10 pt-3 dark:border-white/10">
                  <h3 className="text-sm font-medium">{comp.name}</h3>

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
                    comp.actions.map((action) => (
                      <div key={action.id} className="space-y-1">
                        <p className="text-sm">{action.statement}</p>
                        <select
                          value={action.score ?? ""}
                          onChange={(e) => setScore(action.id, Number(e.target.value))}
                          className="w-full rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
                        >
                          <option value="" disabled>
                            Not scored
                          </option>
                          {data.scale.points.map((p) => (
                            <option key={p.score} value={p.score}>
                              {p.score} — {p.label}
                            </option>
                          ))}
                        </select>
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
