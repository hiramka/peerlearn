// Supabase Edge Function: approve-school (ONB-2, ONB-3, ONB-4)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSchoolCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = clean.slice(0, 3).padEnd(3, "SCH");
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}${rand}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { application_id, approved_by_user_id } = await req.json();

    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch application
    const { data: app, error: appErr } = await supabaseAdmin
      .from("school_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app.status === "approved") {
      return new Response(JSON.stringify({ error: "Application already approved." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique school code
    let schoolCode = generateSchoolCode(app.school_name);
    // Check collision
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("school_code", schoolCode)
        .maybeSingle();
      if (!existing) break;
      schoolCode = generateSchoolCode(app.school_name);
      attempts++;
    }

    // 1. Create School
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .insert({
        name: app.school_name,
        school_code: schoolCode,
        county: app.county,
        is_sandbox: false,
        active: true,
      })
      .select("*")
      .single();

    if (schoolErr) {
      return new Response(JSON.stringify({ error: "Failed to create school tenant: " + schoolErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create Admin Profile if email provided
    let adminProfileId = null;
    if (app.admin_email) {
      // Find or create admin profile
      const { data: adminProf } = await supabaseAdmin
        .from("profiles")
        .insert({
          school_id: school.id,
          full_name: app.admin_name,
          phone_number: app.admin_phone,
          role: "school_admin",
        })
        .select("id")
        .single();

      if (adminProf) {
        adminProfileId = adminProf.id;
        await supabaseAdmin.from("school_members").insert({
          school_id: school.id,
          user_id: adminProf.id,
          role: "school_admin",
        });
      }
    }

    // 3. Update application status
    await supabaseAdmin
      .from("school_applications")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", application_id);

    // 4. Audit Log
    await supabaseAdmin.from("audit_log").insert({
      school_id: school.id,
      actor_id: approved_by_user_id ?? null,
      action: "APPROVE_SCHOOL",
      target_type: "school",
      target_id: school.id,
      payload: { application_id, school_code: schoolCode, school_name: school.name },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        school: {
          id: school.id,
          name: school.name,
          school_code: school.school_code,
          county: school.county,
        },
        message: "School approved and onboarded successfully.",
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
