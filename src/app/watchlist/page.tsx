import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { mockStocks } from "@/lib/mockStocks";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/redis";
import StockCard from "@/components/stock/StockCard";

export default async function WatchListPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const watchlist = await prisma.watchlist.findUnique({
    where: { userId: session.user.id },
  });

  const symbols = watchlist?.stockIds ?? [];

  const watchlistStocks = await Promise.all(
    symbols.map(async function (symbol) {
      const stock = mockStocks.find(function (s) {
        return s.symbol === symbol;
      });

      if (!stock) return null;

      const livePrice = await getCurrentPrice(stock.symbol);

      return {
        stockId: stock.stockId,
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: livePrice ?? stock.currentPrice,
        change: stock.change,
        changePercent: stock.changePercent,
        lastUpdated: stock.lastUpdated,
      };
    })
  );

  const resolvedStocks = watchlistStocks.filter(function (stock) {
    return stock !== null;
  });

  return (
    <div className="tile-grid">
      {resolvedStocks.map(function (stock) {
        return <StockCard key={stock.stockId} stock={stock} />;
      })}
    </div>
  );
}