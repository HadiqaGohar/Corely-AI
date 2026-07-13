"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState({
    task_notifications: true, document_notifications: true, chat_notifications: true,
    workflow_notifications: true, system_notifications: true, email_notifications: false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => setPrefs(prev => ({ ...prev, [key]: !(prev as any)[key] }));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-xl font-bold text-white">H</div>
            <div><p className="font-semibold">Hadiqa Gohar</p><p className="text-sm text-[var(--text-dim)]">hadiqa@corely.ai</p></div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">Notification Preferences</h2>
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
                <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-[var(--text-dim)]">{item.desc}</p></div>
                <button onClick={() => toggle(item.key)} className={`relative h-6 w-11 rounded-full transition ${prefs[item.key as keyof typeof prefs] ? "bg-[var(--accent)]" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[item.key as keyof typeof prefs] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            <button onClick={save} className="btn-primary rounded-xl px-6 py-2.5 text-sm font-medium">{saved ? "Saved ✓" : "Save Preferences"}</button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">Account</h2>
          <p className="text-sm text-[var(--text-dim)]">Manage your account settings and preferences.</p>
        </div>
      </div>
    </AppLayout>
  );
}
