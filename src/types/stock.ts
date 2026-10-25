export type Stock = {
    stockId: string;
    symbol: string;
    name: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
};

export type PriceHistory = {
    stockId: string;
    price: number;
    timestamp: string;
  };