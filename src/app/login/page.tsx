"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email: email,
      password: password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 border border-[var(--line)] p-6">
        <h1 className="text-2xl font-bold">Log in</h1>
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
        <button type="submit" className="helios-btn">Log in</button>
      </form>
    </div>
  );
}