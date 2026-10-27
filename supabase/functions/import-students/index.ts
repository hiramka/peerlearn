// Supabase Edge Function: import-students (CLS-1, CLS-2, CLS-3)
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
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous I, 1, O, 0
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { school_id, students, csv_text } = await req.json();

    if (!school_id) {
      return new Response(JSON.stringify({ error: "school_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedStudents: Array<{ reg_number: string; full_name: string; grade: number; class_stream?: string }> = [];

    if (Array.isArray(students) && students.length > 0) {
      parsedStudents = students;
    } else if (csv_text && typeof csv_text === "string") {
      const lines = csv_text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx];
        });
        const reg = row["reg_number"] || row["admission_number"] || row["adm_no"] || cols[0];
        const name = row["full_name"] || row["name"] || cols[1];
        const gradeVal = parseInt(row["grade"] || row["form"] || cols[2] || "1", 10);
        const stream = row["class_stream"] || row["stream"] || cols[3] || "";
        if (reg && name) {
          parsedStudents.push({
            reg_number: reg,
            full_name: name,
            grade: isNaN(gradeVal) ? 1 : gradeVal,
            class_stream: stream,
          });
        }
      }
    }

    if (parsedStudents.length === 0) {
      return new Response(JSON.stringify({ error: "No valid student records provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const importedResults: Array<{ id: string; reg_number: string; full_name: string; grade: number; setup_code: string }> = [];

    for (const student of parsedStudents) {
      const cleanReg = student.reg_number.trim();
      const setupCode = generateSetupCode();
      const codeHash = await sha256(setupCode);

      // Check existing profile
      const { data: existingProf } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("school_id", school_id)
        .ilike("reg_number", cleanReg)
        .maybeSingle();

      let profileId = existingProf?.id;

      if (!profileId) {
        const { data: newProf, error: pErr } = await supabaseAdmin
          .from("profiles")
          .insert({
            school_id,
            full_name: student.full_name.trim(),
            reg_number: cleanReg,
            grade: Number(student.grade) || 1,
            role: "student",
          })
          .select("id")
          .single();

        if (pErr) continue;
        profileId = newProf.id;

        // Add to school_members
        await supabaseAdmin.from("school_members").insert({
          school_id,
          user_id: profileId,
          role: "student",
        });
      } else {
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: student.full_name.trim(),
            grade: Number(student.grade) || 1,
          })
          .eq("id", profileId);
      }

      // Upsert student_credentials with new setup_code_hash
      await supabaseAdmin.from("student_credentials").upsert({
        user_id: profileId,
        setup_code_hash: codeHash,
        setup_used: false,
        failed_attempts: 0,
        locked_until: null,
      });

      importedResults.push({
        id: profileId,
        reg_number: cleanReg,
        full_name: student.full_name.trim(),
        grade: Number(student.grade) || 1,
        setup_code: setupCode,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        count: importedResults.length,
        students: importedResults,
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
