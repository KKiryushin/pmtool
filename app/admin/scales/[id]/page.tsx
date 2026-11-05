"use client";

import { use } from "react";
import { ResourceTable } from "@/components/admin/ResourceTable";

export default function ScalePointsAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ResourceTable
      title="Scale points"
      resourcePath={`/api/admin/scales/${id}/points`}
      itemResourcePath="/api/admin/scale-points"
      description="The raw score -> % mapping for this scale. Score is the raw value an assessor picks (e.g. 0-10); percent is what it rolls up to."
      fields={[
        { key: "score", label: "Score", type: "number", required: true },
        { key: "label", label: "Label", type: "text", required: true },
        { key: "percent", label: "Percent", type: "number", required: true },
        { key: "sortOrder", label: "Sort order", type: "number" },
      ]}
    />
  );
}
