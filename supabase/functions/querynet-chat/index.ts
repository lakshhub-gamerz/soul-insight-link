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
    const { chatId, message, documentId } = await req.json();
    
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
      .from("querynet_messages")
      .insert({ chat_id: chatId, role: "user", content: message });

    if (msgError) throw msgError;

    // Get document context if documentId provided
    let context = "";
    let sources: any[] = [];
    
    if (documentId) {
      // TODO: Implement RAG - fetch relevant chunks from document_chunks table
      // For now, we'll use a simple approach
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("content")
        .eq("document_id", documentId)
        .limit(5);
      
      if (chunks && chunks.length > 0) {
        context = chunks.map(c => c.content).join("\n\n");
        sources = chunks.map((c, i) => ({ chunk: i + 1, preview: c.content.substring(0, 100) }));
      }
    }

    // Get conversation history
    const { data: history } = await supabase
      .from("querynet_messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages = history || [];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = context
      ? `You are ASTRA, an analytical AI assistant specialized in understanding and explaining documents and web content. 

Context from document:
${context}

Provide clear, concise answers based on the context above. Always cite which part of the document you're referencing. Keep your tone analytical and precise.`
      : `You are ASTRA, an analytical AI assistant that helps users understand information from the web. Keep answers clear, concise, and well-sourced. Your tone should be analytical and precise.`;

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

    // Stream the response and collect it
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
      .from("querynet_messages")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content: fullResponse,
        sources: sources.length > 0 ? sources : null,
      });

    return new Response(JSON.stringify({ 
      response: fullResponse,
      sources: sources.length > 0 ? sources : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in querynet-chat:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
