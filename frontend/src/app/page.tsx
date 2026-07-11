import Header from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  {
    icon: "💬",
    title: "AI Chat",
    description:
      "Multi-provider AI with streaming responses, file attachments, voice input, and smart context memory.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: "✅",
    title: "Task Management",
    description:
      "Kanban boards, drag-and-drop, recurring tasks, subtasks, and natural language task creation.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: "📄",
    title: "Document Q&A",
    description:
      "Upload any document and ask questions. RAG-powered answers with source attribution and page numbers.",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    icon: "⚡",
    title: "Workflow Automation",
    description:
      "Visual drag-and-drop workflow builder with triggers, actions, webhooks, and template gallery.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: "🔔",
    title: "Smart Notifications",
    description:
      "Priority-based notifications with snooze, archiving, and background reminder checks.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: "💡",
    title: "AI Suggestions",
    description:
      "Intelligent task suggestions based on overdue items, due dates, and your productivity patterns.",
    gradient: "from-violet-500 to-indigo-500",
  },
];

const stats = [
  { label: "Features", value: "165+" },
  { label: "AI Providers", value: "3" },
  { label: "DB Models", value: "16" },
  { label: "Uptime", value: "99.9%" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-[var(--text-secondary)] mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Now with multi-provider AI fallback
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Your AI-Powered
            <br />
            <span className="gradient-text">Productivity Hub</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Chat with AI, manage tasks, process documents with RAG, automate
            workflows, and stay organized — all in one beautifully designed
            workspace.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity text-sm"
            >
              Start for Free →
            </a>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-full glass glass-hover text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              See All Features
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-6 glass-hover">
                <div className="text-3xl font-bold gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Six powerful modules that work together seamlessly. Replace your
              entire productivity stack with one tool.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-8 glass-hover group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Get started in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Sign Up",
                desc: "Create your free account in seconds. No credit card required.",
              },
              {
                step: "02",
                title: "Connect & Upload",
                desc: "Upload documents, connect your AI provider, and import your tasks.",
              },
              {
                step: "03",
                title: "Work Smarter",
                desc: "Let AI handle the heavy lifting while you focus on what matters.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-6xl font-bold gradient-text opacity-30 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-blue-500/5" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Boost Your Productivity?
          </h2>
          <p className="text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
            Join thousands of users who have transformed their workflow with
            Corely AI.
          </p>
          <a
            href="/register"
            className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Get Started for Free
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
