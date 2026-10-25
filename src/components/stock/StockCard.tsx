// src/components/stock/StockCard.tsx
import Link from "next/link";
import { Stock } from "@/types/stock";

export default function StockCard({ stock }: { stock: Stock }) {
  const isPositive = stock.changePercent >= 0;

  return (
    <Link href={`/stock/${stock.symbol}`}>
      <div className="border rounded-lg p-4 bg-gray-100 hover:bg-gray-200 transition-colors">
        <p className="font-semibold">{stock.symbol}</p>
        <p className="text-sm text-gray-500">{stock.name}</p>
        <p className="mt-2">${stock.currentPrice}</p>
        <p className={isPositive ? "text-green-600" : "text-red-600"}>
          {isPositive ? "+" : ""}
          {stock.changePercent.toFixed(2)}%
        </p>
      </div>
    </Link>
  );
}