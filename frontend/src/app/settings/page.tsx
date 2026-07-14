"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { notifications as notifsApi, NotificationPreference, auth } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { loadPrefs(); loadUser(); }, []);

  const loadPrefs = async () => {
    try {
      const data = await notifsApi.getPreferences();
      setPrefs(data);
    } catch {} finally { setLoading(false); }
  };

  const loadUser = () => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("corely_user");
      if (u) {
        const parsed = JSON.parse(u);
        setUserName(parsed.name || "");
        setUserEmail(parsed.email || "");
      }
    }
  };

  const togglePref = (type: string, field: "in_app" | "email") => {
    setPrefs((prev) => prev.map((p) =>
      p.notification_type === type ? { ...p, [field]: !p[field] } : p
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      await notifsApi.updatePreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  };

  const typeLabels: Record<string, { label: string; desc: string }> = {
    task: { label: "Task notifications", desc: "Due dates, completions, and updates" },
    document: { label: "Document notifications", desc: "Uploads, processing, and sharing" },
    chat: { label: "Chat notifications", desc: "New messages and mentions" },
    workflow: { label: "Workflow notifications", desc: "Execution results and errors" },
    system: { label: "System notifications", desc: "Updates and maintenance" },
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Appearance</h2>
          <div className="space-y-3">
            {[{ value: "light", label: "Light", icon: "☀️" }, { value: "dark", label: "Dark", icon: "🌙" }, { value: "system", label: "System", icon: "💻" }].map((opt) => (
              <button key={opt.value} onClick={() => setTheme(opt.value as any)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${theme === opt.value ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:bg-[var(--bg-card-hover)]"}`}>
                <span className="text-lg">{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
                {theme === opt.value && <span className="ml-auto text-[var(--accent)]">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-xl font-bold text-white">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="font-semibold">{userName || "User"}</p>
              <p className="text-sm text-[var(--text-dim)]">{userEmail || "user@example.com"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-dim)] mb-1 block">Display Name</label>
              <input value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
            </div>
            <button onClick={async () => { try { await auth.updateProfile({ name: userName }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {} }} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">Save Profile</button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Change Password</h2>
          <PasswordChangeForm />
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Notification Preferences</h2>
          {loading ? (
            <p className="text-sm text-[var(--text-dim)]">Loading preferences...</p>
          ) : (
            <div className="space-y-3">
              {prefs.map((p) => {
                const info = typeLabels[p.notification_type] || { label: p.notification_type, desc: "" };
                return (
                  <div key={p.notification_type} className="rounded-xl border border-[var(--border)] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">{info.label}</p><p className="text-xs text-[var(--text-dim)]">{info.desc}</p></div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs">
                          <span>In-app</span>
                          <button onClick={() => togglePref(p.notification_type, "in_app")} className={`relative h-5 w-9 rounded-full transition ${p.in_app ? "bg-[var(--accent)]" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${p.in_app ? "left-[18px]" : "left-0.5"}`} />
                          </button>
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <span>Email</span>
                          <button onClick={() => togglePref(p.notification_type, "email")} className={`relative h-5 w-9 rounded-full transition ${p.email ? "bg-[var(--accent)]" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${p.email ? "left-[18px]" : "left-0.5"}`} />
                          </button>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={save} disabled={saving} className="btn-primary rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50">
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">Account</h2>
          <p className="text-sm text-[var(--text-dim)]">Manage your account settings and preferences.</p>
        </div>
      </div>
    </AppLayout>
  );
}

function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleChange = async () => {
    setError("");
    setMsg("");
    if (newPass !== confirm) { setError("Passwords don't match"); return; }
    if (newPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await auth.changePassword(current, newPass);
      setMsg("Password changed successfully!");
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (e: any) {
      setError(e.message || "Failed to change password");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-[var(--text-dim)] mb-1 block">Current Password</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </div>
      <div>
        <label className="text-xs text-[var(--text-dim)] mb-1 block">New Password</label>
        <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </div>
      <div>
        <label className="text-xs text-[var(--text-dim)] mb-1 block">Confirm New Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      <button onClick={handleChange} disabled={loading || !current || !newPass} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
        {loading ? "Changing..." : "Change Password"}
      </button>
    </div>
  );
}
