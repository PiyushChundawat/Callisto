"use client";

import { useRef, useState } from "react";

export default function TradeForm(props: { symbol: string }) {
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const keyRef = useRef<string | null>(null);

  async function handleTrade(action: string) {
    setStatus("submitting");
    setMessage("");

    // One key per order intent. A retry reuses it, so it cannot double-charge.
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID();
    }

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: props.symbol,
          action: action,
          quantity: Number(quantity),
          idempotencyKey: keyRef.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Trade failed");
        if (response.status < 500) {
          keyRef.current = null; // a definite answer: the next click is a new order
        }
        return;
      }

      keyRef.current = null;
      setStatus("done");
      setMessage(action === "buy" ? "Bought successfully" : "Sold successfully");
    } catch (err) {
      // Network failure: keep the key so pressing again is a safe retry.
      setStatus("error");
      setMessage("Network problem. Press the button again to retry safely.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={function (event) {
            keyRef.current = null;
            setQuantity(event.target.value);
          }}
          aria-label="Quantity"
          className="helios-input num w-24"
        />
        <button
          onClick={function () {
            handleTrade("buy");
          }}
          disabled={status === "submitting"}
          className="helios-btn"
        >
          Buy
        </button>
        <button
          onClick={function () {
            handleTrade("sell");
          }}
          disabled={status === "submitting"}
          className="helios-btn-secondary"
        >
          Sell
        </button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}