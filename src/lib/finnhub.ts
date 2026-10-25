export async function fetchQuote(symbol: string) {
    const apiKey = process.env.FINNHUB_API_KEY;
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    const data = await res.json();
    return data;    
}