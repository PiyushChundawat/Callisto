"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 border border-[var(--line)] p-6">
        <h1 className="text-2xl font-bold">Forgot password</h1>

        {sent ? (
          <>
            <p className="text-sm">
              If that email has an account, a reset link is on its way. It expires in 30 minutes.
              Check your spam folder too.
            </p>
            <Link href="/login" className="text-sm underline">
              Back to log in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm opacity-70">
              Enter your email and we will send you a link to set a new password.
            </p>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={function (event) {
                  setEmail(event.target.value);
                }}
                placeholder="Email"
                className="helios-input"
              />
            </div>
            {error ? <p className="text-sm">{error}</p> : null}
            <button type="submit" className="helios-btn" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <Link href="/login" className="text-sm underline">
              Back to log in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}