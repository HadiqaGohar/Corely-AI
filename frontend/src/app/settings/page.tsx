"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { notifications as notifsApi, NotificationPreference } from "@/lib/api";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [saving, setSaving] = useState(false);

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
          <h2 className="text-sm font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-xl font-bold text-white">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="font-semibold">{userName || "User"}</p>
              <p className="text-sm text-[var(--text-dim)]">{userEmail || "user@example.com"}</p>
            </div>
          </div>
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
