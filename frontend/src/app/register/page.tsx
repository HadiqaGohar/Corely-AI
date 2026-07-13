"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      localStorage.setItem("corely_token", data.token);
      localStorage.setItem("corely_user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Registration failed — backend may not be running");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-[#6d5cff]/5 blur-[120px]" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-sm font-bold text-white">C</span>
            <span className="text-xl font-semibold tracking-tight">Corely<span className="grad">AI</span></span>
          </Link>
        </div>
        <div className="glass rounded-2xl p-8">
          <h1 className="mb-1 text-xl font-bold">Create your account</h1>
          <p className="mb-6 text-sm text-[var(--text-dim)]">Get started with Corely AI</p>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="John Doe" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="you@example.com" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="••••••••" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="••••••••" /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl py-3 text-sm font-medium disabled:opacity-50">{loading ? "Creating account..." : "Create account"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--text-dim)]">Already have an account? <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
