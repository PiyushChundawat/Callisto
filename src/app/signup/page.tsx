"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      if (!signupResponse.ok) {
        const body = await signupResponse.json();
        setError(body.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
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
          <input
            id="name"
            type="text"
            value={name}
            onChange={function (event) {
              setName(event.target.value);
            }}
            placeholder="Name"
            className="helios-input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm">Email</label>
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
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={function (event) {
              setPassword(event.target.value);
            }}
            placeholder="Password"
            className="helios-input"
          />
        </div>
        {error ? <p className="text-sm">{error}</p> : null}
        <button type="submit" className="helios-btn" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}