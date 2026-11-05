"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ResourceTable } from "@/components/admin/ResourceTable";

interface Scale {
  id: string;
  name: string;
  description?: string;
  points: unknown[];
}

export default function ScalesAdminPage() {
  const [scales, setScales] = useState<Scale[]>([]);

  const loadScales = useCallback(() => {
    fetch("/api/admin/scales")
      .then((r) => r.json())
      .then(setScales);
  }, []);

  useEffect(() => {
    loadScales();
  }, [loadScales]);

  return (
    <div className="space-y-6">
      <ResourceTable
        title="Scales"
        resourcePath="/api/admin/scales"
        description="A scoring scale (e.g. 0-10 proficiency), shared across frameworks. Edit a scale's points from its detail page below."
        fields={[
          { key: "name", label: "Name", type: "text", required: true },
          { key: "description", label: "Description", type: "textarea" },
        ]}
        onChange={loadScales}
      />

      <div className="space-y-1">
        <h3 className="text-sm font-medium">Edit scale points</h3>
        <ul className="list-inside list-disc text-sm">
          {scales.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/scales/${s.id}`} className="underline">
                {s.name}
              </Link>{" "}
              <span className="text-black/50 dark:text-white/50">
                ({s.points.length} points)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
