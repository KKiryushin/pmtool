"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CategoryProgress {
  id: string;
  name: string;
  totalActions: number;
  scoredActions: number;
}

interface AssessmentDetail {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  framework: { name: string };
  level: { name: string };
}

export default function AssessmentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [categories, setCategories] = useState<CategoryProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([
      fetch(`/api/assessments/${id}`),
      fetch(`/api/assessments/${id}/categories`),
    ]);
    if (aRes.ok) setAssessment(await aRes.json());
    if (cRes.ok) setCategories(await cRes.json());
  }, [id]);

  // Fetch-on-mount: setState happens after the awaited response inside
  // load(), not synchronously during the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const totalActions = categories?.reduce((sum, c) => sum + c.totalActions, 0) ?? 0;
  const scoredActions = categories?.reduce((sum, c) => sum + c.scoredActions, 0) ?? 0;

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/assessments/${id}/submit`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not submit.");
      return;
    }
    load();
  }

  if (!assessment || !categories) {
    return <p className="p-8 text-sm text-black/50 dark:text-white/50">Loading…</p>;
  }

  const isDraft = assessment.status === "DRAFT";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {assessment.framework.name} — {assessment.level.name}
          </h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {scoredActions} / {totalActions} actions scored
          </p>
        </div>
        <span
          className={
            "rounded px-2 py-0.5 text-xs " +
            (isDraft
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-green-500/15 text-green-600 dark:text-green-400")
          }
        >
          {isDraft ? "Draft" : "Submitted"}
        </span>
      </div>

      <Link href={`/assessments/${id}/dashboard`} className="text-sm underline">
        View dashboard →
      </Link>

      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {categories.map((c) => (
          <li key={c.id} className="py-3">
            <Link
              href={`/assessments/${id}/categories/${c.id}`}
              className="flex items-center justify-between"
            >
              <span>{c.name}</span>
              <span className="text-sm text-black/50 dark:text-white/50">
                {c.scoredActions} / {c.totalActions}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isDraft ? (
        <button
          onClick={submit}
          disabled={submitting || scoredActions === 0}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Submitting…" : "Submit assessment"}
        </button>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          This assessment has been submitted and is now read-only.
        </p>
      )}

      <button onClick={() => router.push("/assessments")} className="text-sm underline">
        ← Back to assessments
      </button>
    </div>
  );
}
