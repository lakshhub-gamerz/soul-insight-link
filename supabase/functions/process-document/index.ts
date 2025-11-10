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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const authHeader = req.headers.get("Authorization")!;

    if (!file) {
      throw new Error("No file provided");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Upload file to storage
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Extract text from file (simplified - in production use proper PDF parser)
    const text = await file.text();
    
    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("querynet_documents")
      .insert({
        user_id: user.id,
        title: file.name,
        file_path: fileName,
        content_type: file.type,
      })
      .select()
      .single();

    if (docError) throw docError;

    // Chunk the text (simple chunking by paragraphs)
    const chunks = text.split("\n\n").filter(chunk => chunk.trim().length > 50);
    
    // Store chunks (without embeddings for now - can be enhanced with OpenAI embeddings)
    const chunkInserts = chunks.slice(0, 20).map((chunk, index) => ({
      document_id: doc.id,
      content: chunk.trim(),
      chunk_index: index,
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkInserts);

    if (chunksError) throw chunksError;

    return new Response(JSON.stringify({ 
      documentId: doc.id,
      title: file.name,
      chunksCount: chunkInserts.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in process-document:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
