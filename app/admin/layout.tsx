import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/admin/frameworks", label: "Frameworks" },
  { href: "/admin/scales", label: "Scales" },
  { href: "/admin/levels", label: "Levels" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/category-level-targets", label: "Targets" },
  { href: "/admin/competencies", label: "Competencies" },
  { href: "/admin/actions", label: "Actions" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <Link href="/" className="text-sm underline">
          ← Back to app
        </Link>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-black/10 pb-3 dark:border-white/10">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
