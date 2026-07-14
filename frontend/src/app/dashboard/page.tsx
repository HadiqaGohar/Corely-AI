"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { dashboard, suggestions as sugApi, DashboardStats, ActivityItem } from "@/lib/api";
import { DonutChart } from "@/components/Charts";

function ProductivityRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="url(#grad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 50 50)" className="transition-all duration-1000" />
        <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6d5cff" /><stop offset="100%" stopColor="#38bdf8" /></linearGradient></defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold grad">{score}</div>
        <div className="text-[10px] text-[var(--text-dim)]">Score</div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full rounded-t-md bg-gradient-to-t from-[#6d5cff] to-[#38bdf8] transition-all duration-500" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }} />
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [productivity, setProductivity] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [s, p, a, sug] = await Promise.all([
        dashboard.getStats().catch(() => null),
        dashboard.getProductivity().catch(() => null),
        dashboard.getActivity().catch(() => []),
        sugApi.list().catch(() => []),
      ]);
      setStats(s);
      setProductivity(p?.score ?? 0);
      setActivity(a);
      setSuggestions(sug);
    } catch {} finally { setLoading(false); }
  };

  const statCards = [
    { label: "Tasks", value: stats?.tasks_total ?? 0, icon: "📋", href: "/tasks", color: "from-violet-500/10 to-violet-500/5" },
    { label: "Documents", value: stats?.documents_total ?? 0, icon: "📄", href: "/documents", color: "from-blue-500/10 to-blue-500/5" },
    { label: "Chat Sessions", value: stats?.chat_sessions ?? 0, icon: "💬", href: "/chat", color: "from-emerald-500/10 to-emerald-500/5" },
    { label: "Workflows", value: stats?.workflows_total ?? 0, icon: "⚡", href: "/workflows", color: "from-amber-500/10 to-amber-500/5" },
    { label: "Notifications", value: stats?.notifications_unread ?? 0, icon: "🔔", href: "/notifications", color: "from-red-500/10 to-red-500/5" },
    { label: "Suggestions", value: stats?.suggestions_active ?? 0, icon: "💡", href: "/tasks", color: "from-cyan-500/10 to-cyan-500/5" },
  ];

  const statusColors: Record<string, string> = { done: "bg-emerald-400", in_progress: "bg-amber-400", todo: "bg-gray-300" };
  const typeIcons: Record<string, string> = { task: "📋", document: "📄", chat: "💬", notification: "🔔", workflow: "⚡" };

  return (
    <AppLayout>
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
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-xl`}>{s.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 text-sm font-semibold">Productivity Score</h3>
          <div className="flex items-center justify-center"><ProductivityRing score={productivity} /></div>
          <p className="mt-4 text-center text-xs text-[var(--text-dim)]">
            {productivity >= 70 ? "Great work! 💪" : productivity >= 40 ? "Keep going! 🚀" : "Let's get started! ✨"}
          </p>
        </div>
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Task Distribution</h3>
          <div className="flex items-center gap-6">
            <DonutChart
              segments={[
                { label: "To Do", value: stats?.tasks_todo ?? 0, color: "#9ca3af" },
                { label: "In Progress", value: stats?.tasks_in_progress ?? 0, color: "#f59e0b" },
                { label: "Done", value: stats?.tasks_done ?? 0, color: "#10b981" },
              ]}
              size={140}
              thickness={16}
            />
            <div className="flex-1">
              <div className="space-y-2">
                {[
                  { label: "To Do", value: stats?.tasks_todo ?? 0, color: "bg-gray-300" },
                  { label: "In Progress", value: stats?.tasks_in_progress ?? 0, color: "bg-amber-400" },
                  { label: "Done", value: stats?.tasks_done ?? 0, color: "bg-emerald-400" },
                  { label: "Unread Notif.", value: stats?.notifications_unread ?? 0, color: "bg-red-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h3 className="mb-4 text-sm font-semibold">Recent Activity</h3>
        <div className="space-y-2">
          {activity.length === 0 && <p className="text-xs text-[var(--text-dim)]">No recent activity</p>}
          {activity.slice(0, 8).map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--bg-card-hover)]">
              <span className="text-lg">{typeIcons[a.type] || "📋"}</span>
              <span className="flex-1 truncate text-sm">{a.title}</span>
              <span className="text-xs text-[var(--text-dim)]">{new Date(a.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h3 className="mb-4 text-sm font-semibold">💡 AI Suggestions</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {suggestions.slice(0, 3).map((s) => (
              <div key={s.id} className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)]">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.priority === "high" ? "bg-red-100 text-red-600" : s.priority === "low" ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"}`}>{s.priority}</span>
                <p className="mt-2 text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-4">
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
