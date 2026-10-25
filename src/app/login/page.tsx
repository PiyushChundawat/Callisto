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
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={function (event) {
          setEmail(event.target.value);
        }}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={function (event) {
          setPassword(event.target.value);
        }}
        placeholder="Password"
      />
      {error ? <p>{error}</p> : null}
      <button type="submit">Log in</button>
    </form>
  );
}