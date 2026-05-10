import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leadName, leadEmail, notes } = await req.json();
    const authHeader = req.headers.get('Authorization')!;
    
    // 1. Initialize Supabase Client to fetch the real agent info
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Fetch the authenticated user's profile
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, phone, brokerage_name, reply_to_email')
      .eq('id', user?.id)
      .single();

    const agentName = profile?.full_name || "Your Real Estate Partner";
    const agentPhone = profile?.phone || "";
    const agentBrokerage = profile?.brokerage_name || "";
    
    const signature = `${agentName}\n${agentBrokerage}\nPhone: ${agentPhone}`;

    // 3. AI Generation with FHA Rules + Dynamic Signature
    const apiKey = Deno.env.get("GROQ_API_KEY");
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: `You are a friendly real-estate sales rep. 
            STRICT FHA COMPLIANCE: Never mention race, religion, disability, or familial status.
            RULES: Conversational, under 120 words.
            SIGN OFF WITH THIS EXACT SIGNATURE:
            ${signature}
            
            End every email with: "Reply STOP to unsubscribe."` 
          },
          { role: "user", content: `Write 3 follow-up emails for lead ${leadName} (${leadEmail}). Notes: ${notes}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await resp.json();
    return new Response(data.choices[0].message.content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
