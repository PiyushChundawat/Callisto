// instrumentation.ts (project root)
import { fetchQuote } from "@/lib/finnhub";
import { getRedisClient } from "@/lib/redis";
import { chunkArray } from "@/lib/chunk";
import { mockStocks } from "@/lib/mockStocks";
import { prisma } from "@/lib/prisma";

const symbols = mockStocks.map((s) => s.symbol);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllStocks() {
  const client = await getRedisClient();
  const batches = chunkArray(symbols, 5);

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map((symbol) => fetchQuote(symbol))
    );

    for (let i = 0; i < batch.length; i++) {
      const symbol = batch[i];
      const data = results[i];
      const quote = data as unknown as { c?: number; error?: string } | null;
      if (!quote || quote.error || typeof quote.c !== "number") {
          console.warn(`Skipping ${symbol}:`, quote?.error ?? "no price");
          continue;
      }
      await client.set(`stock:${symbol}`, JSON.stringify(data));
      await client.publish("price-updates", JSON.stringify({ symbol, ...data }));
    }

    await delay(500); // small pause before the next batch
  }

  console.log("Fetched and stored all stocks:", new Date().toISOString());
}
const lastWrittenT = new Map<string, number>();

async function snapshotToDatabase() {
  const client = await getRedisClient();
  const keys = symbols.map((symbol) => `stock:${symbol}`);
  const values = await client.mGet(keys);

  const rows: { stockId: string; price: number; timestamp: Date }[] = [];
  const written: { symbol: string; t: number }[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const raw = values[i];
    if (!raw) continue;
    const data = JSON.parse(raw);
    if (typeof data.c !== "number") continue; // skips error payloads
    if (lastWrittenT.get(symbols[i]) === data.t) continue; // no new trade since last snapshot
    rows.push({ stockId: symbols[i], price: data.c, timestamp: new Date() });
    written.push({ symbol: symbols[i], t: data.t });
  }

  if (rows.length === 0) {
    console.log("Snapshot skipped: no new trades");
    return;
  }

  await prisma.priceHistory.createMany({ data: rows });
  for (const item of written) {
    lastWrittenT.set(item.symbol, item.t);
  }
  console.log(`Snapshot: wrote ${rows.length} rows at`, new Date().toISOString());
}
  export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const runFetch = () => {
      fetchAllStocks().catch((err) => console.error("fetchAllStocks failed:", err));
    };
    const runSnapshot = () => {
      snapshotToDatabase().catch((err) => console.error("snapshotToDatabase failed:", err));
    };

    runFetch();
    setInterval(runFetch, 90000);
    setInterval(runSnapshot, 120000);
  }