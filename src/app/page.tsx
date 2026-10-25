import LiveStockGrid from "@/components/stock/LiveStockGrid";
import { mockStocks } from "@/lib/mockStocks";

export default function DashboardPage() {
  return <LiveStockGrid stocks={mockStocks} />;
}