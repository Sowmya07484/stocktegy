import { CardStack } from "@/components/landing/CardStack";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingNav } from "@/components/landing/LandingNav";
import { Pillars } from "@/components/landing/Pillars";
import { SampleResult } from "@/components/landing/SampleResult";
import { WhoFor } from "@/components/landing/WhoFor";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <div className="bg-ink">
      <LandingNav />
      <main>
        <CardStack>
          <Hero />
          <HowItWorks />
          <Pillars />
          <SampleResult />
          <WhoFor />
        </CardStack>
      </main>
      <footer className="relative z-10 bg-ink px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="eyebrow text-center">Historical simulation. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
