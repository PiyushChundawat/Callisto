"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

type Candle = { time: number; open: number; high: number; low: number; close: number };

const RANGES = ["1D", "1W", "1M", "ALL"] as const;
type Range = (typeof RANGES)[number];

function usd(value: number) {
  return "$" + value.toFixed(2);
}

export default function CandleChart(props: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [range, setRange] = useState<Range>("1D");
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [last, setLast] = useState<Candle | null>(null);

  // Create the chart once.
  useEffect(function () {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(24, 32, 25, 0.6)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: "#D8DAD0" } },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderColor: "#D8DAD0",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: function (time: unknown, tickMarkType: number) {
          const date = new Date(Number(time) * 1000);
          // 3 and above mean "time of day"; below that it is a date label
          if (tickMarkType >= 3) {
            return date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          }
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        },
      },
      localization: {
        priceFormatter: function (price: number) {
          return usd(price);
        },
        timeFormatter: function (time: unknown) {
          return new Date(Number(time) * 1000).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#1F8F5F",
      downColor: "#C43D30",
      borderVisible: false,
      wickUpColor: "#1F8F5F",
      wickDownColor: "#C43D30",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return function () {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load candles whenever the stock or range changes.
  useEffect(
    function () {
      let cancelled = false;
      setStatus("loading");
      const apiRange = range === "ALL" ? "1M" : range;

      fetch("/api/stock/" + props.symbol + "/history?range=" + apiRange)
        .then(function (response) {
          if (!response.ok) throw new Error("bad response");
          return response.json();
        })
        .then(function (data: Candle[]) {
          if (cancelled || !seriesRef.current || !chartRef.current) return;

          if (data.length === 0) {
            seriesRef.current.setData([]);
            setLast(null);
            setStatus("empty");
            return;
          }

          seriesRef.current.setData(
            data.map(function (candle) {
              return {
                time: candle.time as UTCTimestamp,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
              };
            })
          );
          chartRef.current.timeScale().fitContent();
          setLast(data[data.length - 1]);
          setStatus("ready");
        })
        .catch(function () {
          if (!cancelled) setStatus("error");
        });

      return function () {
        cancelled = true;
      };
    },
    [props.symbol, range]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {RANGES.map(function (item) {
            const active = item === range;
            return (
              <button
                key={item}
                type="button"
                onClick={function () {
                  setRange(item);
                }}
                className={
                  "num border px-3 py-1 text-sm " +
                  (active
                    ? "border-[#A9782E] bg-[#A9782E] text-white"
                    : "border-[var(--line)] opacity-80 hover:opacity-100")
                }
              >
                {item}
              </button>
            );
          })}
        </div>
        {last ? (
          <p className="num text-xs opacity-70">
            O {usd(last.open)} &nbsp; H {usd(last.high)} &nbsp; L {usd(last.low)} &nbsp; C{" "}
            {usd(last.close)}
          </p>
        ) : null}
      </div>

      <div className="relative">
        <div ref={containerRef} className="h-[320px] w-full" />
        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70">
            {status === "loading"
              ? "Loading chart..."
              : status === "empty"
              ? "No price history yet for this range"
              : "Could not load the chart"}
          </div>
        ) : null}
      </div>
    </div>
  );
}