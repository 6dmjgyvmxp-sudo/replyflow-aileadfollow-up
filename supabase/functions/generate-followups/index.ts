import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leadName, leadEmail, businessContext, notes, agent } = await req.json();
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const agentName = agent?.full_name || "[Your name]";
    const agentPhone = agent?.phone || "";
    const agentBrokerage = agent?.brokerage_name || "";
    const agentEmail = agent?.reply_to_email || "";

    const signatureLines = [
      agentName,
      agentBrokerage,
      [agentPhone, agentEmail].filter(Boolean).join(" · "),
    ].filter(Boolean).join("\n");

    const system = `You are a warm, friendly real-estate sales rep writing follow-up emails.

STRICT FAIR HOUSING ACT (FHA) COMPLIANCE — NON-NEGOTIABLE:
- NEVER mention or imply anything about race, color, religion, national origin, sex, gender, sexual orientation, disability, or familial status.
- NEVER reference neighborhood demographics, schools' demographics, or "good fit" framing tied to any protected class.
- NEVER use phrases like "perfect for families", "great for singles", "exclusive community", "safe neighborhood", "Christian community", or anything similar.
- Focus only on property features, market conditions, financing, timelines, and the lead's stated needs.

EMAIL RULES:
- Conversational, brief, no jargon, no "I hope this email finds you well".
- Each email under 120 words.
- Sign off with this exact signature block:
${signatureLines}
- End every email body with the mandatory opt-out footer on its own line:
"Reply STOP to unsubscribe."`;

    const user = `Generate a 3-email follow-up sequence for this real-estate lead.
Lead name: ${leadName}
Lead email: ${leadEmail}
${businessContext ? `Business context: ${businessContext}` : ""}
${notes ? `Notes about lead: ${notes}` : ""}

Email 1 (Day 1): Friendly intro + reason for reaching out.
Email 2 (Day 3): Add value (a tip about the market, a question, an idea) - reference no reply gently.
Email 3 (Day 7): Soft breakup - polite, leave door open.

Each body MUST end with the signature block AND the line "Reply STOP to unsubscribe." on a new line.`;

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user + `\n\nReturn ONLY a valid JSON object with this exact shape, no prose, no markdown:\n{"emails":[{"day_offset":1,"subject":"...","body":"..."},{"day_offset":3,"subject":"...","body":"..."},{"day_offset":7,"subject":"...","body":"..."}]}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 401) {
      return new Response(JSON.stringify({ error: "Invalid GROQ_API_KEY." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Groq error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.emails) || parsed.emails.length !== 3) {
      throw new Error("AI did not return 3 emails");
    }

    // Defensive: ensure STOP footer is present in every email body.
    const STOP = "Reply STOP to unsubscribe.";
    parsed.emails = parsed.emails.map((e: any) => {
      const body = String(e.body ?? "");
      return {
        ...e,
        body: body.includes("STOP to unsubscribe") ? body : `${body.trimEnd()}\n\n${STOP}`,
      };
    });

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
