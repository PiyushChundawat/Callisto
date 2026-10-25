"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PriceHistory } from "@/types/stock";

const tick = {
  fill: "rgb(24 32 25 / 0.6)",
  fontSize: 12,
  fontFamily: "var(--font-jetbrains-mono), monospace",
};

export default function PriceChart({ data }: { data: PriceHistory[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#D8DAD0" />
        <XAxis
          dataKey="timestamp"
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: "#D8DAD0" }}
          minTickGap={48}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          }
        />
        <YAxis
          domain={["auto", "auto"]}
          width={64}
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
        />
        <Tooltip
          cursor={{ stroke: "#D8DAD0" }}
          contentStyle={{
            background: "#F5F6F1",
            border: "1px solid #D8DAD0",
            borderRadius: 0,
            boxShadow: "none",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 12,
          }}
          labelFormatter={(value) =>
            new Date(value as string | number).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          }
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#A9782E"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#A9782E", stroke: "#F5F6F1", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}