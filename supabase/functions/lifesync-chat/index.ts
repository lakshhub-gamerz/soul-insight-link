import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, message } = await req.json();
    
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store user message
    const { error: msgError } = await supabase
      .from("lifesync_messages")
      .insert({ chat_id: chatId, role: "user", content: message });

    if (msgError) throw msgError;

    // Get recent logs for context
    const { data: recentLogs } = await supabase
      .from("lifesync_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(7);

    // Build context from logs
    let logsContext = "";
    if (recentLogs && recentLogs.length > 0) {
      logsContext = "\n\nRecent life data:\n" + recentLogs.map(log => 
        `Date: ${log.log_date}
- Mood: ${log.mood}/5
- Sleep: ${log.sleep_hours}h
- Focus: ${log.focus_hours}h
- Energy: ${log.energy_level}/5
${log.notes ? `- Notes: ${log.notes}` : ''}`
      ).join("\n\n");
    }

    // Get conversation history
    const { data: history } = await supabase
      .from("lifesync_messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages = history || [];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are LUMA, a warm and empathetic AI life coach and reflection companion. Your purpose is to help users understand their habits, emotions, and patterns through supportive conversation.

${logsContext}

Based on the user's life data above, provide:
- Empathetic reflections on their patterns
- Gentle insights about their well-being
- Encouraging suggestions for improvement
- Supportive motivation

Keep responses personal, warm, and actionable. Use their data to give specific, relevant advice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    // Stream and collect response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) fullResponse += content;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    }

    // Store assistant response
    await supabase
      .from("lifesync_messages")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content: fullResponse,
      });

    return new Response(JSON.stringify({ response: fullResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in lifesync-chat:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
