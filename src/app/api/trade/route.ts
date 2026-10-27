import { NextRequest, NextResponse } from "next/server";
import { Prisma, Order } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/redis";
import { getTradeDate } from "@/lib/tradeDate";
import { normalizeSource, orderRequestHash } from "@/lib/orderHash";
import { verifyOtp } from "@/lib/security";

class TradeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function toResult(order: Order, replayed: boolean) {
  return {
    orderId: order.id,
    action: order.side === "BUY" ? "buy" : "sell",
    symbol: order.stockId,
    quantity: order.quantity,
    price: order.executedPrice,
    total: order.total,
    balanceAfter: order.balanceAfter,
    createdAt: order.createdAt.toISOString(),
    replayed: replayed,
  };
}

function replayResponse(order: Order, requestHash: string) {
  if (order.requestHash !== requestHash) {
    return NextResponse.json(
      { error: "This idempotency key was already used for a different request" },
      { status: 422 }
    );
  }
  return NextResponse.json(toResult(order, true), {
    status: 200,
    headers: { "Idempotent-Replayed": "true" },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id as string;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
  const action = body.action;
  const quantity = Number(body.quantity);
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const source = normalizeSource(body.source);

  if (!symbol || !idempotencyKey || idempotencyKey.length > 100) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  if (action !== "buy" && action !== "sell") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    return NextResponse.json(
      { error: "Quantity must be a whole number between 1 and 100000" },
      { status: 400 }
    );
  }

  const requestHash = orderRequestHash(symbol, action, quantity, source);

  // Fast path: a repeat of a finished request needs no price and no lock.
  const existing = await prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId: userId, idempotencyKey: idempotencyKey } },
  });
  if (existing) {
    return replayResponse(existing, requestHash);
  }
  let challengeId = "";
  if (action === "sell") {
    challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
    const otp = typeof body.otp === "string" ? body.otp : "";
    const otpCheck = await verifyOtp(userId, challengeId, otp, requestHash);
    if (!otpCheck.ok) {
      return NextResponse.json({ error: otpCheck.error }, { status: otpCheck.status });
    }
  }

  // The price always comes from the server, never from the client.
  const price = await getCurrentPrice(symbol);
  if (typeof price !== "number") {
    return NextResponse.json({ error: "Price unavailable for this stock" }, { status: 400 });
  }

  try {
    const outcome = await prisma.$transaction(
      async function (tx) {
        // 1. Make sure the portfolio row exists, then lock it. Every trade by
        //    this user now waits its turn here.
        await tx.userPortfolio.createMany({
          data: [{ userId: userId }],
          skipDuplicates: true,
        });
        const locked = await tx.$queryRaw<{ currentBalance: number }[]>`
          SELECT "currentBalance" FROM "UserPortfolio"
          WHERE "userId" = ${userId} FOR UPDATE`;
        const balance = locked[0].currentBalance;

        // 2. Re-check the key under the lock. A concurrent duplicate that was
        //    waiting for us finds our finished order here and replays it.
        const again = await tx.order.findUnique({
          where: { userId_idempotencyKey: { userId: userId, idempotencyKey: idempotencyKey } },
        });
        if (again) {
          return { order: again, replayed: true };
        }
        if (action === "sell") {
            const consumed = await tx.otpChallenge.updateMany({
              where: { id: challengeId, userId: userId, usedAt: null },
              data: { usedAt: new Date() },
            });
            if (consumed.count !== 1) {
              throw new TradeError("This OTP was already used. Please start the sell again.", 403);
            }
        }

        const today = getTradeDate();
        const holding = await tx.portfolioHolding.findUnique({
          where: { userId_stockId: { userId: userId, stockId: symbol } },
        });
        const positionQty = holding && holding.todayDate === today ? holding.todayQty : 0;
        const total = quantity * price;
        let newBalance = balance;

        if (action === "buy") {
          if (balance < total) {
            throw new TradeError("Insufficient balance", 400);
          }
          newBalance = balance - total;

          if (!holding) {
            await tx.portfolioHolding.create({
              data: {
                userId: userId,
                stockId: symbol,
                quantity: quantity,
                avgBuyPrice: price,
                todayQty: quantity,
                todayDate: today,
              },
            });
          } else {
            const newQuantity = holding.quantity + quantity;
            const newAvg = (holding.quantity * holding.avgBuyPrice + total) / newQuantity;
            await tx.portfolioHolding.update({
              where: { userId_stockId: { userId: userId, stockId: symbol } },
              data: {
                quantity: newQuantity,
                avgBuyPrice: newAvg,
                todayQty: positionQty + quantity,
                todayDate: today,
              },
            });
          }
        } else {
          const holdingQty = holding ? holding.quantity - positionQty : 0;
          const available =
            source === "position"
              ? positionQty
              : source === "holding"
              ? holdingQty
              : holding
              ? holding.quantity
              : 0;

          if (!holding || quantity > available) {
            throw new TradeError("Not enough shares to sell", 400);
          }

          const fromPosition =
            source === "position" ? quantity : source === "holding" ? 0 : Math.min(quantity, positionQty);
          const remaining = holding.quantity - quantity;
          newBalance = balance + total;

          if (remaining === 0) {
            await tx.portfolioHolding.delete({
              where: { userId_stockId: { userId: userId, stockId: symbol } },
            });
          } else {
            await tx.portfolioHolding.update({
              where: { userId_stockId: { userId: userId, stockId: symbol } },
              data: {
                quantity: remaining,
                todayQty: positionQty - fromPosition,
                todayDate: today,
              },
            });
          }
        }

        await tx.userPortfolio.update({
          where: { userId: userId },
          data: { currentBalance: newBalance },
        });

        // 3. The ledger row doubles as the idempotency record, committed in
        //    the same transaction as the money movement.
        const order = await tx.order.create({
          data: {
            userId: userId,
            stockId: symbol,
            side: action === "buy" ? "BUY" : "SELL",
            source: action === "sell" ? source.toUpperCase() : null,
            quantity: quantity,
            executedPrice: price,
            total: total,
            balanceAfter: newBalance,
            tradeDate: today,
            idempotencyKey: idempotencyKey,
            requestHash: requestHash,
          },
        });
        return { order: order, replayed: false };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    if (outcome.replayed) {
      return replayResponse(outcome.order, requestHash);
    }
    return NextResponse.json(toResult(outcome.order, false), { status: 200 });
  } catch (error) {
    if (error instanceof TradeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Safety net: if the unique constraint ever fires, replay the winner.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.order.findUnique({
        where: { userId_idempotencyKey: { userId: userId, idempotencyKey: idempotencyKey } },
      });
      if (winner) {
        return replayResponse(winner, requestHash);
      }
    }
    console.error("Trade failed:", error);
    return NextResponse.json({ error: "Trade failed. Please try again." }, { status: 500 });
  }
}