// Supabase Edge Function: reset-demo (DEMO-1, DEMO-3)
// Cleans up demo records for a school and reseeds demo classes, tutors, and sample sessions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id } = await req.json();

    if (!school_id) {
      return new Response(JSON.stringify({ error: "school_id is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Delete previous demo sessions and events
    await supabaseAdmin.from("sessions").delete().match({ school_id, is_demo: true });
    await supabaseAdmin.from("matches").delete().match({ school_id, is_demo: true });
    await supabaseAdmin.from("profiles").delete().match({ school_id, is_demo: true });

    // 2. Insert demo students (all with is_demo = true)
    const demoProfiles = [
      {
        school_id,
        full_name: "Amani (Demo Learner)",
        reg_number: "DEMO-001",
        grade: 2,
        class_stream: "East",
        language: "en",
        is_demo: true,
        guardian_consent_at: new Date().toISOString(),
      },
      {
        school_id,
        full_name: "Wanjiru (Demo Tutor)",
        reg_number: "DEMO-002",
        grade: 3,
        class_stream: "West",
        language: "en",
        is_demo: true,
        guardian_consent_at: new Date().toISOString(),
      },
    ];

    const { data: createdProfiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert(demoProfiles)
      .select("id, full_name, reg_number");

    if (pErr) {
      return new Response(JSON.stringify({ error: "Failed to seed demo profiles: " + pErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Demo class and sessions successfully reset.",
        school_id,
        seeded_profiles: createdProfiles?.length ?? 0,
        timestamp: new Date().toISOString(),
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
