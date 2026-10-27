import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

const RANGES: Record<string, { windowMs: number; stride: string; ttl: number }> = {
  "1D": { windowMs: 24 * 60 * 60 * 1000, stride: "5 minutes", ttl: 60 },
  "1W": { windowMs: 7 * 24 * 60 * 60 * 1000, stride: "30 minutes", ttl: 300 },
  "1M": { windowMs: 30 * 24 * 60 * 60 * 1000, stride: "2 hours", ttl: 900 },
};

type CandleRow = {
  bucket: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  const params = await context.params;
  const symbol = params.symbol.toUpperCase();
  const range = request.nextUrl.searchParams.get("range");
  const client = await getRedisClient();

  // No range given: keep the old behaviour for any existing caller.
  if (!range) {
    const legacyKey = `history:${symbol}`;
    const legacyCached = await client.get(legacyKey);
    if (legacyCached) {
      return NextResponse.json(JSON.parse(legacyCached));
    }
    const rows = await prisma.priceHistory.findMany({
      where: { stockId: symbol },
      orderBy: { timestamp: "asc" },
    });
    await client.set(legacyKey, JSON.stringify(rows), { EX: 180 });
    return NextResponse.json(rows);
  }

  const config = RANGES[range];
  if (!config) {
    return NextResponse.json({ error: "range must be 1D, 1W or 1M" }, { status: 400 });
  }

  const cacheKey = `history:v2:${symbol}:${range}`;
  const cached = await client.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Anchor the window to the newest data point, so a closed market still
  // shows the last session instead of an empty chart.
  const latest = await prisma.priceHistory.findFirst({
    where: { stockId: symbol },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });
  if (!latest) {
    return NextResponse.json([]);
  }
  const fromIso = new Date(latest.timestamp.getTime() - config.windowMs).toISOString();

  const rows = await prisma.$queryRaw<CandleRow[]>`
    SELECT
      EXTRACT(EPOCH FROM date_bin(${config.stride}::interval, "timestamp", TIMESTAMP '1970-01-01'))::float8 AS bucket,
      (array_agg("price" ORDER BY "timestamp" ASC))[1] AS open,
      MAX("price") AS high,
      MIN("price") AS low,
      (array_agg("price" ORDER BY "timestamp" DESC))[1] AS close
    FROM "PriceHistory"
    WHERE "stockId" = ${symbol}
      AND "timestamp" >= ${fromIso}::timestamp
    GROUP BY 1
    ORDER BY 1 ASC`;

  const candles = rows.map(function (row) {
    return {
      time: Math.round(row.bucket),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
    };
  });

  await client.set(cacheKey, JSON.stringify(candles), { EX: config.ttl });
  return NextResponse.json(candles);
}