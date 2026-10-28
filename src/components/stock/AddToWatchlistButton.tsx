"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToWatchlistButton(props: { symbol: string; initialAdded: boolean }) {
  const router = useRouter();
  const [added, setAdded] = useState(props.initialAdded);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (busy) return;
    const wasAdded = added;
    setBusy(true);
    setError("");
    setAdded(!wasAdded); // update the button immediately; undone below if the server says no

    try {
      const response = await fetch("/api/watchlist", {
        method: wasAdded ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: props.symbol }),
      });

      if (response.status === 401) {
        setAdded(wasAdded);
        router.push("/login?callbackUrl=/stock/" + props.symbol);
        return;
      }

      if (!response.ok) {
        setAdded(wasAdded);
        setError("Could not update. Please try again.");
      } else {
        router.refresh();
      }
    } catch (err) {
      setAdded(wasAdded);
      setError("Network problem. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={busy}
        className={added ? "helios-btn-secondary" : "helios-btn"}
      >
        {busy
          ? added
            ? "Adding..."
            : "Removing..."
          : added
          ? "✓ In Watchlist · Remove"
          : "Add to Watchlist"}
      </button>
      {error ? <p className="loss text-sm">{error}</p> : null}
    </div>
  );
}