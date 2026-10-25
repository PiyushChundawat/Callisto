import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { mockStocks } from "@/lib/mockStocks";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/redis";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const userPortfolio = await prisma.userPortfolio.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  const holdings = await prisma.portfolioHolding.findMany({
    where: { userId: session.user.id },
  });

  const enrichedHoldings = await Promise.all(
    holdings.map(async function (holding) {
      const stock = mockStocks.find(function (s) {
        return s.symbol === holding.stockId;
      });

      const livePrice = await getCurrentPrice(holding.stockId);
      const currentPrice = livePrice ?? stock?.currentPrice ?? 0;

      return {
        stockId: holding.stockId,
        symbol: stock?.symbol ?? "UNKNOWN",
        name: stock?.name ?? "Unknown",
        currentPrice: currentPrice,
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        valueInvested: holding.quantity * holding.avgBuyPrice,
        valueNow: holding.quantity * currentPrice,
      };
    })
  );

  const totalInvested = enrichedHoldings.reduce(function (sum, holding) {
    return sum + holding.valueInvested;
  }, 0);

  const totalValueNow = enrichedHoldings.reduce(function (sum, holding) {
    return sum + holding.valueNow;
  }, 0);

  return (
    <div className="p-4">
      <p>Current Balance: ${userPortfolio.currentBalance}</p>
      <p>Investment: ${totalInvested}</p>
      <p>Investment Value Now: ${totalValueNow}</p>
      <h2 className="mt-4 font-semibold">Invested Stocks:</h2>
      <div className="flex flex-col gap-3 mt-2">
        {enrichedHoldings.map(function (h) {
          return (
            <div key={h.stockId} className="bg-gray-100 rounded-lg p-4 flex justify-between">
              <div>
                <p className="font-semibold">{h.symbol}</p>
                <p className="text-sm text-gray-500">{h.name}</p>
                <p>Current Price: ${h.currentPrice}</p>
              </div>
              <div className="text-right">
                <p>My Holdings: {h.quantity}</p>
                <p>Value Invested: ${h.valueInvested}</p>
                <p>Value Now: ${h.valueNow}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}