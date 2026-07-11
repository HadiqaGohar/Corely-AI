"use client";

import { useState } from "react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-xs font-bold text-white">
            C
          </span>
          <span className="text-base font-semibold tracking-tight">
            Corely<span className="grad">AI</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA - TODO: Re-enable auth
        <div className="hidden items-center gap-2 md:flex">
          <a href="/login" className="btn-ghost rounded-full px-4 py-2 text-[13px] font-medium">Log in</a>
          <a href="/register" className="btn-primary rounded-full px-5 py-2 text-[13px] font-medium">Get Started</a>
        </div>
        */}

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:text-[var(--text)] md:hidden"
          aria-label="Menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--border)] bg-white px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
                {l.label}
              </a>
            ))}
          </nav>
          {/* TODO: Re-enable auth
          <div className="mt-4 flex flex-col gap-2">
            <a href="/login" className="btn-ghost rounded-full px-4 py-2.5 text-center text-sm font-medium">Log in</a>
            <a href="/register" className="btn-primary rounded-full px-4 py-2.5 text-center text-sm font-medium">Get Started</a>
          </div>
          */}
        </div>
      )}
    </header>
  );
}
