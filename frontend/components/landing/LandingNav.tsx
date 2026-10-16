import Link from "next/link";
import { Logo } from "../Logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#pillars", label: "Pillars" },
  { href: "#sample", label: "Sample result" },
  { href: "#who", label: "Who it's for" },
];

/** Full-width violet → teal bar. On load it slides up from the bottom of the screen and docks. */
export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 animate-nav-in bg-gradient-to-r from-violet to-teal [animation-delay:120ms]">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] text-white/85 transition-colors duration-300 hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/dashboard"
          className="rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-white transition-all duration-300 ease-out hover:bg-black active:scale-[0.97]"
        >
          Open dashboard
        </Link>
      </div>
    </header>
  );
}
