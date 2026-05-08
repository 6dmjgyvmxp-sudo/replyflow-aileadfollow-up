import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { emailId } = await req.json();
    if (!emailId) throw new Error("emailId required");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: email, error: emailErr } = await supabase
      .from("follow_up_emails")
      .select("id, subject, body, lead_id, status")
      .eq("id", emailId)
      .single();
    if (emailErr) throw emailErr;
    if (email.status === "sent" || email.status === "opened" || email.status === "replied") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, name, email")
      .eq("id", email.lead_id)
      .single();
    if (leadErr) throw leadErr;

    const html = email.body
      .split(/\n\n+/)
      .map((p: string) => `<p style="margin:0 0 16px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ReplyFlow <noreply@replyflowai.app>",
        to: [lead.email],
        subject: email.subject,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error", result);
      throw new Error(result?.message || "Resend send failed");
    }

    await supabase
      .from("follow_up_emails")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", emailId);

    await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", lead.id)
      .eq("status", "active");

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});