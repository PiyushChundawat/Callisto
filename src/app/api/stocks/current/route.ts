import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { mockStocks } from "@/lib/mockStocks";

export async function GET() {
  const client = await getRedisClient();
  const symbols = mockStocks.map((s) => s.symbol);
  const keys = symbols.map((symbol) => `stock:${symbol}`);
  const values = await client.mGet(keys);

  const prices: Record<string, any> = {};
  symbols.forEach((symbol, i) => {
    const raw = values[i];
    if (raw) prices[symbol] = JSON.parse(raw);
  });

  return NextResponse.json(prices);
}