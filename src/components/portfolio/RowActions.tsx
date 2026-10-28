"use client";

import { useState } from "react";
import TradeDialog from "@/components/stock/TradeDialog";

export default function RowActions(props: {
  symbol: string;
  source: "position" | "holding";
  quantity: number;
}) {
  const [action, setAction] = useState<"buy" | "sell" | null>(null);

  return (
    <div className="mt-3 flex gap-2">
      <button
        className="helios-btn btn-anim btn-buy"
        onClick={function () {
          setAction("buy");
        }}
      >
        Add
      </button>
      <button
        className="helios-btn btn-anim btn-sell"
        onClick={function () {
          setAction("sell");
        }}
      >
        Exit
      </button>
      {action ? (
        <TradeDialog
          symbol={props.symbol}
          action={action}
          source={action === "sell" ? props.source : undefined}
          initialQuantity={action === "sell" ? props.quantity : 1}
          onClose={function () {
            setAction(null);
          }}
        />
      ) : null}
    </div>
  );
}