import { LetterReveal } from "../motion/LetterReveal";
import { Reveal } from "../motion/Reveal";
import { Scramble } from "../motion/Scramble";

/** Small white ring that sits on the edge of an image card like a connection point. */
export function RingNode({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`absolute h-2.5 w-2.5 rounded-full border-2 border-white bg-transparent ${className}`} />;
}

/** Eyebrow (0s) → heading scramble (0.05s) → subtext letter reveal (0.25s), centred. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  sub,
  wavy = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  wavy?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Reveal y={12}>
        <p className="eyebrow">{eyebrow}</p>
      </Reveal>
      <h2 id={id} className="display mt-4 text-4xl text-white sm:text-5xl">
        <Scramble text={title} delay={50} duration={560} wavy={wavy} />
      </h2>
      {sub && (
        <p className="mx-auto mt-5 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          <LetterReveal text={sub} delay={250} spread={650} />
        </p>
      )}
    </div>
  );
}
