"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PriceHistory } from "@/types/stock";

export default function PriceChart({ data }: { data: PriceHistory[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#2563eb" />
      </LineChart>
    </ResponsiveContainer>
  );
}