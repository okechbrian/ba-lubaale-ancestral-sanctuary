"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Requests" },
  { href: "/admin/dates", label: "Blocked dates" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/emails", label: "Emails" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-mist bg-dusk px-4 py-3 sm:px-6">
      <span className="mr-4 font-display text-lg font-semibold text-cream">
        Ba Lubaale admin
      </span>
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded px-3 py-1.5 text-sm ${
              active
                ? "bg-cream font-semibold text-ink"
                : "text-cream/70 hover:bg-cream/10 hover:text-cream"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="ml-auto rounded px-3 py-1.5 text-sm text-cream/70 hover:bg-cream/10 hover:text-cream"
      >
        Sign out
      </button>
    </nav>
  );
}
