import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[17px] font-medium tracking-tight text-white">QuantBack</span>
    </Link>
  );
}
