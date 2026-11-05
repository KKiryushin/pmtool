"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Level {
  id: string;
  name: string;
  shortName: string;
}

interface Framework {
  id: string;
  name: string;
  levels: Level[];
}

export default function NewAssessmentPage() {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<Framework[] | null>(null);
  const [frameworkId, setFrameworkId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/frameworks")
      .then((r) => r.json())
      .then((data: Framework[]) => {
        setFrameworks(data);
        if (data.length === 1) setFrameworkId(data[0].id);
      });
  }, []);

  const selectedFramework = frameworks?.find((f) => f.id === frameworkId);

  async function create() {
    setError(null);
    if (!frameworkId || !levelId) {
      setError("Pick a framework and level.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworkId, levelId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Could not create assessment.");
      return;
    }
    const assessment = await res.json();
    router.push(`/assessments/${assessment.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="text-xl font-semibold">New self-assessment</h1>

      {frameworks === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : frameworks.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No frameworks configured yet. Ask an admin to set one up.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium">Framework</label>
            <select
              value={frameworkId}
              onChange={(e) => {
                setFrameworkId(e.target.value);
                setLevelId("");
              }}
              className="w-full rounded border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            >
              <option value="">—</option>
              {frameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Target level</label>
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              disabled={!selectedFramework}
              className="w-full rounded border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            >
              <option value="">—</option>
              {selectedFramework?.levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-black/50 dark:text-white/50">
              You&apos;ll see and score every level side by side while assessing — this just
              sets the default target comparison on your dashboard.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={create}
            disabled={submitting}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Creating…" : "Start assessment"}
          </button>
        </>
      )}
    </div>
  );
}
