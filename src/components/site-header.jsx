"use client";

import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/design-system") return null;

  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight"
          href="/"
        >
          <BrandMark />
          Bill Splitter
        </Link>
        <span className="text-muted text-sm">No account needed</span>
      </div>
    </header>
  );
}
