"use client";
import { useLivePrices } from "@/lib/useSocket";
import { Stock } from "@/types/stock";

export default function TickerStrip({ stocks }: { stocks: Stock[] }) {
  const livePrices = useLivePrices();

  const items = stocks.map((stock) => {
    const live = livePrices[stock.symbol];
    return {
      symbol: stock.symbol,
      price: live ? live.c : stock.currentPrice,
      changePercent: live ? live.dp : stock.changePercent,
    };
  });

  return (
    <div className="ticker num overflow-hidden border-b border-[var(--line)] bg-[var(--strip)]">
      <div className="ticker-track flex w-max py-2">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-8 pr-8" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span key={item.symbol} className="flex items-baseline gap-2 whitespace-nowrap text-sm">
                <span className="font-bold">{item.symbol}</span>
                <span>{item.price.toFixed(2)}</span>
                <span className={item.changePercent >= 0 ? "gain" : "loss"}>
                  {item.changePercent >= 0 ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}