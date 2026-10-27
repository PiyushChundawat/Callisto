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

export default function TradeDialog(props: {
  symbol: string;
  action: "buy" | "sell";
  source?: "position" | "holding";
  initialQuantity?: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "review" | "done">("loading");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [quantity, setQuantity] = useState(String(props.initialQuantity ?? 1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef<string | null>(null);

  const isBuy = props.action === "buy";
  const qty = Number(quantity);
  const qtyValid = Number.isInteger(qty) && qty >= 1 && qty <= 100000;

  const price = preview && preview.price !== null ? preview.price : null;
  const total = price !== null && qtyValid ? price * qty : null;
  const balanceAfter =
    preview && total !== null ? (isBuy ? preview.balance - total : preview.balance + total) : null;

  let maxSell = 0;
  if (preview) {
    if (props.source === "position") {
      maxSell = preview.positionQty;
    } else if (props.source === "holding") {
      maxSell = preview.ownedQty - preview.positionQty;
    } else {
      maxSell = preview.ownedQty;
    }
  }

  const insufficient = isBuy && preview !== null && total !== null && total > preview.balance;
  const tooMany = !isBuy && preview !== null && qtyValid && qty > maxSell;
  const canConfirm =
    preview !== null && price !== null && qtyValid && !insufficient && !tooMany && !submitting;

  useEffect(
    function () {
      let cancelled = false;
      fetch("/api/trade/preview?symbol=" + props.symbol)
        .then(function (response) {
          if (!response.ok) throw new Error("preview failed");
          return response.json();
        })
        .then(function (data: Preview) {
          if (cancelled) return;
          setPreview(data);
          setStep("review");
        })
        .catch(function () {
          if (cancelled) return;
          setError("Could not load order details. Please close and try again.");
          setStep("review");
        });
      return function () {
        cancelled = true;
      };
    },
    [props.symbol]
  );

  useEffect(
    function () {
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape" && !submitting) {
          props.onClose();
        }
      }
      window.addEventListener("keydown", onKey);
      return function () {
        window.removeEventListener("keydown", onKey);
      };
    },
    [submitting, props.onClose]
  );

  function changeQuantity(next: number) {
    keyRef.current = null; // a different quantity is a different order
    setError("");
    setQuantity(String(Math.max(1, next)));
  }

  async function confirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    setError("");

    // One key per order intent. Retrying in this same dialog reuses it.
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID();
    }

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: props.symbol,
          action: props.action,
          quantity: qty,
          source: props.source,
          idempotencyKey: keyRef.current,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Order failed");
        if (response.status < 500) {
          keyRef.current = null;
        }
        setSubmitting(false);
        return;
      }

      keyRef.current = null;
      setReceipt(data);
      setStep("done");
      setSubmitting(false);
      router.refresh();
    } catch (err) {
      setError("Network problem. Tap Try again. It is safe, you will not be charged twice.");
      setSubmitting(false);
    }
  }

  function requestClose() {
    if (!submitting) {
      props.onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={requestClose}
    >
      <div
        className="w-full max-w-sm border border-[var(--line)] bg-[var(--surface,#ffffff)] p-6"
        onClick={function (event) {
          event.stopPropagation();
        }}
      >
        {step === "loading" ? (
          <p className="py-8 text-center text-sm opacity-70">Loading order details...</p>
        ) : null}

        {step === "done" && receipt ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="gain flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-2xl">
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
            <button onClick={props.onClose} className="helios-btn mt-2">
              Done
            </button>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">
              {isBuy ? "Review buy order" : "Review sell order"} · {props.symbol}
            </h2>

            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="opacity-70">Quantity</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="helios-btn-secondary"
                  aria-label="Decrease quantity"
                  onClick={function () {
                    changeQuantity((qtyValid ? qty : 1) - 1);
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  aria-label="Quantity"
                  className="helios-input num w-20 text-center"
                  onChange={function (event) {
                    keyRef.current = null;
                    setError("");
                    setQuantity(event.target.value);
                  }}
                />
                <button
                  type="button"
                  className="helios-btn-secondary"
                  aria-label="Increase quantity"
                  onClick={function () {
                    changeQuantity((qtyValid ? qty : 0) + 1);
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {preview ? (
              <div className="border-t border-[var(--line)] pt-2">
                <Row label="Market price" value={price !== null ? money(price) : "Unavailable"} />
                <Row
                  label={isBuy ? "Estimated total" : "Estimated proceeds"}
                  value={total !== null ? money(total) : "-"}
                  strong
                />
                <Row label="Balance now" value={money(preview.balance)} />
                <Row label="Balance after" value={balanceAfter !== null ? money(balanceAfter) : "-"} />
                {!isBuy ? <Row label="Available to sell" value={String(maxSell)} /> : null}
              </div>
            ) : null}

            {insufficient ? <p className="loss text-sm">Not enough balance for this order.</p> : null}
            {tooMany ? (
              <p className="loss text-sm">You can sell at most {maxSell} here.</p>
            ) : null}
            {preview && price === null ? (
              <p className="loss text-sm">Price is unavailable right now.</p>
            ) : null}
            {error ? <p className="loss text-sm">{error}</p> : null}

            <p className="text-xs opacity-60">
              The final price is the market price at the moment the order is placed.
            </p>

            <div className="mt-1 flex gap-2">
              <button
                onClick={requestClose}
                disabled={submitting}
                className="helios-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={confirm} disabled={!canConfirm} className="helios-btn flex-1">
                {submitting
                  ? "Placing order..."
                  : error
                  ? "Try again"
                  : isBuy
                  ? "Confirm buy"
                  : "Confirm sell"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}