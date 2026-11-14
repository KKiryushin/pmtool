"use client";

import { useCallback, useEffect, useState } from "react";

export type FieldType = "text" | "password" | "textarea" | "number" | "boolean" | "select";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  /** For type "select": API path to fetch options from, e.g. "/api/admin/frameworks" */
  optionsResource?: string;
  /** Which property of each option to show as its label (defaults to "name") */
  optionLabelKey?: string;
  /** For type "select" with a fixed enum instead of a fetched relation */
  staticOptions?: { value: string; label: string }[];
  required?: boolean;
  /** Only show this field in the create/edit form, not as a table column */
  formOnly?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

interface ResourceTableProps {
  title: string;
  /** API path for list (GET) and create (POST) */
  resourcePath: string;
  /** API path prefix for edit (PATCH) / delete (DELETE); defaults to resourcePath. Use this when list/create is a nested route (e.g. /api/admin/scales/:id/points) but item mutation is a flat one (e.g. /api/admin/scale-points). */
  itemResourcePath?: string;
  fields: FieldConfig[];
  description?: string;
  /** Called after any successful create/update/delete, e.g. to refresh related lists elsewhere on the page. */
  onChange?: () => void;
}

export function ResourceTable({
  title,
  resourcePath,
  itemResourcePath,
  fields,
  description,
  onChange,
}: ResourceTableProps) {
  const itemBase = itemResourcePath ?? resourcePath;
  const [rows, setRows] = useState<Row[]>([]);
  const [optionSets, setOptionSets] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Row>({});
  const [creating, setCreating] = useState(false);
  const [deletingRow, setDeletingRow] = useState<Row | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(resourcePath);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [resourcePath]);

  // Fetch-on-mount: setState happens after the awaited response inside
  // load(), not synchronously during the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    const resources = Array.from(
      new Set(fields.filter((f) => f.optionsResource).map((f) => f.optionsResource!)),
    );
    resources.forEach(async (resource) => {
      const res = await fetch(resource);
      if (res.ok) {
        const data = await res.json();
        setOptionSets((prev) => ({ ...prev, [resource]: data }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    const initial: Row = {};
    fields.forEach((f) => {
      if (f.type === "boolean") initial[f.key] = false;
    });
    setForm(initial);
    setCreating(true);
    setEditingId(null);
  }

  function startEdit(row: Row) {
    setForm({ ...row });
    setEditingId(row.id);
    setCreating(false);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setForm({});
  }

  function coerceValue(field: FieldConfig, raw: string | boolean) {
    if (field.type === "number") return raw === "" ? undefined : Number(raw);
    if (field.type === "boolean") return Boolean(raw);
    return raw === "" ? undefined : raw;
  }

  async function submitForm() {
    setError(null);
    const payload: Row = {};
    for (const f of fields) {
      if (form[f.key] !== undefined) payload[f.key] = form[f.key];
    }

    const isEdit = editingId !== null;
    const url = isEdit ? `${itemBase}/${editingId}` : resourcePath;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
      return;
    }

    cancelForm();
    load();
    onChange?.();
  }

  function askDelete(row: Row) {
    setDeleteError(null);
    setDeletingRow(row);
  }

  function cancelDelete() {
    setDeletingRow(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deletingRow) return;
    setDeleteError(null);
    const res = await fetch(`${itemBase}/${deletingRow.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteError(body.error ? JSON.stringify(body.error) : `Delete failed (${res.status})`);
      return;
    }
    setDeletingRow(null);
    load();
    onChange?.();
  }

  function optionLabel(field: FieldConfig, option: Row) {
    return option[field.optionLabelKey ?? "name"] ?? option.id;
  }

  const columns = fields.filter((f) => !f.formOnly);

  function renderFieldInput(field: FieldConfig) {
    const value = form[field.key] ?? "";

    if (field.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={Boolean(form[field.key])}
          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))}
        />
      );
    }

    if (field.type === "select") {
      if (field.staticOptions) {
        return (
          <select
            value={value}
            onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="w-full rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
          >
            <option value="">—</option>
            {field.staticOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
      const options = optionSets[field.optionsResource ?? ""] ?? [];
      return (
        <select
          value={value}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, [field.key]: coerceValue(field, e.target.value) }))
          }
          className="w-full rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {optionLabel(field, opt)}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
          rows={2}
          className="w-full rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
        />
      );
    }

    return (
      <input
        type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
        value={value}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, [field.key]: coerceValue(field, e.target.value) }))
        }
        className="w-full rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
      />
    );
  }

  function renderCellValue(field: FieldConfig, row: Row) {
    const value = row[field.key];
    if (field.type === "boolean") return value ? "Yes" : "No";
    if (field.type === "select") {
      if (field.staticOptions) {
        return field.staticOptions.find((o) => o.value === value)?.label ?? value;
      }
      const options = optionSets[field.optionsResource ?? ""] ?? [];
      const match = options.find((o) => o.id === value);
      return match ? optionLabel(field, match) : value;
    }
    if (typeof value === "string" && value.length > 60) return value.slice(0, 60) + "…";
    return value ?? "";
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-black/50 dark:text-white/50">{description}</p>
          )}
        </div>
        <button
          onClick={startCreate}
          className="rounded bg-black px-3 py-1.5 text-xs text-white dark:bg-white dark:text-black"
        >
          + Add
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(creating || editingId) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={cancelForm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-sm space-y-2 overflow-y-auto rounded-lg border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900"
          >
            <h3 className="text-sm font-semibold">{editingId ? `Edit ${title}` : `Add ${title}`}</h3>
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium">{f.label}</label>
                {renderFieldInput(f)}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                onClick={submitForm}
                className="rounded bg-black px-3 py-1.5 text-xs text-white dark:bg-white dark:text-black"
              >
                Save
              </button>
              <button
                onClick={cancelForm}
                className="rounded border border-black/15 px-3 py-1.5 text-xs dark:border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={cancelDelete}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-3 rounded-lg border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900"
          >
            <h3 className="text-sm font-semibold">Delete this item?</h3>
            <p className="text-sm text-black/70 dark:text-white/70">
              This will permanently delete{" "}
              <span className="font-medium">
                {deletingRow.name ?? deletingRow.statement ?? deletingRow.email ?? deletingRow.id}
              </span>
              . This cannot be undone.
            </p>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmDelete}
                className="rounded bg-red-600 px-3 py-1.5 text-xs text-white"
              >
                Delete
              </button>
              <button
                onClick={cancelDelete}
                className="rounded border border-black/15 px-3 py-1.5 text-xs dark:border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">No items yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                {columns.map((f) => (
                  <th key={f.key} className="py-1.5 pr-3 font-medium">
                    {f.label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                  {columns.map((f) => (
                    <td key={f.key} className="py-1.5 pr-3 align-top">
                      {renderCellValue(f, row)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-1.5 text-right">
                    <button onClick={() => startEdit(row)} className="mr-2 text-xs underline">
                      Edit
                    </button>
                    <button
                      onClick={() => askDelete(row)}
                      className="text-xs text-red-600 underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
