import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const existing = await prisma.watchlist.findUnique({
    where: { userId: session.user.id },
  });

  const currentSymbols = existing?.stockIds ?? [];

  // Already there — nothing to do, just confirm the current state
  if (currentSymbols.includes(body.symbol)) {
    return NextResponse.json({ stockIds: currentSymbols }, { status: 200 });
  }

  const updatedSymbols = currentSymbols.concat(body.symbol);

  const watchlist = await prisma.watchlist.upsert({
    where: { userId: session.user.id },
    update: { stockIds: updatedSymbols },
    create: { userId: session.user.id, stockIds: updatedSymbols },
  });

  return NextResponse.json({ stockIds: watchlist.stockIds }, { status: 200 });
}