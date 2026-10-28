import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Log in first" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id as string } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    await sendEmail({
      to: user.email,
      subject: "Callisto email test",
      text: "If you can read this, email works.",
      html: "<p>If you can read this, email works.</p>",
    });
    return NextResponse.json({ ok: true, sentTo: user.email });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}