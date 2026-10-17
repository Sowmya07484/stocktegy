import Link from "next/link";
import { HealthBadge } from "./HealthBadge";
import { Logo } from "./Logo";

/** Dashboard bar: same violet → teal gradient as the landing nav. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-violet to-teal">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-6 sm:flex">
            <Link href="/" className="text-[13px] text-white/80 transition-colors duration-300 hover:text-white">
              Overview
            </Link>
            <Link href="/dashboard" aria-current="page" className="text-[13px] text-white">
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-black/25 px-3 py-1 text-xs text-white/85 ring-1 ring-white/15 md:inline-flex">NSE · INR</span>
          <HealthBadge />
        </div>
      </div>
    </header>
  );
}
