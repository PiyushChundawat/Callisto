import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/redis";
import { getTradeDate } from "@/lib/tradeDate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "").toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const price = await getCurrentPrice(symbol);
  const portfolio = await prisma.userPortfolio.findUnique({ where: { userId: userId } });
  const holding = await prisma.portfolioHolding.findUnique({
    where: { userId_stockId: { userId: userId, stockId: symbol } },
  });

  const today = getTradeDate();
  const positionQty = holding && holding.todayDate === today ? holding.todayQty : 0;

  return NextResponse.json({
    price: typeof price === "number" ? price : null,
    balance: portfolio ? portfolio.currentBalance : 10000,
    ownedQty: holding ? holding.quantity : 0,
    positionQty: positionQty,
  });
}