import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { issueTpin } from "@/lib/security";

export async function POST() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const credential = await prisma.tpinCredential.findUnique({ where: { userId: userId } });
  if (credential && credential.issuedAt > new Date(Date.now() - 60 * 1000)) {
    return NextResponse.json(
      { error: "Please wait a minute before requesting another TPIN." },
      { status: 429 }
    );
  }

  try {
    await issueTpin(user.id, user.email);
  } catch (err) {
    console.error("TPIN email failed:", err);
    return NextResponse.json(
      { error: "Could not send the email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}