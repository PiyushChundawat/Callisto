import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { mockStocks } from "@/lib/mockStocks";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/redis";
import { getTradeDate } from "@/lib/tradeDate";
import RowActions from "@/components/portfolio/RowActions";

export const dynamic = "force-dynamic";

type Enriched = {
  stockId: string;
  symbol: string;
  name: string;
  currentPrice: number;
  quantity: number;
  avgBuyPrice: number;
  positionQty: number;
  holdingQty: number;
};

type Line = {
  stockId: string;
  symbol: string;
  name: string;
  qty: number;
  avgBuyPrice: number;
  invested: number;
  valueNow: number;
};

function toLine(h: Enriched, qty: number): Line {
  return {
    stockId: h.stockId,
    symbol: h.symbol,
    name: h.name,
    qty: qty,
    avgBuyPrice: h.avgBuyPrice,
    invested: qty * h.avgBuyPrice,
    valueNow: qty * h.currentPrice,
  };
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderLines(lines: Line[], source: "position" | "holding") {
  return (
    <div className="tile-grid !p-0">
      {lines.map(function (line) {
        const pnl = line.valueNow - line.invested;
        const pnlPercent = line.invested > 0 ? (pnl / line.invested) * 100 : 0;
        const isGain = pnl >= 0;
        return (
          <div key={line.stockId + source} className="tile">
            <div>
              <p className="font-bold">{line.symbol}</p>
              <p className="muted text-sm">{line.name}</p>
            </div>
            <div className="num mt-4 text-sm">
              <p className="muted">
                Qty {line.qty} @ ${fmt(line.avgBuyPrice)}
              </p>
              <p>${fmt(line.valueNow)}</p>
              <p className={isGain ? "gain" : "loss"}>
                {isGain ? "+" : "-"}${fmt(Math.abs(pnl))} ({isGain ? "+" : "-"}
                {Math.abs(pnlPercent).toFixed(2)}%)
              </p>
            </div>
            <RowActions symbol={line.symbol} source={source} quantity={line.qty} />
          </div>
        );
      })}
    </div>
  );
}

export default async function PortfolioPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = session.user.id as string;
  const query = await props.searchParams;

  const userPortfolio = await prisma.userPortfolio.upsert({
    where: { userId: userId },
    update: {},
    create: { userId: userId },
  });

  const holdings = await prisma.portfolioHolding.findMany({ where: { userId: userId } });
  const orders = await prisma.order.findMany({
    where: { userId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const today = getTradeDate();

  const enriched: Enriched[] = await Promise.all(
    holdings.map(async function (holding) {
      const stock = mockStocks.find(function (s) {
        return s.symbol === holding.stockId;
      });
      const livePrice = await getCurrentPrice(holding.stockId);
      const positionQty = holding.todayDate === today ? holding.todayQty : 0;

      return {
        stockId: holding.stockId,
        symbol: stock ? stock.symbol : holding.stockId,
        name: stock ? stock.name : "Unknown",
        currentPrice: livePrice ?? (stock ? stock.currentPrice : 0),
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        positionQty: positionQty,
        holdingQty: holding.quantity - positionQty,
      };
    })
  );

  const positionLines = enriched
    .filter(function (h) {
      return h.positionQty > 0;
    })
    .map(function (h) {
      return toLine(h, h.positionQty);
    });

  const holdingLines = enriched
    .filter(function (h) {
      return h.holdingQty > 0;
    })
    .map(function (h) {
      return toLine(h, h.holdingQty);
    });

  const totalInvested = enriched.reduce(function (sum, h) {
    return sum + h.quantity * h.avgBuyPrice;
  }, 0);
  const totalValueNow = enriched.reduce(function (sum, h) {
    return sum + h.quantity * h.currentPrice;
  }, 0);
  const totalPnl = totalValueNow - totalInvested;

  const requested = query.tab;
  const activeTab =
    requested === "positions" || requested === "holdings" || requested === "orders"
      ? requested
      : positionLines.length > 0
      ? "positions"
      : "holdings";

  const tabs = [
    { id: "positions", label: "Positions", count: positionLines.length },
    { id: "holdings", label: "Holdings", count: holdingLines.length },
    { id: "orders", label: "Orders", count: orders.length },
  ];

  return (
    <div className="px-4 py-6">
      <div className="grid gap-6 border-b border-[var(--line)] pb-6 sm:grid-cols-4">
        <div>
          <p className="muted text-sm">Current Balance</p>
          <p className="num text-3xl font-bold">${fmt(Number(userPortfolio.currentBalance))}</p>
        </div>
        <div>
          <p className="muted text-sm">Total Invested</p>
          <p className="num text-3xl font-bold">${fmt(totalInvested)}</p>
        </div>
        <div>
          <p className="muted text-sm">Current Value</p>
          <p className="num text-3xl font-bold">${fmt(totalValueNow)}</p>
        </div>
        <div>
          <p className="muted text-sm">Total P&amp;L</p>
          <p className={"num text-3xl font-bold " + (totalPnl >= 0 ? "gain" : "loss")}>
            {totalPnl >= 0 ? "+" : "-"}${fmt(Math.abs(totalPnl))}
          </p>
        </div>
      </div>

      <div className="mb-4 mt-8 flex gap-1">
        {tabs.map(function (tab) {
          const active = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={"/portfolio?tab=" + tab.id}
              className={
                "num border px-3 py-1 text-sm " +
                (active
                  ? "border-[#A9782E] bg-[#A9782E] text-white"
                  : "border-[var(--line)] opacity-80 hover:opacity-100")
              }
            >
              {tab.label} ({tab.count})
            </Link>
          );
        })}
      </div>

      {activeTab === "positions" ? (
        positionLines.length > 0 ? (
          renderLines(positionLines, "position")
        ) : (
          <p className="muted text-sm">
            No open positions. Shares you buy today appear here and move to Holdings on the next
            trading day (US market date).
          </p>
        )
      ) : null}

      {activeTab === "holdings" ? (
        holdingLines.length > 0 ? (
          renderLines(holdingLines, "holding")
        ) : (
          <p className="muted text-sm">No holdings yet. Buy a stock to get started.</p>
        )
      ) : null}

      {activeTab === "orders" ? (
        orders.length > 0 ? (
          <div className="overflow-x-auto border border-[var(--line)]">
            <table className="num w-full text-sm">
              <thead>
                <tr className="muted border-b border-[var(--line)] text-left">
                  <th className="p-2">Time (IST)</th>
                  <th className="p-2">Side</th>
                  <th className="p-2">Symbol</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(function (order) {
                  return (
                    <tr key={order.id} className="border-b border-[var(--line)]">
                      <td className="p-2">
                        {order.createdAt.toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </td>
                      <td className={"p-2 font-bold " + (order.side === "BUY" ? "gain" : "loss")}>
                        {order.side}
                      </td>
                      <td className="p-2">{order.stockId}</td>
                      <td className="p-2 text-right">{order.quantity}</td>
                      <td className="p-2 text-right">${fmt(order.executedPrice)}</td>
                      <td className="p-2 text-right">${fmt(order.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted text-sm">No orders yet.</p>
        )
      ) : null}
    </div>
  );
}