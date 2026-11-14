"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface LevelPercentResult {
  sortOrder: number;
  isTarget: boolean;
  percent: number | null;
}

interface CategoryResult {
  id: string;
  name: string;
  currentPercent: number | null;
  targetPercent: number | null;
  levelPercents: LevelPercentResult[];
}

interface LevelInfo {
  sortOrder: number;
  name: string;
  shortName: string;
  isTarget: boolean;
}

interface RollupResult {
  categories: CategoryResult[];
  overallPercent: number | null;
  levels: LevelInfo[];
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rollup, setRollup] = useState<RollupResult | null>(null);

  const load = useCallback(() => {
    fetch(`/api/assessments/${id}/rollup`)
      .then((r) => r.json())
      .then(setRollup);
  }, [id]);

  // Fetch-on-mount: setState happens after the awaited response inside
  // load(), not synchronously during the effect body.
  useEffect(() => {
    load();
  }, [load]);

  if (!rollup) {
    return <p className="p-8 text-sm text-black/50 dark:text-white/50">Loading…</p>;
  }

  const chartData = rollup.categories.map((c) => ({
    category: c.name,
    Current: c.currentPercent != null ? Math.round(c.currentPercent) : 0,
    Target: c.targetPercent != null ? Math.round(c.targetPercent) : 0,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div>
        <Link href={`/assessments/${id}`} className="text-sm underline">
          ← Back to assessment
        </Link>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {rollup.overallPercent != null && (
          <p className="text-sm text-black/50 dark:text-white/50">
            Overall: {Math.round(rollup.overallPercent)}%
          </p>
        )}
      </div>

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Target"
              dataKey="Target"
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={2}
              fill="#f59e0b"
              fillOpacity={0.08}
            />
            <Radar
              name="Current"
              dataKey="Current"
              stroke="#2563eb"
              strokeWidth={2}
              fill="#2563eb"
              fillOpacity={0.35}
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10">
            <th className="py-1.5 pr-3 font-medium">Category</th>
            {rollup.levels.map((lvl) => (
              <th
                key={lvl.sortOrder}
                className={`py-1.5 pr-3 font-medium ${lvl.isTarget ? "" : "text-black/50 dark:text-white/50"}`}
                title={lvl.name}
              >
                {lvl.shortName}
              </th>
            ))}
            <th className="py-1.5 pr-3 font-medium">Current</th>
            <th className="py-1.5 pr-3 font-medium">Target</th>
          </tr>
        </thead>
        <tbody>
          {rollup.categories.map((c) => {
            const percentByLevel = new Map(
              c.levelPercents.map((lp) => [lp.sortOrder, lp.percent]),
            );
            return (
              <tr key={c.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1.5 pr-3">{c.name}</td>
                {rollup.levels.map((lvl) => {
                  const percent = percentByLevel.get(lvl.sortOrder);
                  return (
                    <td
                      key={lvl.sortOrder}
                      className={`py-1.5 pr-3 ${lvl.isTarget ? "" : "text-black/50 dark:text-white/50"}`}
                    >
                      {percent != null ? `${Math.round(percent)}%` : "—"}
                    </td>
                  );
                })}
                <td className="py-1.5 pr-3 font-medium">
                  {c.currentPercent != null ? `${Math.round(c.currentPercent)}%` : "—"}
                </td>
                <td className="py-1.5 pr-3">
                  {c.targetPercent != null ? `${Math.round(c.targetPercent)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
