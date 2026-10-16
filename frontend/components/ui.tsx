// Shared visual primitives so every card/label looks identical.

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-[#121222]/80 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.04)] backdrop-blur-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-[0_16px_48px_-12px_rgb(0_0_0/0.7),0_0_30px_rgba(99,102,241,0.1)] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line bg-base/60 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-300 ease-in-out active:scale-95 ${
              active
                ? "bg-gradient-to-r from-brand-from to-brand-to text-white shadow-[0_0_16px_-4px_rgb(168_85_247/0.7)]"
                : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Replays a fade-in-up whenever `animKey` changes (e.g. a new backtest result). */
export function FadeIn({
  animKey,
  delayMs = 0,
  className = "",
  children,
}: {
  animKey?: string | number;
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div key={animKey} className={`animate-fade-in ${className}`} style={{ animationDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-40 items-center justify-center p-8 text-center text-sm text-muted">{children}</div>;
}

const THUMB_PX = 16;

/** Native range input (keyboard + a11y intact) over a custom track with a glowing fill. */
export function Slider({
  id,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
}: {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const ratio = (value - min) / (max - min);
  // the native thumb centre travels from THUMB_PX/2 to width - THUMB_PX/2, so match the fill to it
  const fillWidth = `calc(${ratio * 100}% + ${(0.5 - ratio) * THUMB_PX}px)`;
  return (
    <div className={`group/slider relative flex h-6 items-center ${disabled ? "opacity-50" : ""}`}>
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/[0.08] shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]" />
      <div
        className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)] transition-shadow duration-300 group-hover/slider:shadow-[0_0_16px_rgba(139,92,246,0.85)] group-active/slider:shadow-[0_0_22px_rgba(139,92,246,1)]"
        style={{ width: fillWidth }}
      />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        disabled={disabled}
        className="slider relative w-full"
      />
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-white/25 border-t-white ${className}`} />;
}
