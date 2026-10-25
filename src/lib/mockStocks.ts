import { Stock } from "@/types/stock";

const mockStocks: Stock[] = [
  { stockId: "1", symbol: "AAPL", name: "Apple Inc.", currentPrice: 193.42, change: 2.15, changePercent: 1.12, lastUpdated: "2026-08-10" },
  { stockId: "2", symbol: "MSFT", name: "Microsoft Corp.", currentPrice: 421.30, change: -1.85, changePercent: -0.44, lastUpdated: "2026-08-10" },
  { stockId: "3", symbol: "GOOGL", name: "Alphabet Inc.", currentPrice: 178.55, change: 0.92, changePercent: 0.52, lastUpdated: "2026-08-10" },
  { stockId: "4", symbol: "AMZN", name: "Amazon.com Inc.", currentPrice: 201.77, change: -3.40, changePercent: -1.66, lastUpdated: "2026-08-10" },
  { stockId: "5", symbol: "TSLA", name: "Tesla Inc.", currentPrice: 256.90, change: 8.21, changePercent: 3.30, lastUpdated: "2026-08-10" },
  { stockId: "6", symbol: "NVDA", name: "NVIDIA Corp.", currentPrice: 132.14, change: 4.05, changePercent: 3.16, lastUpdated: "2026-08-10" },
  { stockId: "7", symbol: "META", name: "Meta Platforms Inc.", currentPrice: 512.88, change: -6.12, changePercent: -1.18, lastUpdated: "2026-08-10" },
  { stockId: "8", symbol: "NFLX", name: "Netflix Inc.", currentPrice: 689.33, change: 12.47, changePercent: 1.84, lastUpdated: "2026-08-10" },
  { stockId: "9", symbol: "AMD", name: "Advanced Micro Devices", currentPrice: 154.02, change: -2.28, changePercent: -1.46, lastUpdated: "2026-08-10" },
  { stockId: "10", symbol: "INTC", name: "Intel Corp.", currentPrice: 33.61, change: 0.44, changePercent: 1.33, lastUpdated: "2026-08-10" },
  { stockId: "11", symbol: "ORCL", name: "Oracle Corp.", currentPrice: 178.20, change: 1.05, changePercent: 0.59, lastUpdated: "2026-08-10" },
{ stockId: "12", symbol: "CRM", name: "Salesforce Inc.", currentPrice: 264.75, change: -4.30, changePercent: -1.60, lastUpdated: "2026-08-10" },
{ stockId: "13", symbol: "ADBE", name: "Adobe Inc.", currentPrice: 512.60, change: 3.90, changePercent: 0.77, lastUpdated: "2026-08-10" },
{ stockId: "14", symbol: "PYPL", name: "PayPal Holdings", currentPrice: 71.85, change: -0.65, changePercent: -0.90, lastUpdated: "2026-08-10" },
{ stockId: "15", symbol: "UBER", name: "Uber Technologies", currentPrice: 82.40, change: 1.20, changePercent: 1.48, lastUpdated: "2026-08-10" },
{ stockId: "16", symbol: "SHOP", name: "Shopify Inc.", currentPrice: 98.15, change: 2.75, changePercent: 2.88, lastUpdated: "2026-08-10" },
{ stockId: "17", symbol: "XYZ", name: "Block Inc.", currentPrice: 67.30, change: -1.10, changePercent: -1.61, lastUpdated: "2026-08-10" },
{ stockId: "18", symbol: "SNAP", name: "Snap Inc.", currentPrice: 11.85, change: 0.32, changePercent: 2.77, lastUpdated: "2026-08-10" },
{ stockId: "19", symbol: "PINS", name: "Pinterest Inc.", currentPrice: 34.60, change: -0.85, changePercent: -2.40, lastUpdated: "2026-08-10" },
{ stockId: "20", symbol: "SPOT", name: "Spotify Technology", currentPrice: 412.90, change: 6.50, changePercent: 1.60, lastUpdated: "2026-08-10" },
{ stockId: "21", symbol: "IBM", name: "IBM Corp.", currentPrice: 231.45, change: 1.75, changePercent: 0.76, lastUpdated: "2026-08-10" },
{ stockId: "22", symbol: "QCOM", name: "Qualcomm Inc.", currentPrice: 172.30, change: -2.90, changePercent: -1.65, lastUpdated: "2026-08-10" },
{ stockId: "23", symbol: "TXN", name: "Texas Instruments", currentPrice: 198.65, change: 0.95, changePercent: 0.48, lastUpdated: "2026-08-10" },
{ stockId: "24", symbol: "AVGO", name: "Broadcom Inc.", currentPrice: 168.75, change: 3.60, changePercent: 2.18, lastUpdated: "2026-08-10" },
{ stockId: "25", symbol: "MU", name: "Micron Technology", currentPrice: 108.40, change: -3.25, changePercent: -2.91, lastUpdated: "2026-08-10" },
{ stockId: "26", symbol: "CSCO", name: "Cisco Systems", currentPrice: 66.20, change: 0.55, changePercent: 0.84, lastUpdated: "2026-08-10" },
{ stockId: "27", symbol: "DELL", name: "Dell Technologies", currentPrice: 121.90, change: -1.40, changePercent: -1.14, lastUpdated: "2026-08-10" },
{ stockId: "28", symbol: "HPQ", name: "HP Inc.", currentPrice: 32.15, change: 0.28, changePercent: 0.88, lastUpdated: "2026-08-10" },
{ stockId: "29", symbol: "SONY", name: "Sony Group Corp.", currentPrice: 94.60, change: 1.85, changePercent: 1.99, lastUpdated: "2026-08-10" },
{ stockId: "30", symbol: "BABA", name: "Alibaba Group", currentPrice: 88.75, change: -2.10, changePercent: -2.31, lastUpdated: "2026-08-10" },
{ stockId: "31", symbol: "PLTR", name: "Palantir Technologies", currentPrice: 142.30, change: 5.40, changePercent: 3.94, lastUpdated: "2026-08-10" },
{ stockId: "32", symbol: "SOFI", name: "SoFi Technologies", currentPrice: 15.70, change: -0.35, changePercent: -2.18, lastUpdated: "2026-08-10" }
];

export { mockStocks };