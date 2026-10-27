import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const GENERIC = {
  ok: true,
  message: "If that email has an account, a reset link is on its way.",
};

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (user) {
    // At most one email per minute per account.
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });

    if (!recent) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const base = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
      const link = base + "/reset-password?token=" + token;

      try {
        await sendEmail({
          to: user.email,
          subject: "Reset your Callisto password",
          text:
            "Use this link to reset your Callisto password. It works once and expires in 30 minutes:\n\n" +
            link +
            "\n\nIf you did not ask for this, you can ignore this email.",
          html:
            "<p>Use this link to reset your Callisto password. It works once and expires in 30 minutes.</p>" +
            '<p><a href="' +
            link +
            '">Reset password</a></p>' +
            "<p>If you did not ask for this, you can ignore this email.</p>",
        });
      } catch (err) {
        console.error("Password reset email failed:", err);
      }
    }
  }

  // Same answer whether or not the account exists, so nobody can use this
  // form to find out which emails are registered.
  return NextResponse.json(GENERIC);
}