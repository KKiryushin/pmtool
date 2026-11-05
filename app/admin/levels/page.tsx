"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function LevelsAdminPage() {
  return (
    <ResourceTable
      title="Levels"
      resourcePath="/api/admin/levels"
      description="A seniority level within a framework (e.g. Junior/Middle/Senior). Competencies and actions are authored per level."
      fields={[
        {
          key: "frameworkId",
          label: "Framework",
          type: "select",
          optionsResource: "/api/admin/frameworks",
          required: true,
        },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "shortName", label: "Short name", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "sortOrder", label: "Sort order", type: "number" },
      ]}
    />
  );
}
