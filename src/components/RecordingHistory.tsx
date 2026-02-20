import { useEffect } from "react";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { format } from "date-fns";

function getScoreColor(score: number) {
  if (score < 25) return "text-stress-low";
  if (score < 50) return "text-stress-medium";
  if (score < 75) return "text-stress-high";
  return "text-stress-critical";
}

function getScoreBg(score: number) {
  if (score < 25) return "bg-stress-low/10";
  if (score < 50) return "bg-stress-medium/10";
  if (score < 75) return "bg-stress-high/10";
  return "bg-stress-critical/10";
}

export function RecordingHistory({ className = "", onRefresh }: { className?: string; onRefresh?: number }) {
  const { history, loading, refresh } = useAnalysisHistory();

  useEffect(() => {
    if (onRefresh && onRefresh > 0) refresh();
  }, [onRefresh, refresh]);

  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Recording History
        </h3>
      </div>
      {loading ? (
        <div className="p-5 text-sm text-muted-foreground">Loading...</div>
      ) : history.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">No recordings yet. Start your first analysis!</div>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-mono text-foreground">
                  {format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.duration_seconds}s · {entry.status}
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full font-mono text-sm font-semibold ${
                entry.stress_score != null ? getScoreColor(entry.stress_score) : "text-muted-foreground"
              } ${entry.stress_score != null ? getScoreBg(entry.stress_score) : "bg-secondary"}`}>
                {entry.stress_score != null ? Math.round(entry.stress_score) : "..."}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
