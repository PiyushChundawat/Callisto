import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSource, orderRequestHash } from "@/lib/orderHash";
import { checkTpin, createOtpChallenge } from "@/lib/security";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id as string;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
  const quantity = Number(body.quantity);
  const source = normalizeSource(body.source);
  const tpin = typeof body.tpin === "string" ? body.tpin.trim() : "";

  if (!symbol || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    return NextResponse.json({ error: "Invalid order details" }, { status: 400 });
  }

  const check = await checkTpin(userId, tpin);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const challenge = await createOtpChallenge(
    userId,
    user.email,
    orderRequestHash(symbol, "sell", quantity, source),
    "Sell " + quantity + " × " + symbol
  );
  if (!challenge.ok) {
    return NextResponse.json({ error: challenge.error }, { status: challenge.status });
  }

  return NextResponse.json({ challengeId: challenge.challengeId });
}