// Supabase Edge Function: student-login (AUTH-4 & AUTH-5)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_code, reg_number, pin } = await req.json();
    if (!school_code || !reg_number || !pin) {
      return new Response(JSON.stringify({ error: "school_code, reg_number, and pin required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Resolve school
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .select("id, school_code")
      .ilike("school_code", school_code.trim())
      .single();

    if (schoolErr || !school) {
      return new Response(JSON.stringify({ error: "Invalid school code" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, reg_number, grade")
      .eq("school_id", school.id)
      .ilike("reg_number", reg_number.trim())
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Registration number not found in this school" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check credentials and lockout (AUTH-5)
    const { data: creds, error: credErr } = await supabaseAdmin
      .from("student_credentials")
      .select("*")
      .eq("user_id", profile.id)
      .single();

    if (credErr || !creds) {
      return new Response(JSON.stringify({ error: "Account not activated. Please complete first-time setup." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (creds.locked_until && new Date(creds.locked_until) > new Date()) {
      return new Response(JSON.stringify({ error: "Account locked for 15 minutes due to failed attempts." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Authenticate using synthetic email (AUTH-4)
    const sClean = school.school_code.toLowerCase().replace(/[^a-z0-9]/g, "");
    const rClean = profile.reg_number.toLowerCase().replace(/[^a-z0-9]/g, "");
    const syntheticEmail = `${sClean}.${rClean}@students.peerlearn.invalid`;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
      email: syntheticEmail,
      password: pin,
    });

    if (authErr) {
      // Record failure attempt
      const attempts = (creds.failed_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await supabaseAdmin
        .from("student_credentials")
        .update({ failed_attempts: attempts, locked_until: lockedUntil })
        .eq("user_id", profile.id);

      return new Response(
        JSON.stringify({
          error: attempts >= 5 ? "Account locked for 15 minutes." : `Invalid PIN. ${5 - attempts} attempts left.`,
          locked: attempts >= 5,
        }),
        {
          status: attempts >= 5 ? 403 : 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Reset failed attempts on success
    await supabaseAdmin
      .from("student_credentials")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("user_id", profile.id);

    return new Response(
      JSON.stringify({
        ok: true,
        session: {
          user: {
            id: profile.id,
            full_name: profile.full_name,
            school_id: school.id,
            school_code: school.school_code,
            reg_number: profile.reg_number,
            grade: profile.grade,
          },
          token: authData.session?.access_token,
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
