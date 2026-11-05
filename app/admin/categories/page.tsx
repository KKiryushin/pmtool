"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function CategoriesAdminPage() {
  return (
    <ResourceTable
      title="Categories"
      resourcePath="/api/admin/categories"
      description="A top-level competency area within a framework (e.g. 'Product Research')."
      fields={[
        {
          key: "frameworkId",
          label: "Framework",
          type: "select",
          optionsResource: "/api/admin/frameworks",
          required: true,
        },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "sortOrder", label: "Sort order", type: "number" },
      ]}
    />
  );
}
