"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Requests" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/dates", label: "Blocked dates" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/vouchers", label: "Vouchers" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/inquiries", label: "Enquiries" },
  { href: "/admin/fire-circle", label: "Fire circle" },
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
            // Prefetching an admin tab while signed out makes middleware
            // redirect that RSC request to /admin/login, and the cached
            // redirect is what a post-login router.push() would serve instead
            // of the real page. Admin is low-traffic and owner-only, so
            // prefetching buys nothing here.
            prefetch={false}
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
