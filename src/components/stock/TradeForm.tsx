"use client";

import { useState } from "react";

export default function TradeForm(props: { symbol: string }) {
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleTrade(action: string) {
    setStatus("submitting");
    setMessage("");

    const idempotencyKey = crypto.randomUUID();

    const response = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: props.symbol,
        action: action,
        quantity: Number(quantity),
        idempotencyKey: idempotencyKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(data.error ?? "Trade failed");
      return;
    }

    setStatus("done");
    setMessage(action === "buy" ? "Bought successfully" : "Sold successfully");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={function (event) {
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