import Link from "next/link";
import { Stock } from "@/types/stock";
import Sparkline from "@/components/stock/Sparkline";

export default function StockCard({ stock, sparkData }: { stock: Stock; sparkData?: number[] }) {
  const isPositive = stock.changePercent >= 0;

  return (
    <Link href={`/stock/${stock.symbol}`} className="block">
      <div className="tile">
        <div>
          <p className="font-bold">{stock.symbol}</p>
          <p className="muted text-sm">{stock.name}</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <Sparkline data={sparkData} positive={isPositive} seed={stock.symbol} />
          <div className="num text-right">
            <p>${stock.currentPrice.toFixed(2)}</p>
            <p className={`text-sm ${isPositive ? "gain" : "loss"}`}>
              {isPositive ? "+" : ""}
              {stock.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}