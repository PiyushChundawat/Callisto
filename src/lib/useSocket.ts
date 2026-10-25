"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useLivePrices() {
    const [prices, setPrices] = useState<Record<string, any>>({});
  
    useEffect(() => {
      fetch("/api/stocks/current")
        .then((res) => res.json())
        .then((initial) => setPrices(initial));
  
      const socket: Socket = io("http://localhost:3000");
      socket.on("price-update", (data) => {
        setPrices((prev) => ({ ...prev, [data.symbol]: data }));
      });
      return () => {
        socket.disconnect();
      };
    }, []);
  
    return prices;
}