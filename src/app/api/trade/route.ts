import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRedisClient, getCurrentPrice } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.symbol || !body.action || !body.quantity || !body.idempotencyKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.action !== "buy" && body.action !== "sell") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const client = await getRedisClient();
  const idemKey = `trade:idem:${session.user.id}:${body.idempotencyKey}`;

  // SETNX-with-expiry: only the first request for this key gets past this line
  const claimed = await client.set(idemKey, "processing", { NX: true, EX: 300 });

  if (!claimed) {
    const existingValue = await client.get(idemKey);

    if (existingValue === "processing") {
      return NextResponse.json({ error: "Request already in progress" }, { status: 409 });
    }

    // A duplicate of an already-completed request — replay the stored
    // result instead of running the trade twice.
    return NextResponse.json(JSON.parse(existingValue as string), { status: 200 });
  }

  const currentPrice = await getCurrentPrice(body.symbol);

  if (!currentPrice) {
    await client.del(idemKey);
    return NextResponse.json({ error: "Price unavailable for this stock" }, { status: 400 });
  }

  try {
    const result = await runTrade(
      session.user.id,
      body.symbol,
      body.action,
      body.quantity,
      currentPrice
    );
    await client.set(idemKey, JSON.stringify(result), { EX: 300 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    await client.del(idemKey);
    const message = error instanceof Error ? error.message : "Trade failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function runTrade(
  userId: string,
  symbol: string,
  action: string,
  quantity: number,
  currentPrice: number
) {
  return await prisma.$transaction(async function (tx) {
    const portfolio = await tx.userPortfolio.upsert({
      where: { userId: userId },
      update: {},
      create: { userId: userId },
    });

    const holding = await tx.portfolioHolding.findUnique({
      where: { userId_stockId: { userId: userId, stockId: symbol } },
    });

    if (action === "buy") {
      const cost = quantity * currentPrice;

      if (portfolio.currentBalance < cost) {
        throw new Error("Insufficient balance");
      }

      await tx.userPortfolio.update({
        where: { userId: userId },
        data: { currentBalance: portfolio.currentBalance - cost },
      });

      if (!holding) {
        await tx.portfolioHolding.create({
          data: {
            userId: userId,
            stockId: symbol,
            quantity: quantity,
            avgBuyPrice: currentPrice,
          },
        });
      } else {
        const newQuantity = holding.quantity + quantity;
        const newAvgBuyPrice =
          (holding.quantity * holding.avgBuyPrice + cost) / newQuantity;

        await tx.portfolioHolding.update({
          where: { userId_stockId: { userId: userId, stockId: symbol } },
          data: { quantity: newQuantity, avgBuyPrice: newAvgBuyPrice },
        });
      }

      return {
        action: "buy",
        symbol: symbol,
        quantity: quantity,
        price: currentPrice,
        cost: cost,
      };
    }

    // action === "sell"
    if (!holding || holding.quantity < quantity) {
      throw new Error("Not enough holdings to sell");
    }

    const proceeds = quantity * currentPrice;
    const remainingQuantity = holding.quantity - quantity;

    await tx.userPortfolio.update({
      where: { userId: userId },
      data: { currentBalance: portfolio.currentBalance + proceeds },
    });

    if (remainingQuantity === 0) {
      await tx.portfolioHolding.delete({
        where: { userId_stockId: { userId: userId, stockId: symbol } },
      });
    } else {
      await tx.portfolioHolding.update({
        where: { userId_stockId: { userId: userId, stockId: symbol } },
        data: { quantity: remainingQuantity },
      });
    }

    return {
      action: "sell",
      symbol: symbol,
      quantity: quantity,
      price: currentPrice,
      proceeds: proceeds,
    };
  });
}