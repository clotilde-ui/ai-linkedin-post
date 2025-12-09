"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function NavTabs() {
  const pathname = usePathname();
  const isSettings = useMemo(() => pathname === "/settings", [pathname]);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-black">
          AI LinkedIn Toolkit
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm font-medium">
          <Link
            href="/settings"
            className={`rounded-full px-4 py-2 transition ${
              isSettings ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
