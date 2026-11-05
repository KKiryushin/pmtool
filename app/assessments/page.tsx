"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AssessmentRow {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  createdAt: string;
  submittedAt: string | null;
  framework: { name: string };
  level: { name: string };
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentRow[] | null>(null);

  useEffect(() => {
    fetch("/api/assessments")
      .then((r) => r.json())
      .then(setAssessments);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your assessments</h1>
        <Link
          href="/assessments/new"
          className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        >
          + New assessment
        </Link>
      </div>

      {assessments === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : assessments.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No assessments yet. Start a new self-assessment above.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {assessments.map((a) => (
            <li key={a.id} className="py-3">
              <Link href={`/assessments/${a.id}`} className="flex items-center justify-between">
                <span>
                  {a.framework.name} — {a.level.name}
                </span>
                <span
                  className={
                    "rounded px-2 py-0.5 text-xs " +
                    (a.status === "DRAFT"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-green-500/15 text-green-600 dark:text-green-400")
                  }
                >
                  {a.status === "DRAFT" ? "Draft" : "Submitted"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/" className="text-sm underline">
        ← Back to app
      </Link>
    </div>
  );
}
