"use client";

import { useState } from "react";
import TradeDialog from "./TradeDialog";

export default function TradeForm(props: { symbol: string }) {
  const [action, setAction] = useState<"buy" | "sell" | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={function () {
          setAction("buy");
        }}
        className="helios-btn"
      >
        Buy
      </button>
      <button
        onClick={function () {
          setAction("sell");
        }}
        className="helios-btn-secondary"
      >
        Sell
      </button>
      {action ? (
        <TradeDialog
          symbol={props.symbol}
          action={action}
          onClose={function () {
            setAction(null);
          }}
        />
      ) : null}
    </div>
  );
}