"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function CompetenciesAdminPage() {
  return (
    <ResourceTable
      title="Competencies"
      resourcePath="/api/admin/competencies"
      description="A competency is a (Category, Level) pair's specific content — e.g. 'Product Research Support' at Junior vs 'Product Research Management' at Middle, for the same category."
      fields={[
        {
          key: "categoryId",
          label: "Category",
          type: "select",
          optionsResource: "/api/admin/categories",
          required: true,
        },
        {
          key: "levelId",
          label: "Level",
          type: "select",
          optionsResource: "/api/admin/levels",
          required: true,
        },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "isConditional", label: "Conditional?", type: "boolean" },
        {
          key: "conditionalQuestionText",
          label: "Conditional question",
          type: "text",
        },
        { key: "sortOrder", label: "Sort order", type: "number" },
      ]}
    />
  );
}
