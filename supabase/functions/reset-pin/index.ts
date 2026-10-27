// Supabase Edge Function: reset-pin (AUTH-6, R6)
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

function generateSetupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id, reg_number, reset_by_user_id } = await req.json();

    if (!school_id || !reg_number) {
      return new Response(JSON.stringify({ error: "school_id and reg_number required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find student profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, reg_number")
      .eq("school_id", school_id)
      .ilike("reg_number", reg_number.trim())
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Student not found in this school." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new setup code
    const newSetupCode = generateSetupCode();
    const newHash = await sha256(newSetupCode);

    // Update credentials
    const { error: credErr } = await supabaseAdmin
      .from("student_credentials")
      .upsert({
        user_id: profile.id,
        setup_code_hash: newHash,
        setup_used: false,
        failed_attempts: 0,
        locked_until: null,
      });

    if (credErr) {
      return new Response(JSON.stringify({ error: "Failed to reset student credentials." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit log (R6)
    await supabaseAdmin.from("audit_log").insert({
      school_id,
      actor_id: reset_by_user_id ?? null,
      action: "RESET_PIN",
      target_type: "student",
      target_id: profile.id,
      payload: { reg_number: profile.reg_number, full_name: profile.full_name },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        reg_number: profile.reg_number,
        full_name: profile.full_name,
        new_setup_code: newSetupCode,
        message: "PIN reset. Give this setup code to the student to set a new 6-digit PIN.",
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
