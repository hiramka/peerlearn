// Supabase Edge Function: approve-tutor (SAFE-1, SAFE-2, SAFE-6)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id, actor_id, tutor_id, topic_id, action, reason } = await req.json();

    if (!school_id || !tutor_id || !action) {
      return new Response(JSON.stringify({ error: "school_id, tutor_id, and action ('approve' | 'revoke' | 'suspend' | 'reinstate') are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "approve" || action === "revoke") {
      if (!topic_id) {
        return new Response(JSON.stringify({ error: "topic_id is required for approval or revocation." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const approved = action === "approve";

      // Upsert into user_topics with teacher_approved flag
      const { error: utErr } = await supabaseAdmin
        .from("user_topics")
        .upsert({
          user_id: tutor_id,
          school_id,
          topic_id,
          teacher_approved: approved,
        });

      if (utErr) {
        return new Response(JSON.stringify({ error: "Failed to update tutor approval: " + utErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add to school_members as tutor if approving
      if (approved) {
        await supabaseAdmin
          .from("school_members")
          .upsert({
            school_id,
            user_id: tutor_id,
            role: "tutor",
            status: "active",
          });
      }

      // Audit log
      await supabaseAdmin.from("audit_log").insert({
        school_id,
        actor_id: actor_id ?? null,
        action: approved ? "APPROVE_TUTOR_TOPIC" : "REVOKE_TUTOR_TOPIC",
        target_type: "tutor",
        target_id: tutor_id,
        payload: { topic_id, approved },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          tutor_id,
          topic_id,
          approved,
          message: approved ? "Tutor approved for peer sessions." : "Tutor approval revoked.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (action === "suspend" || action === "reinstate") {
      const suspended = action === "suspend";

      // Update school_members status
      const { error: smErr } = await supabaseAdmin
        .from("school_members")
        .update({ status: suspended ? "suspended" : "active" })
        .eq("school_id", school_id)
        .eq("user_id", tutor_id);

      if (smErr) {
        return new Response(JSON.stringify({ error: "Failed to update tutor suspension: " + smErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Audit log
      await supabaseAdmin.from("audit_log").insert({
        school_id,
        actor_id: actor_id ?? null,
        action: suspended ? "SUSPEND_TUTOR" : "REINSTATE_TUTOR",
        target_type: "tutor",
        target_id: tutor_id,
        payload: { reason },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          tutor_id,
          suspended,
          message: suspended ? "Tutor suspended immediately from all matching." : "Tutor reinstated.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
