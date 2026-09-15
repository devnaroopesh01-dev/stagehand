"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is off, session exists immediately.
    if (data.session) {
      router.push("/events");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="max-w-sm mx-auto text-center py-16">
        <h1 className="font-display text-2xl mb-2">Check your inbox</h1>
        <p className="text-muted">
          We sent a confirmation link to {email}. Confirm your email, then log in.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-12">
      <h1 className="font-display text-2xl mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-midnight text-canvas rounded-stub py-2.5 font-medium hover:bg-midnight/90 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-muted mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-marigoldDark font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}