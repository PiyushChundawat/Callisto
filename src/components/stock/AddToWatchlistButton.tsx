"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToWatchlistButton(props: { symbol: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("idle");

  async function handleClick() {
    setStatus("saving");

    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: props.symbol }),
    });

    if (response.status === 401) {
      router.push("/login?callbackUrl=/stock/" + props.symbol);
      return;
    }

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("added");
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === "saving" || status === "added"}
      className="helios-btn"
    >
      {status === "added"
        ? "Added ✓"
        : status === "saving"
        ? "Adding..."
        : status === "error"
        ? "Try again"
        : "Add to Watchlist"}
    </button>
  );
}