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
  const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="px-4 py-6">
      <div className="grid gap-6 border-b border-[var(--line)] pb-6 sm:grid-cols-3">
        <div>
          <p className="muted text-sm">Current Balance</p>
          <p className="num text-3xl font-bold sm:text-4xl">${fmt(Number(userPortfolio.currentBalance))}</p>
        </div>
        <div>
          <p className="muted text-sm">Total Invested</p>
          <p className="num text-3xl font-bold sm:text-4xl">${fmt(totalInvested)}</p>
        </div>
        <div>
          <p className="muted text-sm">Current Value</p>
          <p className="num text-3xl font-bold sm:text-4xl">${fmt(totalValueNow)}</p>
        </div>
      </div>
  
      <h2 className="mb-4 mt-8 text-xl font-bold">Holdings</h2>
      <div className="tile-grid !p-0">
        {enrichedHoldings.map(function (h) {
          const pnl = h.valueNow - h.valueInvested;
          const isGain = pnl >= 0;
          return (
            <div key={h.stockId} className="tile">
              <div>
                <p className="font-bold">{h.symbol}</p>
                <p className="muted text-sm">{h.name}</p>
              </div>
              <div className="num mt-4 text-sm">
                <p className="muted">Qty {h.quantity} @ ${fmt(h.avgBuyPrice)}</p>
                <p>${fmt(h.valueNow)}</p>
                <p className={isGain ? "gain" : "loss"}>
                  {isGain ? "+" : "-"}${fmt(Math.abs(pnl))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}