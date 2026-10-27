// Supabase Edge Function: report-problem (SAFE-4, SAFE-6)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id, reporter_id, match_id, session_id, reason, details } = await req.json();

    if (!school_id || !reporter_id || !reason) {
      return new Response(JSON.stringify({ error: "school_id, reporter_id, and reason are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Insert into reports table (RLS allows school admin / teachers to read)
    const { data: report, error: repErr } = await supabaseAdmin
      .from("reports")
      .insert({
        school_id,
        reporter_id,
        match_id: match_id ?? null,
        reason: reason.trim(),
        status: "open",
      })
      .select("*")
      .single();

    if (repErr) {
      return new Response(JSON.stringify({ error: "Failed to create report: " + repErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into audit_log
    await supabaseAdmin.from("audit_log").insert({
      school_id,
      actor_id: reporter_id,
      action: "SUBMIT_SAFEGUARDING_REPORT",
      target_type: "report",
      target_id: report.id,
      payload: { reason, match_id, details },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        report,
        message: "Your report has been submitted confidentially to your school administration.",
      }),
      {
        status: 201,
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
