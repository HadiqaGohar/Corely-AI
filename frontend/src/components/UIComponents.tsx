"use client";

export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <svg className={`animate-spin text-[var(--accent)] ${sizes[size]} ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-16 text-center">
      <div className="mb-4 text-5xl">{icon}</div>
      <p className="text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--text-dim)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass rounded-2xl p-16 text-center">
      <div className="mb-4 text-5xl">⚠️</div>
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 btn-primary rounded-xl px-4 py-2 text-sm font-medium">Try Again</button>
      )}
    </div>
  );
}
