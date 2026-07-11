"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Corely<span className="gradient-text">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            Pricing
          </a>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-[var(--text-secondary)] hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-[var(--border-color)]">
          <nav className="flex flex-col px-6 py-4 gap-4">
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Pricing
            </a>
            <hr className="border-[var(--border-color)]" />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-center hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
