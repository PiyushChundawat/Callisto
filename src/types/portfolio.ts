export type PortfolioHolding = {
    userId: string;
    stockId: string;
    quantity: number;
    avgBuyPrice: number;
};
  
export type UserPortfolio = {
    userId: string;
    currentBalance: number;
};