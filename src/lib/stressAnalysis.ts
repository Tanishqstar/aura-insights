import { supabase } from "@/integrations/supabase/client";

export interface StressAnalysisResult {
  id: string;
  stress_score: number;
  confidence: number;
  trigger_keywords: string[];
  summary: string;
  fallback?: boolean;
}

export interface AnalysisRecord {
  id: string;
  created_at: string;
  duration_seconds: number;
  stress_score: number | null;
  confidence: number | null;
  pitch_hz: number | null;
  tremor_index: number | null;
  pacing_spm: number | null;
  trigger_keywords: string[] | null;
  transcript: string | null;
  analysis_summary: string | null;
  status: string;
  audio_url: string | null;
}

export async function submitForAnalysis(
  audioBlob: Blob,
  duration: number,
  metrics: { pitchHz: number; tremorIndex: number; pacingSpm: number }
): Promise<StressAnalysisResult> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("duration", duration.toString());
  formData.append("pitch_hz", metrics.pitchHz.toString());
  formData.append("tremor_index", metrics.tremorIndex.toString());
  formData.append("pacing_spm", metrics.pacingSpm.toString());

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-stress`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Analysis failed");
  }

  return response.json();
}

export async function fetchAnalysisHistory(limit = 10): Promise<AnalysisRecord[]> {
  const { data, error } = await supabase
    .from("stress_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AnalysisRecord[];
}

export async function pollAnalysisStatus(id: string): Promise<AnalysisRecord | null> {
  const { data, error } = await supabase
    .from("stress_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as AnalysisRecord;
}
