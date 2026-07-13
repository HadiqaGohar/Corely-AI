"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { notifications as notifApi } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await notifApi.getPreferences();
        setPrefs(data);
      } catch {
        setPrefs({
          task_notifications: true,
          document_notifications: true,
          chat_notifications: true,
          workflow_notifications: true,
          system_notifications: true,
          email_notifications: false,
        });
      }
    })();
  }, []);

  const togglePref = (key: string) => {
    setPrefs((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await notifApi.updatePreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* Profile */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-[var(--text-dim)]">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Notification Preferences</h2>
          {prefs && (
            <div className="space-y-3">
              {[
                { key: "task_notifications", label: "Task notifications", desc: "Due dates, completions, and updates" },
                { key: "document_notifications", label: "Document notifications", desc: "Uploads, processing, and sharing" },
                { key: "chat_notifications", label: "Chat notifications", desc: "New messages and mentions" },
                { key: "workflow_notifications", label: "Workflow notifications", desc: "Execution results and errors" },
                { key: "system_notifications", label: "System notifications", desc: "Updates and maintenance" },
                { key: "email_notifications", label: "Email notifications", desc: "Receive notifications via email" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-[var(--text-dim)]">{item.desc}</p>
                  </div>
                  <button onClick={() => togglePref(item.key)} className={`relative h-6 w-11 rounded-full transition ${prefs[item.key] ? "bg-[var(--accent)]" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[item.key] ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
              <button onClick={savePrefs} disabled={saving} className="btn-primary rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save Preferences"}
              </button>
            </div>
          )}
        </div>

        {/* Account */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">Account</h2>
          <button onClick={logout} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
            Log out
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
