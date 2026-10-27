"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetForm(props: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.token, password: password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  if (!props.token) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-4 border border-[var(--line)] p-6">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-sm">This reset link is missing its token. Please request a new one.</p>
          <Link href="/forgot-password" className="text-sm underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 border border-[var(--line)] p-6">
        <h1 className="text-2xl font-bold">Set a new password</h1>

        {done ? (
          <>
            <p className="text-sm">Your password has been updated.</p>
            <Link href="/login" className="helios-btn text-center">
              Log in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={function (event) {
                  setPassword(event.target.value);
                }}
                placeholder="At least 8 characters"
                className="helios-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="confirm" className="text-sm">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={function (event) {
                  setConfirm(event.target.value);
                }}
                placeholder="Repeat the password"
                className="helios-input"
              />
            </div>
            {error ? <p className="text-sm">{error}</p> : null}
            <button type="submit" className="helios-btn" disabled={loading}>
              {loading ? "Saving..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}