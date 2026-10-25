import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "That email is already registered" },
      { status: 409 }
    );
  }

  // 10 salt rounds is the standard bcrypt default — fine for this scale
  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash: passwordHash,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}