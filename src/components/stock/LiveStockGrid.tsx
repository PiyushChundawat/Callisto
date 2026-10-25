// src/components/stock/LiveStockGrid.tsx
"use client";
import { useLivePrices } from "@/lib/useSocket";
import StockCard from "@/components/stock/StockCard";
import { Stock } from "@/types/stock";

export default function LiveStockGrid({ stocks }: { stocks: Stock[] }) {
  const livePrices = useLivePrices();

  const mergedStocks = stocks.map((stock) => {
    const live = livePrices[stock.symbol];
    if (!live) return stock; // no update received yet, keep mock data

    return {
      ...stock,
      currentPrice: live.c,
      change: live.d,
      changePercent: live.dp,
    };
  });

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {mergedStocks.map((stock) => (
        <StockCard key={stock.stockId} stock={stock} />
      ))}
    </div>
  );
}