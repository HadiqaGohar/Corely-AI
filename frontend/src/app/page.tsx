import Header from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: "AI Chat",
    desc: "Multi-provider AI with streaming, file attachments, voice input, and smart context memory across sessions.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Task Management",
    desc: "Kanban boards, drag-and-drop, recurring tasks, subtasks, and natural language task creation.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Document Q&A",
    desc: "Upload any document and ask questions. RAG-powered answers with source attribution and page numbers.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Workflow Automation",
    desc: "Visual drag-and-drop builder with triggers, actions, webhooks, and a template gallery.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: "Notifications",
    desc: "Priority-based alerts with snooze, archiving, background reminders, and smart grouping.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: "AI Suggestions",
    desc: "Smart recommendations based on overdue items, due dates, and your productivity patterns.",
  },
];

const steps = [
  {
    num: "1",
    title: "Sign Up",
    desc: "Create your free account in seconds. No credit card required.",
  },
  {
    num: "2",
    title: "Connect & Upload",
    desc: "Upload documents, connect your AI provider, and import your tasks.",
  },
  {
    num: "3",
    title: "Work Smarter",
    desc: "Let AI handle the heavy lifting while you focus on what matters.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* ── Hero ────────────────────────────── */}
      <section className="relative grid-bg overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-[#6d5cff]/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="fade-up mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs text-[var(--text-dim)] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Multi-provider AI — Gemini · OpenRouter · Ollama
          </div>

          <h1 className="fade-up text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl" style={{ animationDelay: "0.1s" }}>
            Your AI-Powered
            <br />
            <span className="grad">Productivity Hub</span>
          </h1>

          <p className="fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--text-dim)] sm:text-lg" style={{ animationDelay: "0.2s" }}>
            Chat with AI, manage tasks, process documents with RAG, automate
            workflows, and stay organized — all in one workspace.
          </p>

          <div className="fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "0.3s" }}>
            <a
              href="/register"
              className="btn-primary rounded-full px-7 py-3 text-sm font-medium"
            >
              Start for Free →
            </a>
            <a
              href="#features"
              className="btn-ghost rounded-full px-7 py-3 text-sm font-medium"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────── */}
      <section className="border-y border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px md:grid-cols-4">
          {[
            { value: "165+", label: "Features" },
            { value: "3", label: "AI Providers" },
            { value: "16", label: "DB Models" },
            { value: "99.9%", label: "Uptime" },
          ].map((s) => (
            <div key={s.label} className="px-6 py-8 text-center">
              <div className="text-2xl font-bold grad">{s.value}</div>
              <div className="mt-1 text-xs text-[var(--text-dim)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────── */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              Features
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[var(--text-dim)]">
              Six powerful modules that work together seamlessly. Replace your
              entire productivity stack.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass group rounded-2xl p-6 transition-all duration-200 hover:translate-y-[-2px]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#6d5cff]/8 text-[var(--accent)] transition-colors group-hover:bg-[#6d5cff]/12">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-sm font-semibold">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-[var(--text-dim)]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────── */}
      <section id="how" className="border-y border-[var(--border)] bg-white py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              How It Works
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Get Started in Minutes
            </h2>
          </div>

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-sm font-bold grad shadow-sm">
                  {s.num}
                </div>
                <h3 className="mb-2 text-base font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-dim)]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Work Smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--text-dim)]">
            Join thousands of users who have transformed their workflow with
            Corely AI.
          </p>
          <div className="mt-10">
            <a
              href="/register"
              className="btn-primary inline-block rounded-full px-8 py-3.5 text-sm font-medium"
            >
              Get Started for Free
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
