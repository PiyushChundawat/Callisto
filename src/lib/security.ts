import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const MAX_TPIN_FAILS = 5;
const LOCK_MINUTES = 15;
const OTP_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

export type Check = { ok: true } | { ok: false; error: string; status: number };

function pepper(): string {
  const value = process.env.TPIN_PEPPER || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("Set TPIN_PEPPER (or NEXTAUTH_SECRET) in the environment");
  }
  return value;
}

function mac(scope: string, value: string): string {
  return createHmac("sha256", pepper()).update(scope + ":" + value).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sixDigits(): string {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export async function issueTpin(userId: string, email: string) {
  const tpin = sixDigits();
  const tpinHash = mac("tpin:" + userId, tpin);

  await prisma.tpinCredential.upsert({
    where: { userId: userId },
    update: { tpinHash: tpinHash, failedAttempts: 0, issuedAt: new Date() },
    create: { userId: userId, tpinHash: tpinHash },
  });

  await sendEmail({
    to: email,
    subject: "Your Callisto TPIN",
    text:
      "Your Callisto TPIN is " +
      tpin +
      ".\n\nYou need it to authorize every sell order. Never share it with anyone.\n" +
      "If you lose it, use 'Resend TPIN' when selling.",
    html:
      "<p>Your Callisto TPIN is <b style='font-size:20px;letter-spacing:3px'>" +
      tpin +
      "</b></p><p>You need it to authorize every sell order. Never share it with anyone.</p>" +
      "<p>If you lose it, use 'Resend TPIN' when selling.</p>",
  });
}

export async function checkTpin(userId: string, tpin: string): Promise<Check> {
  const credential = await prisma.tpinCredential.findUnique({ where: { userId: userId } });

  if (!credential) {
    return {
      ok: false,
      error: "No TPIN found for your account. Tap 'Resend TPIN' to get one by email.",
      status: 400,
    };
  }

  if (credential.lockedUntil && credential.lockedUntil > new Date()) {
    const minutes = Math.ceil((credential.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      ok: false,
      error: "Too many wrong attempts. Try again in " + minutes + " min.",
      status: 429,
    };
  }

  if (!/^\d{6}$/.test(tpin)) {
    return { ok: false, error: "TPIN must be 6 digits", status: 400 };
  }

  if (sameHash(credential.tpinHash, mac("tpin:" + userId, tpin))) {
    if (credential.failedAttempts > 0) {
      await prisma.tpinCredential.update({
        where: { userId: userId },
        data: { failedAttempts: 0 },
      });
    }
    return { ok: true };
  }

  const updated = await prisma.tpinCredential.update({
    where: { userId: userId },
    data: { failedAttempts: { increment: 1 } },
  });

  if (updated.failedAttempts >= MAX_TPIN_FAILS) {
    await prisma.tpinCredential.update({
      where: { userId: userId },
      data: { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) },
    });
    return {
      ok: false,
      error: "Too many wrong attempts. Locked for " + LOCK_MINUTES + " minutes.",
      status: 429,
    };
  }

  return {
    ok: false,
    error: "Incorrect TPIN. " + (MAX_TPIN_FAILS - updated.failedAttempts) + " attempts left.",
    status: 401,
  };
}

export async function createOtpChallenge(
  userId: string,
  email: string,
  requestHash: string,
  summary: string
): Promise<{ ok: true; challengeId: string } | { ok: false; error: string; status: number }> {
  const recent = await prisma.otpChallenge.count({
    where: { userId: userId, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recent >= 5) {
    return { ok: false, error: "Too many OTP requests. Please wait a few minutes.", status: 429 };
  }

  // Only the newest OTP is valid. Older ones are marked used, not deleted,
  // so they still count toward the rate limit above.
  await prisma.otpChallenge.updateMany({
    where: { userId: userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const id = randomUUID();
  const otp = sixDigits();

  await prisma.otpChallenge.create({
    data: {
      id: id,
      userId: userId,
      purpose: "SELL",
      requestHash: requestHash,
      otpHash: mac("otp:" + id, otp),
      expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000),
    },
  });

  try {
    await sendEmail({
      to: email,
      subject: "Your Callisto OTP",
      text:
        "Your OTP to authorize: " +
        summary +
        "\n\n" +
        otp +
        "\n\nIt expires in " +
        OTP_MINUTES +
        " minutes. If you did not request this, ignore this email.",
      html:
        "<p>Your OTP to authorize: <b>" +
        summary +
        "</b></p><p><b style='font-size:20px;letter-spacing:3px'>" +
        otp +
        "</b></p><p>It expires in " +
        OTP_MINUTES +
        " minutes. If you did not request this, ignore this email.</p>",
    });
  } catch (err) {
    console.error("OTP email failed:", err);
    return { ok: false, error: "Could not send the OTP email. Please try again.", status: 500 };
  }

  return { ok: true, challengeId: id };
}

export async function verifyOtp(
  userId: string,
  challengeId: string,
  otp: string,
  requestHash: string
): Promise<Check> {
  const generic = "This OTP is invalid or expired. Please start the sell again.";

  if (!challengeId || !/^\d{6}$/.test(otp)) {
    return { ok: false, error: "Enter the 6-digit OTP", status: 400 };
  }

  const challenge = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });

  if (
    !challenge ||
    challenge.userId !== userId ||
    challenge.usedAt !== null ||
    challenge.expiresAt < new Date() ||
    challenge.attempts >= MAX_OTP_ATTEMPTS ||
    challenge.requestHash !== requestHash
  ) {
    return { ok: false, error: generic, status: 403 };
  }

  if (sameHash(challenge.otpHash, mac("otp:" + challenge.id, otp))) {
    return { ok: true };
  }

  const updated = await prisma.otpChallenge.update({
    where: { id: challengeId },
    data: { attempts: { increment: 1 } },
  });
  const left = MAX_OTP_ATTEMPTS - updated.attempts;

  return {
    ok: false,
    error: left > 0 ? "Incorrect OTP. " + left + " attempts left." : generic,
    status: 401,
  };
}