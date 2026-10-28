"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ emailed: boolean; email: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const signupResponse = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, password: password }),
      });
      const data = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        window.location.assign("/login");
        return;
      }

      setDone({ emailed: data.tpinEmailed === true, email: email });
      setLoading(false);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-4 border border-[var(--line)] p-6">
          <div className="gain pop-in flex h-12 w-12 items-center justify-center self-center rounded-full border border-[var(--line)] text-2xl">
            ✓
          </div>
          <h1 className="text-center text-2xl font-bold">Account created</h1>
          {done.emailed ? (
            <p className="text-sm">
              We emailed a 6-digit TPIN to <b>{done.email}</b>. You need it to authorize every sell,
              so keep it safe. Check your spam folder if you do not see it.
            </p>
          ) : (
            <p className="text-sm">
              We could not email your TPIN right now. You can request it any time from the sell
              screen with “Forgot TPIN”.
            </p>
          )}
          <button
            className="helios-btn btn-anim"
            onClick={function () {
              window.location.assign("/");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 border border-[var(--line)] p-6"
      >
        <h1 className="text-2xl font-bold">Sign up</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm">Name</label>
          <input id="name" type="text" value={name} placeholder="Name" className="helios-input"
            onChange={function (event) { setName(event.target.value); }} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm">Email</label>
          <input id="email" type="email" value={email} placeholder="Email" className="helios-input"
            onChange={function (event) { setEmail(event.target.value); }} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm">Password</label>
          <input id="password" type="password" value={password} placeholder="At least 8 characters" className="helios-input"
            onChange={function (event) { setPassword(event.target.value); }} />
        </div>

        <p className="text-xs opacity-60">
          After you sign up, we email you a 6-digit TPIN. You need it to sell.
        </p>

        {error ? <p className="loss text-sm">{error}</p> : null}
        <button type="submit" className="helios-btn btn-anim" disabled={loading}>
          {loading ? <span className="spinner" aria-hidden /> : null}
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="text-sm">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}