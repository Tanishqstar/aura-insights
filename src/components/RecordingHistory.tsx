interface RecordingEntry {
  id: string;
  date: string;
  duration: string;
  stressScore: number;
  status: "completed" | "processing" | "failed";
}

const mockHistory: RecordingEntry[] = [
  { id: "1", date: "2026-02-20 14:32", duration: "0:58", stressScore: 42, status: "completed" },
  { id: "2", date: "2026-02-20 11:15", duration: "1:00", stressScore: 67, status: "completed" },
  { id: "3", date: "2026-02-19 16:45", duration: "0:45", stressScore: 23, status: "completed" },
  { id: "4", date: "2026-02-19 09:30", duration: "0:52", stressScore: 81, status: "completed" },
  { id: "5", date: "2026-02-18 13:20", duration: "1:00", stressScore: 55, status: "completed" },
];

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

export function RecordingHistory({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Recording History
        </h3>
      </div>
      <div className="divide-y divide-border">
        {mockHistory.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-mono text-foreground">{entry.date}</span>
              <span className="text-xs text-muted-foreground">{entry.duration} duration</span>
            </div>
            <div className={`px-3 py-1 rounded-full font-mono text-sm font-semibold ${getScoreColor(entry.stressScore)} ${getScoreBg(entry.stressScore)}`}>
              {entry.stressScore}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
