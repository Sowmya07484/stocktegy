import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "Dashboard · QuantBack" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ ticker?: string | string[] }> }) {
  const { ticker } = await searchParams;
  // ?ticker=TCS.NS from the landing page's "Try it on" strip
  const initialTicker = typeof ticker === "string" && /^[A-Za-z0-9.\-^&]{1,20}$/.test(ticker) ? ticker.toUpperCase() : undefined;
  return <Dashboard initialTicker={initialTicker} />;
}
