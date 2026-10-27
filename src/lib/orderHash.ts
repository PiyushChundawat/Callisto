import { createHash } from "node:crypto";

export function normalizeSource(value: unknown): "position" | "holding" | "auto" {
  return value === "position" || value === "holding" ? value : "auto";
}

export function orderRequestHash(
  symbol: string,
  action: string,
  quantity: number,
  source: string
): string {
  return createHash("sha256")
    .update(JSON.stringify([symbol, action, quantity, action === "sell" ? source : null]))
    .digest("hex");
}