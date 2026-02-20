import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const durationSeconds = parseInt(formData.get("duration") as string || "0");
    const pitchHz = parseFloat(formData.get("pitch_hz") as string || "0");
    const tremorIndex = parseFloat(formData.get("tremor_index") as string || "0");
    const pacingSpm = parseFloat(formData.get("pacing_spm") as string || "0");

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create initial record
    const { data: record, error: insertError } = await supabase
      .from("stress_analyses")
      .insert({
        duration_seconds: durationSeconds,
        pitch_hz: pitchHz,
        tremor_index: tremorIndex,
        pacing_spm: pacingSpm,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Upload audio to storage
    const fileName = `${record.id}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("audio-recordings")
      .upload(fileName, audioFile, { contentType: "audio/webm" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
    }

    const { data: urlData } = supabase.storage
      .from("audio-recordings")
      .getPublicUrl(fileName);

    // 3. Call Lovable AI for stress analysis
    const analysisPrompt = `You are a voice stress analysis AI. Analyze the following acoustic metrics from a voice recording and provide a psychological stress assessment.

Acoustic Metrics:
- Duration: ${durationSeconds} seconds
- Fundamental Frequency (F₀): ${pitchHz.toFixed(1)} Hz
- Tremor Index (micro-tremor deviation): ${tremorIndex.toFixed(3)} σ
- Pacing: ${pacingSpm.toFixed(0)} Syllables Per Minute (SPM)

Normal ranges for reference:
- F₀: 85-180 Hz (male), 165-255 Hz (female). Higher = more tension.
- Tremor Index: < 1.0 σ is normal, 1.0-2.5 elevated, > 2.5 high stress.
- Pacing: 180-220 SPM normal. Higher = rushed/anxious. Lower = fatigued/depressed.

Based on these metrics, provide your analysis using the following JSON tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a clinical voice stress analysis system. You analyze acoustic biometrics to assess psychological stress levels. Always use the provided tool to return structured results." },
          { role: "user", content: analysisPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "stress_analysis_result",
              description: "Return the structured stress analysis result",
              parameters: {
                type: "object",
                properties: {
                  stress_score: {
                    type: "number",
                    description: "Overall stress score from 0-100",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence interval as a percentage 0-100",
                  },
                  trigger_keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Potential stress indicators detected from the acoustic patterns, e.g. 'elevated pitch', 'rapid pacing', 'vocal tremor'",
                  },
                  summary: {
                    type: "string",
                    description: "A 2-3 sentence clinical summary of the stress assessment",
                  },
                },
                required: ["stress_score", "confidence", "trigger_keywords", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "stress_analysis_result" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      // Fallback: basic heuristic analysis
      const heuristicScore = Math.min(100, Math.max(0,
        (tremorIndex > 2 ? 30 : tremorIndex > 1 ? 15 : 0) +
        (pacingSpm > 240 ? 25 : pacingSpm > 220 ? 15 : 0) +
        (pitchHz > 200 ? 20 : pitchHz > 160 ? 10 : 0) +
        Math.random() * 10
      ));

      await supabase
        .from("stress_analyses")
        .update({
          stress_score: Math.round(heuristicScore),
          confidence: 45,
          trigger_keywords: ["limited_data"],
          analysis_summary: "Fallback heuristic analysis — AI unavailable. Score based on acoustic thresholds only.",
          audio_url: urlData.publicUrl,
          status: "completed",
        })
        .eq("id", record.id);

      return new Response(JSON.stringify({ id: record.id, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result = { stress_score: 50, confidence: 50, trigger_keywords: [], summary: "Analysis complete." };

    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI tool call arguments");
      }
    }

    // 4. Update record with results
    await supabase
      .from("stress_analyses")
      .update({
        stress_score: result.stress_score,
        confidence: result.confidence,
        pitch_hz: pitchHz,
        tremor_index: tremorIndex,
        pacing_spm: pacingSpm,
        trigger_keywords: result.trigger_keywords,
        analysis_summary: result.summary,
        audio_url: urlData.publicUrl,
        status: "completed",
      })
      .eq("id", record.id);

    return new Response(JSON.stringify({ id: record.id, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-stress error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
