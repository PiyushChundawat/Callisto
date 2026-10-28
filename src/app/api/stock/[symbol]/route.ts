import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RANGES: Record<string, { windowMs: number; stride: string; ttl: number }> = {
  "1D": { windowMs: DAY, stride: "5 minutes", ttl: 60 },
  "1W": { windowMs: 7 * DAY, stride: "30 minutes", ttl: 300 },
  "1M": { windowMs: 30 * DAY, stride: "2 hours", ttl: 900 },
};

// For ALL, the bucket is the smallest step that keeps the chart at 300 candles or fewer.
const MAX_CANDLES = 300;
const LADDER = [
  { ms: 2 * MINUTE, stride: "2 minutes" },
  { ms: 5 * MINUTE, stride: "5 minutes" },
  { ms: 15 * MINUTE, stride: "15 minutes" },
  { ms: 30 * MINUTE, stride: "30 minutes" },
  { ms: HOUR, stride: "1 hour" },
  { ms: 2 * HOUR, stride: "2 hours" },
  { ms: 4 * HOUR, stride: "4 hours" },
  { ms: 12 * HOUR, stride: "12 hours" },
  { ms: DAY, stride: "1 day" },
  { ms: 3 * DAY, stride: "3 days" },
  { ms: 7 * DAY, stride: "7 days" },
];

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

  // No range given: raw rows (kept for the engineering page comparison)
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

  if (range !== "ALL" && !RANGES[range]) {
    return NextResponse.json({ error: "range must be 1D, 1W, 1M or ALL" }, { status: 400 });
  }

  const cacheKey = `history:v2:${symbol}:${range}`;
  const cached = await client.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Anchor to the newest data point, so a closed market still shows the last session.
  const latest = await prisma.priceHistory.findFirst({
    where: { stockId: symbol },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });
  if (!latest) {
    return NextResponse.json([]);
  }

  let fromMs = 0;
  let stride = "";
  let ttl = 300;

  if (range === "ALL") {
    const earliest = await prisma.priceHistory.findFirst({
      where: { stockId: symbol },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true },
    });
    const earliestMs = earliest ? earliest.timestamp.getTime() : latest.timestamp.getTime();
    const span = latest.timestamp.getTime() - earliestMs;

    stride = LADDER[LADDER.length - 1].stride;
    for (const step of LADDER) {
      if (span / step.ms <= MAX_CANDLES) {
        stride = step.stride;
        break;
      }
    }
    fromMs = earliestMs;
  } else {
    const config = RANGES[range];
    fromMs = latest.timestamp.getTime() - config.windowMs;
    stride = config.stride;
    ttl = config.ttl;
  }

  const fromIso = new Date(fromMs).toISOString();

  const rows = await prisma.$queryRaw<CandleRow[]>`
    SELECT
      EXTRACT(EPOCH FROM date_bin(${stride}::interval, "timestamp", TIMESTAMP '1970-01-01'))::float8 AS bucket,
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

  await client.set(cacheKey, JSON.stringify(candles), { EX: ttl });
  return NextResponse.json(candles);
}