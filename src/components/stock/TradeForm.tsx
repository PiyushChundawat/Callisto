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
    <div className="mt-4 flex items-center gap-3">
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={function (event) {
          setQuantity(event.target.value);
        }}
        className="border rounded-lg px-3 py-2 w-24"
      />
      <button
        onClick={function () {
          handleTrade("buy");
        }}
        disabled={status === "submitting"}
        className="bg-green-200 rounded-lg px-4 py-2"
      >
        Buy
      </button>
      <button
        onClick={function () {
          handleTrade("sell");
        }}
        disabled={status === "submitting"}
        className="bg-red-200 rounded-lg px-4 py-2"
      >
        Sell
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}