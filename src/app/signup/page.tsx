"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const signupResponse = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, password: password }),
    });

    if (!signupResponse.ok) {
      const body = await signupResponse.json();
      setError(body.error || "Something went wrong");
      return;
    }

    // Signup succeeded — now log the same credentials in immediately
    // so the user never has to type them twice.
    const signInResult = await signIn("credentials", {
      email: email,
      password: password,
      redirect: false,
    });

    if (signInResult?.error) {
      // Very unlikely (account was just created with these exact
      // credentials), but handle it rather than silently failing.
      setError("Account created, but automatic login failed. Please log in.");
      router.push("/login");
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={function (event) {
          setName(event.target.value);
        }}
        placeholder="Name"
      />
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
      <button type="submit">Sign up</button>
    </form>
  );
}