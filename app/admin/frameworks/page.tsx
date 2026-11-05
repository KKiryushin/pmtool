"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function FrameworksAdminPage() {
  return (
    <ResourceTable
      title="Frameworks"
      resourcePath="/api/admin/frameworks"
      description="A competency framework (e.g. 'Product Manager'). Each has a scale, levels, and categories."
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "scaleId",
          label: "Scale",
          type: "select",
          optionsResource: "/api/admin/scales",
          required: true,
        },
        {
          key: "rollupStrategy",
          label: "Rollup strategy",
          type: "select",
          staticOptions: [
            { value: "WEIGHTED_AVERAGE", label: "Weighted average" },
            { value: "MEDIAN_PENALIZED", label: "Median (legacy, conservative)" },
          ],
        },
      ]}
    />
  );
}
