"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

const features = [
  { title: "Live prices", text: "32 US stocks pushed to your screen the moment they update." },
  { title: "Candlestick charts", text: "1D, 1W, 1M and full history, summarized in SQL." },
  { title: "Safe trading", text: "Orders never run twice. Sells need a TPIN and an OTP." },
];

export default function Hero() {
  const session = useSession();
  if (session.status !== "unauthenticated") return null;

  return (
    <section className="border-b border-[var(--line)] px-4 py-14 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <p className="muted text-xs uppercase tracking-widest">Paper trading, real prices</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
          Trade the market.
          <br />
          <span className="text-[var(--accent)]">Risk nothing.</span>
        </h1>
        <p className="muted max-w-xl text-lg">
          Callisto is a simulated trading platform with live US stock prices, $10,000 of virtual
          cash, and the safeguards of a real broker.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="helios-btn btn-anim">
            Create free account
          </Link>
          <Link href="/login" className="helios-btn-secondary btn-anim">
            Log in
          </Link>
        </div>
        <Link href="/engineering" className="text-sm underline">
          See how it is built
        </Link>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {features.map(function (feature) {
          return (
            <div key={feature.title} className="border border-[var(--line)] p-4 text-left">
              <p className="font-bold">{feature.title}</p>
              <p className="muted mt-1 text-sm">{feature.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}