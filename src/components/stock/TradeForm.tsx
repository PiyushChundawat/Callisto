"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Preview = {
  price: number | null;
  balance: number;
  ownedQty: number;
  positionQty: number;
};

type Receipt = {
  orderId: string;
  action: string;
  symbol: string;
  quantity: number;
  price: number;
  total: number;
  balanceAfter: number;
  createdAt: string;
};

type Step = "idle" | "loading" | "review" | "submitting" | "done" | "error";

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Row(props: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="opacity-70">{props.label}</span>
      <span className={"num " + (props.strong ? "font-bold" : "")}>{props.value}</span>
    </div>
  );
}

export default function TradeForm(props: { symbol: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const keyRef = useRef<string | null>(null);

  const qty = Number(quantity);
  const qtyValid = Number.isInteger(qty) && qty >= 1 && qty <= 100000;
  const isBuy = action === "buy";

  const price = preview && preview.price !== null ? preview.price : null;
  const total = price !== null && qtyValid ? price * qty : null;
  const balanceAfter =
    preview && total !== null ? (isBuy ? preview.balance - total : preview.balance + total) : null;
  const insufficient = isBuy && preview !== null && total !== null && total > preview.balance;
  const notEnoughShares = !isBuy && preview !== null && qty > preview.ownedQty;
  const canConfirm = step === "review" && price !== null && !insufficient && !notEnoughShares;

  const modalOpen = step !== "idle";

  useEffect(
    function () {
      if (!modalOpen) return;
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape" && step !== "submitting") {
          close();
        }
      }
      window.addEventListener("keydown", onKey);
      return function () {
        window.removeEventListener("keydown", onKey);
      };
    },
    [modalOpen, step]
  );

  function stepQuantity(delta: number) {
    const next = Math.max(1, (qtyValid ? qty : 1) + delta);
    setQuantity(String(next));
  }

  async function openReview(nextAction: "buy" | "sell") {
    if (!qtyValid) {
      setError("Enter a whole number of shares (1 or more)");
      return;
    }
    keyRef.current = null;
    setAction(nextAction);
    setError("");
    setReceipt(null);
    setStep("loading");

    try {
      const response = await fetch("/api/trade/preview?symbol=" + props.symbol);
      if (!response.ok) {
        throw new Error("preview failed");
      }
      const data = await response.json();
      setPreview(data);
      setStep("review");
    } catch (err) {
      setError("Could not load order details. Please try again.");
      setStep("idle");
    }
  }

  async function confirm() {
    if (step === "submitting") return;
    setStep("submitting");
    setError("");

    // One key per order intent. A retry in this same dialog reuses it.
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
          quantity: qty,
          idempotencyKey: keyRef.current,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Order failed");
        if (response.status < 500) {
          keyRef.current = null;
        }
        setStep("error");
        return;
      }

      keyRef.current = null;
      setReceipt(data);
      setStep("done");
      router.refresh();
    } catch (err) {
      setError("Network problem. Tap Retry. It is safe, you will not be charged twice.");
      setStep("error");
    }
  }

  function close() {
    if (step === "submitting") return;
    setStep("idle");
    setPreview(null);
    setReceipt(null);
    setError("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={function () {
            stepQuantity(-1);
          }}
          className="helios-btn-secondary"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={function (event) {
            setQuantity(event.target.value);
            setError("");
          }}
          aria-label="Quantity"
          className="helios-input num w-20 text-center"
        />
        <button
          type="button"
          onClick={function () {
            stepQuantity(1);
          }}
          className="helios-btn-secondary"
          aria-label="Increase quantity"
        >
          +
        </button>
        <button
          onClick={function () {
            openReview("buy");
          }}
          disabled={step === "loading"}
          className="helios-btn"
        >
          Buy
        </button>
        <button
          onClick={function () {
            openReview("sell");
          }}
          disabled={step === "loading"}
          className="helios-btn-secondary"
        >
          Sell
        </button>
      </div>
      {step === "idle" && error ? <p className="text-sm loss">{error}</p> : null}

      {modalOpen && step !== "loading" ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm border border-[var(--line)] bg-[var(--surface,#ffffff)] p-6"
            onClick={function (event) {
              event.stopPropagation();
            }}
          >
            {step === "done" && receipt ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center gap-2 pb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-2xl gain">
                    ✓
                  </div>
                  <h2 className="text-lg font-bold">Order placed</h2>
                  <p className="text-sm opacity-70">
                    {receipt.action === "buy" ? "Bought" : "Sold"} {receipt.quantity} × {receipt.symbol}
                  </p>
                </div>
                <div className="border-t border-[var(--line)] pt-2">
                  <Row label="Order ID" value={receipt.orderId.slice(-8).toUpperCase()} />
                  <Row label="Executed price" value={money(receipt.price)} />
                  <Row
                    label={receipt.action === "buy" ? "Total paid" : "Total received"}
                    value={money(receipt.total)}
                    strong
                  />
                  <Row label="Balance now" value={money(receipt.balanceAfter)} />
                  <Row label="Time" value={new Date(receipt.createdAt).toLocaleString()} />
                </div>
                <button onClick={close} className="helios-btn mt-2">
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-bold">
                  {isBuy ? "Review buy order" : "Review sell order"}
                </h2>
                <p className="text-sm opacity-70">
                  {qty} × {props.symbol}
                </p>

                {preview ? (
                  <div className="border-t border-[var(--line)] pt-2">
                    <Row label="Market price" value={price !== null ? money(price) : "Unavailable"} />
                    <Row label="Quantity" value={String(qty)} />
                    <Row
                      label={isBuy ? "Estimated total" : "Estimated proceeds"}
                      value={total !== null ? money(total) : "-"}
                      strong
                    />
                    <Row label="Balance now" value={money(preview.balance)} />
                    <Row
                      label="Balance after"
                      value={balanceAfter !== null ? money(balanceAfter) : "-"}
                    />
                    {!isBuy ? (
                      <Row label="Shares you own" value={String(preview.ownedQty)} />
                    ) : null}
                  </div>
                ) : null}

                {insufficient ? (
                  <p className="text-sm loss">Not enough balance for this order.</p>
                ) : null}
                {notEnoughShares ? (
                  <p className="text-sm loss">You do not own that many shares.</p>
                ) : null}
                {price === null && preview ? (
                  <p className="text-sm loss">Price is unavailable right now.</p>
                ) : null}
                {error ? <p className="text-sm loss">{error}</p> : null}

                <p className="text-xs opacity-60">
                  The final price is the market price at the moment the order is placed.
                </p>

                <div className="mt-1 flex gap-2">
                  <button
                    onClick={close}
                    disabled={step === "submitting"}
                    className="helios-btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirm}
                    disabled={step === "submitting" || (step !== "error" && !canConfirm)}
                    className="helios-btn flex-1"
                  >
                    {step === "submitting"
                      ? "Placing order..."
                      : step === "error"
                      ? "Try again"
                      : isBuy
                      ? "Confirm buy"
                      : "Confirm sell"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}