import { createClient } from "redis";


const redisClient = createClient({
  url: "redis://localhost:6379",
});


redisClient.on("error", (err: Error) => console.error("Redis error:", err));

let connectingPromise: Promise<void> | null = null;

export async function getRedisClient() {
  if (!redisClient.isOpen && !connectingPromise) {
    connectingPromise = redisClient.connect().then(function () {
      connectingPromise = null;
    });
  }
  if (connectingPromise) {
    await connectingPromise;
  }
  return redisClient;
}


export async function getCurrentPrice(symbol: string) {
  const client = await getRedisClient();
  const raw = await client.get(`stock:${symbol}`);
  if (!raw) return null;
  const data = JSON.parse(raw);
  return data.c;
}
 
