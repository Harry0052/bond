import Link from "next/link";
import { PrimaryNav } from "@/components/shell/primary-nav";
import type { NavItem } from "@/components/shell/nav";

export function SiteHeader({ displayName, items }: { displayName: string | null; items: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex min-h-12 items-center gap-2.5 rounded-full" aria-label="Bond home">
            <span className="bond-mark" aria-hidden>
              <span />
            </span>
            <span className="font-display text-[1.85rem] leading-none tracking-tight">Bond</span>
          </Link>
          <PrimaryNav items={items} variant="desktop" />
        </div>
        {displayName ? (
          <p className="max-w-[8rem] truncate text-sm font-semibold text-peach sm:max-w-xs">{displayName}</p>
        ) : (
          <p className="text-sm text-peach/80">Not named yet</p>
        )}
      </div>
    </header>
  );
}
