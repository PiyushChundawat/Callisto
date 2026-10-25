import { PortfolioHolding, UserPortfolio } from "@/types/portfolio";

export const mockUserPortfolio: UserPortfolio = {
  userId: "u1",
  currentBalance: 5000,
};

export const mockHoldings: PortfolioHolding[] = [
  { userId: "u1", stockId: "1", quantity: 5, avgBuyPrice: 40 },
  { userId: "u1", stockId: "5", quantity: 2, avgBuyPrice: 220 },
  { userId: "u1", stockId: "12", quantity: 3, avgBuyPrice: 250 },
];