// Supabase Edge Function: generate-report (DASH-2, R5, DoD)
// Generates pilot impact reports strictly excluding demo records (is_demo = true)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id } = await req.json().catch(() => ({}));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // CRITICAL REQUIREMENT R5: is_demo = true rows MUST be excluded from all real analytics
    let query = supabaseAdmin
      .from("sessions")
      .select("id, client_id, pre_score, post_score, retention_score, is_demo")
      .eq("is_demo", false);

    if (school_id) {
      query = query.eq("school_id", school_id);
    }

    const { data: realSessions, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionsList = realSessions || [];
    const validScores = sessionsList.filter(
      (s) => typeof s.pre_score === "number" && typeof s.post_score === "number"
    );

    const immediateGains = validScores.map((s) => s.post_score - s.pre_score);
    const avgGain =
      immediateGains.length > 0
        ? immediateGains.reduce((a, b) => a + b, 0) / immediateGains.length
        : 0;

    return new Response(
      JSON.stringify({
        ok: true,
        report: {
          school_id: school_id || "ALL_SCHOOLS",
          total_sessions: sessionsList.length,
          avg_learning_gain: Number(avgGain.toFixed(3)),
          demo_data_excluded: true,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
