import { fetchQuote } from "@/lib/finnhub";
import { getRedisClient } from "@/lib/redis";
export async function GET(
    
    request: Request, 
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const data = await fetchQuote(symbol.toUpperCase());
    return Response.json(data);
}