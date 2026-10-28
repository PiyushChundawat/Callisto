import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function readSymbols(userId: string) {
  const existing = await prisma.watchlist.findUnique({ where: { userId: userId } });
  return existing ? existing.stockIds : [];
}

function cleanSymbol(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const stockIds = await readSymbols(session.user.id as string);
  return NextResponse.json({ stockIds: stockIds }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const body = await request.json();
  const symbol = cleanSymbol(body.symbol);
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const currentSymbols = await readSymbols(userId);

  // Already there: nothing to do, just confirm the current state
  if (currentSymbols.includes(symbol)) {
    return NextResponse.json({ stockIds: currentSymbols }, { status: 200 });
  }

  const updatedSymbols = currentSymbols.concat(symbol);
  const watchlist = await prisma.watchlist.upsert({
    where: { userId: userId },
    update: { stockIds: updatedSymbols },
    create: { userId: userId, stockIds: updatedSymbols },
  });

  return NextResponse.json({ stockIds: watchlist.stockIds }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const body = await request.json();
  const symbol = cleanSymbol(body.symbol);
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const currentSymbols = await readSymbols(userId);
  const updatedSymbols = currentSymbols.filter(function (item) {
    return item !== symbol;
  });

  // Not on the list: nothing to remove
  if (updatedSymbols.length === currentSymbols.length) {
    return NextResponse.json({ stockIds: currentSymbols }, { status: 200 });
  }

  await prisma.watchlist.update({
    where: { userId: userId },
    data: { stockIds: updatedSymbols },
  });

  return NextResponse.json({ stockIds: updatedSymbols }, { status: 200 });
}