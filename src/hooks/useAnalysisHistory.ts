import { useState, useEffect, useCallback } from "react";
import { AnalysisRecord, fetchAnalysisHistory } from "@/lib/stressAnalysis";

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAnalysisHistory(10);
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, loading, refresh };
}
