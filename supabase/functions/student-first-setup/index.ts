// Supabase Edge Function: student-first-setup (AUTH-3)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_code, reg_number, setup_code, pin } = await req.json();
    if (!pin || !/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "PIN must be exactly 6 digits." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("id, school_code")
      .ilike("school_code", school_code.trim())
      .single();

    if (!school) {
      return new Response(JSON.stringify({ error: "Invalid school code." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, reg_number")
      .eq("school_id", school.id)
      .ilike("reg_number", reg_number.trim())
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Registration number not found in this school." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds } = await supabaseAdmin
      .from("student_credentials")
      .select("*")
      .eq("user_id", profile.id)
      .single();

    if (!creds || creds.setup_used) {
      return new Response(JSON.stringify({ error: "Setup code has already been used or expired." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256(setup_code);
    if (creds.setup_code_hash !== hash) {
      return new Response(JSON.stringify({ error: "Incorrect setup code." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update auth.user with synthetic email & PIN password
    const sClean = school.school_code.toLowerCase().replace(/[^a-z0-9]/g, "");
    const rClean = profile.reg_number.toLowerCase().replace(/[^a-z0-9]/g, "");
    const syntheticEmail = `${sClean}.${rClean}@students.peerlearn.invalid`;

    const { error: userErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: pin,
      email: syntheticEmail,
      email_confirm: true,
    });

    if (userErr) {
      // If user doesn't exist in auth.users, create it
      await supabaseAdmin.auth.admin.createUser({
        id: profile.id,
        email: syntheticEmail,
        password: pin,
        email_confirm: true,
      });
    }

    // Mark setup used
    await supabaseAdmin
      .from("student_credentials")
      .update({ setup_used: true, failed_attempts: 0, locked_until: null })
      .eq("user_id", profile.id);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "PIN set successfully. You can now log in.",
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
