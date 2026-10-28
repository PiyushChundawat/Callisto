import LiveStockGrid from "@/components/stock/LiveStockGrid";
import { mockStocks } from "@/lib/mockStocks";
import Hero from "@/components/Hero";

export default function DashboardPage() {
  return (
    <>
      <Hero />
      <LiveStockGrid stocks={mockStocks} />
    </>
  );
}