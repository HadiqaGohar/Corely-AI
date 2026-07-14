import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corely AI — Your All-in-One AI Productivity Workspace",
  description:
    "AI chat, task management, document RAG, workflow automation, and smart notifications in one beautiful workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
