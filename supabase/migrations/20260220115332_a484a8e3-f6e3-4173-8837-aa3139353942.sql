
-- Create stress_analyses table
CREATE TABLE public.stress_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER NOT NULL,
  stress_score NUMERIC,
  confidence NUMERIC,
  pitch_hz NUMERIC,
  tremor_index NUMERIC,
  pacing_spm NUMERIC,
  trigger_keywords TEXT[],
  transcript TEXT,
  analysis_summary TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  audio_url TEXT
);

-- Public table, no auth required for MVP
ALTER TABLE public.stress_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analyses"
  ON public.stress_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read analyses"
  ON public.stress_analyses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update analyses"
  ON public.stress_analyses FOR UPDATE
  USING (true);

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-recordings', 'audio-recordings', true);

CREATE POLICY "Anyone can upload audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-recordings');

CREATE POLICY "Anyone can read audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-recordings');
