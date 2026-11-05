"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function ActionsAdminPage() {
  return (
    <ResourceTable
      title="Actions"
      resourcePath="/api/admin/actions"
      description="A single behavioral statement an assessor scores (e.g. 'I create user personas.'). Weight controls its influence on the competency's weighted-average rollup."
      fields={[
        {
          key: "competencyId",
          label: "Competency",
          type: "select",
          optionsResource: "/api/admin/competencies",
          required: true,
        },
        { key: "statement", label: "Statement", type: "textarea", required: true },
        { key: "weight", label: "Weight", type: "number" },
        { key: "sortOrder", label: "Sort order", type: "number" },
      ]}
    />
  );
}
