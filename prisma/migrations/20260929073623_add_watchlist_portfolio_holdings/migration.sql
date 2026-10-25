-- CreateTable
CREATE TABLE "Watchlist" (
    "userId" TEXT NOT NULL,
    "stockIds" TEXT[],

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserPortfolio" (
    "userId" TEXT NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 10000,

    CONSTRAINT "UserPortfolio_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PortfolioHolding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avgBuyPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PortfolioHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioHolding_userId_stockId_key" ON "PortfolioHolding"("userId", "stockId");
