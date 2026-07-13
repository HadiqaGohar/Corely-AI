"use client";

import { useEffect, useState } from "react";
import { dashboard, suggestions } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function ProductivityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke="url(#grad)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6d5cff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold grad">{score}</div>
        <div className="text-[10px] text-[var(--text-dim)]">Score</div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-[#6d5cff] to-[#38bdf8] transition-all duration-500"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-[var(--text-dim)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [productivity, setProductivity] = useState<any>(null);
  const [sugs, setSugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a, p, sug] = await Promise.allSettled([
          dashboard.getStats(),
          dashboard.getActivity(),
          dashboard.getProductivity(),
          suggestions.list(),
        ]);
        if (s.status === "fulfilled") setStats(s.value);
        if (a.status === "fulfilled") setActivity(a.value);
        if (p.status === "fulfilled") setProductivity(p.value);
        if (sug.status === "fulfilled") setSugs(sug.value.slice(0, 3));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    { label: "Tasks", value: stats?.tasks_total ?? 0, icon: "📋", href: "/tasks", color: "from-violet-500/10 to-violet-500/5" },
    { label: "Documents", value: stats?.documents_total ?? 0, icon: "📄", href: "/documents", color: "from-blue-500/10 to-blue-500/5" },
    { label: "Chat Sessions", value: stats?.chat_sessions ?? 0, icon: "💬", href: "/chat", color: "from-emerald-500/10 to-emerald-500/5" },
    { label: "Workflows", value: stats?.workflows_total ?? 0, icon: "⚡", href: "/workflows", color: "from-amber-500/10 to-amber-500/5" },
    { label: "Notifications", value: stats?.unread_notifications ?? 0, icon: "🔔", href: "/notifications", color: "from-red-500/10 to-red-500/5" },
    { label: "Q&A Queries", value: stats?.qa_total ?? 0, icon: "🔍", href: "/documents", color: "from-cyan-500/10 to-cyan-500/5" },
  ];

  const weekData = activity?.task_trend || [
    { label: "Mon", value: 0 }, { label: "Tue", value: 0 }, { label: "Wed", value: 0 },
    { label: "Thu", value: 0 }, { label: "Fri", value: 0 }, { label: "Sat", value: 0 }, { label: "Sun", value: 0 },
  ];

  return (
    <AppLayout>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{getGreeting()} 👋</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">Here&apos;s what&apos;s happening with your workspace.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href} className="glass rounded-2xl p-5 transition-all hover:translate-y-[-2px] group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-dim)]">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-xl`}>
                {s.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Productivity Score */}
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 text-sm font-semibold">Productivity Score</h3>
          <div className="flex items-center justify-center">
            <ProductivityRing score={productivity?.score ?? 0} />
          </div>
          <p className="mt-4 text-center text-xs text-[var(--text-dim)]">
            {productivity?.score >= 80 ? "Excellent work! 🎉" : productivity?.score >= 50 ? "Good progress! 💪" : "Keep going! 🚀"}
          </p>
        </div>

        {/* Task Activity Chart */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Task Activity (Last 7 Days)</h3>
          <BarChart data={weekData} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Recent Tasks */}
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Tasks</h3>
            <Link href="/tasks" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {(activity?.recent_tasks ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--text-dim)]">No tasks yet</p>
            ) : (
              (activity?.recent_tasks ?? []).slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--bg-card-hover)]">
                  <div className={`h-2 w-2 rounded-full ${t.status === "done" ? "bg-emerald-400" : t.status === "in_progress" ? "bg-amber-400" : "bg-gray-300"}`} />
                  <span className="flex-1 truncate text-sm">{t.title}</span>
                  <span className="text-xs text-[var(--text-dim)]">{t.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Documents</h3>
            <Link href="/documents" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {(activity?.recent_documents ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--text-dim)]">No documents yet</p>
            ) : (
              (activity?.recent_documents ?? []).slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--bg-card-hover)]">
                  <span className="text-lg">📄</span>
                  <span className="flex-1 truncate text-sm">{d.title}</span>
                  <span className="text-xs text-[var(--text-dim)]">{d.file_type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {sugs.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 text-sm font-semibold">💡 AI Suggestions</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {sugs.map((s) => (
              <div key={s.id} className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)]">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    s.priority === "high" ? "bg-red-100 text-red-600" : s.priority === "low" ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"
                  }`}>{s.priority}</span>
                </div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          { label: "New Chat", href: "/chat", icon: "💬" },
          { label: "New Task", href: "/tasks", icon: "✅" },
          { label: "Upload Doc", href: "/documents", icon: "📄" },
          { label: "New Workflow", href: "/workflows", icon: "⚡" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="glass flex items-center gap-3 rounded-xl p-4 transition-all hover:translate-y-[-2px]">
            <span className="text-xl">{a.icon}</span>
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
