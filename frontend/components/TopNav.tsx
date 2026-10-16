import { HealthBadge } from "./HealthBadge";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to shadow-[0_0_20px_-4px_rgb(168_85_247/0.8)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Quant<span className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-transparent">Back</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
            Laya sentiment
          </span>
          <span className="hidden rounded-full border border-line bg-panel px-3 py-1 font-mono text-xs text-muted md:inline-flex">
            NSE · INR
          </span>
          <HealthBadge />
        </div>
      </div>
    </header>
  );
}
