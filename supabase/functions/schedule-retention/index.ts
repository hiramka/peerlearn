// Supabase Edge Function: schedule-retention (PROOF-3)
// Schedules a 7-day retention check after peer-tutoring session completion
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id, client_id, learner_id, topic_id, session_completed_at, days_delay } = await req.json();

    if (!school_id || !client_id || !learner_id || !topic_id) {
      return new Response(
        JSON.stringify({ error: "school_id, client_id, learner_id, and topic_id are required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sessionAt = session_completed_at ? new Date(session_completed_at) : new Date();
    const delay = typeof days_delay === "number" ? days_delay : 7;
    const dueAt = new Date(sessionAt.getTime() + delay * 24 * 60 * 60 * 1000).toISOString();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update sessions table if session exists, setting retention metadata
    await supabaseAdmin
      .from("sessions")
      .update({
        metadata: {
          retention_check_due: dueAt,
          retention_status: "pending",
        },
      })
      .eq("client_id", client_id);

    return new Response(
      JSON.stringify({
        ok: true,
        client_id,
        learner_id,
        topic_id,
        session_completed_at: sessionAt.toISOString(),
        due_at: dueAt,
        delay_days: delay,
        status: "pending",
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
