"use client";

import { ResourceTable } from "@/components/admin/ResourceTable";

export default function UsersAdminPage() {
  return (
    <ResourceTable
      title="Users"
      resourcePath="/api/admin/users"
      description="Accounts and roles. ADMIN manages the framework content; SELF_ASSESSOR takes their own assessments; MANAGER_REVIEWER will score reports' assessments (future)."
      fields={[
        { key: "email", label: "Email", type: "text", required: true },
        { key: "name", label: "Name", type: "text", required: true },
        {
          key: "password",
          label: "Password (leave blank when editing to keep current)",
          type: "password",
          formOnly: true,
        },
        {
          key: "role",
          label: "Role",
          type: "select",
          staticOptions: [
            { value: "ADMIN", label: "Admin" },
            { value: "SELF_ASSESSOR", label: "Self-assessor" },
            { value: "MANAGER_REVIEWER", label: "Manager / Reviewer" },
          ],
          required: true,
        },
      ]}
    />
  );
}
