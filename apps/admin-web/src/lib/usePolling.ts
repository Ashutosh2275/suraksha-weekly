"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePollingResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number): UsePollingResult<T> {
  const fetcherRef = useRef(fetcher);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const next = await fetcherRef.current();
      setData(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Polling request failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, refresh]);

  return { data, error, isLoading, refresh };
}
