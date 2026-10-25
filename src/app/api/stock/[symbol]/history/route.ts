import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  const params = await context.params;
  const symbol = params.symbol;
  const client = await getRedisClient();
  const cacheKey = `history:${symbol}`;

  const cached = await client.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const rows = await prisma.priceHistory.findMany({
    where: { stockId: symbol },
    orderBy: { timestamp: "asc" },
  });

  await client.set(cacheKey, JSON.stringify(rows), { EX: 180 });

  return NextResponse.json(rows);
}