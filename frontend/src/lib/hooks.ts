"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/lib/api";

interface UseAsyncOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: UseAsyncOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        if (options.successMessage) toast(options.successMessage, "success");
        options.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const msg = err?.message || "Something went wrong";
        setError(msg);
        toast(options.errorMessage || msg, "error");
        options.onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn, options.successMessage, options.errorMessage]
  );

  return { execute, loading, error };
}

export function useRetry<T>(fn: () => Promise<T>, maxRetries = 2) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lastErr: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await fn();
        return result;
      } catch (err) {
        lastErr = err;
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    const msg = lastErr?.message || "Failed after retries";
    setError(msg);
    toast(msg, "error");
    setLoading(false);
    throw lastErr;
  }, [fn, maxRetries]);

  return { execute, loading, error };
}
