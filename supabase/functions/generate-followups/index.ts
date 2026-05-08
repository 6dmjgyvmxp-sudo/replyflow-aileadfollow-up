import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leadName, leadEmail, businessContext, notes } = await req.json();
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const system = `You are a warm, friendly sales rep writing follow-up emails for a small business. Write like a human - conversational, brief, no jargon, no "I hope this email finds you well". Sign off with just a first name placeholder [Your name]. Keep each email under 120 words.`;

    const user = `Generate a 3-email follow-up sequence for this lead.
Lead name: ${leadName}
Lead email: ${leadEmail}
${businessContext ? `Business context: ${businessContext}` : ""}
${notes ? `Notes about lead: ${notes}` : ""}

Email 1 (Day 1): Friendly intro + reason for reaching out.
Email 2 (Day 3): Add value (a tip, idea, or short question) - reference no reply gently.
Email 3 (Day 7): Soft breakup - polite, leave door open.`;

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

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});