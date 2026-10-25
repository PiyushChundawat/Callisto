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
      await client.set(`stock:${symbol}`, JSON.stringify(data));
      await client.publish("price-updates", JSON.stringify({ symbol, ...data }));
    }

    await delay(500); // small pause before the next batch
  }

  console.log("Fetched and stored all stocks:", new Date().toISOString());
}
async function snapshotToDatabase() {
    const client = await getRedisClient();
  
    const keys = symbols.map((symbol) => `stock:${symbol}`);
    const values = await client.mGet(keys);
  
    const rows = symbols
      .map((symbol, i) => {
        const raw = values[i];
        if (!raw) return null;
  
        const data = JSON.parse(raw);
        return {
          stockId: symbol,
          price: data.c,
          timestamp: new Date(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  
    if (rows.length === 0) {
      console.log("Snapshot skipped: no price data in Redis yet");
      return;
    }
  
    await prisma.priceHistory.createMany({ data: rows });
    console.log(`Snapshot: wrote ${rows.length} rows at`, new Date().toISOString());
  }
export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    fetchAllStocks(); // run once immediately on server start
    setInterval(fetchAllStocks, 60000); // then every 60 seconds
    setInterval(snapshotToDatabase, 120000); // DB snapshot, every 2 min
}