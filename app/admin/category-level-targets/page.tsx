"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function CategoryLevelTargetsAdminPage() {
  return (
    <ResourceTable
      title="Category / Level targets"
      resourcePath="/api/admin/category-level-targets"
      description="The flat target % for a (Category, Level) pair, shown on the dashboard. Leave a pair unset if that category doesn't apply at that level."
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
        { key: "targetPercent", label: "Target %", type: "number", required: true },
      ]}
    />
  );
}
