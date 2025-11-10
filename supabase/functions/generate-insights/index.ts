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
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get last 30 days of logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs } = await supabase
      .from("lifesync_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("log_date", { ascending: false });

    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ 
        insights: "Start logging your daily activities to receive personalized insights!",
        stats: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate statistics
    const stats = {
      avgMood: logs.reduce((sum, log) => sum + (log.mood || 0), 0) / logs.length,
      avgSleep: logs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / logs.length,
      avgFocus: logs.reduce((sum, log) => sum + (log.focus_hours || 0), 0) / logs.length,
      avgEnergy: logs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / logs.length,
      streak: calculateStreak(logs),
      totalLogs: logs.length,
    };

    // Generate AI insights
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const logsContext = logs.slice(0, 14).map(log => 
      `Date: ${log.log_date}, Mood: ${log.mood}/5, Sleep: ${log.sleep_hours}h, Focus: ${log.focus_hours}h, Energy: ${log.energy_level}/5`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are Luma, an empathetic life coach. Analyze the user's recent life patterns and provide 3-4 supportive, actionable insights. Be warm and encouraging."
          },
          {
            role: "user",
            content: `Analyze these recent logs:\n\n${logsContext}\n\nStats:\n- Avg Mood: ${stats.avgMood.toFixed(1)}/5\n- Avg Sleep: ${stats.avgSleep.toFixed(1)}h\n- Avg Focus: ${stats.avgFocus.toFixed(1)}h\n- Avg Energy: ${stats.avgEnergy.toFixed(1)}/5\n- Current Streak: ${stats.streak} days`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    return new Response(JSON.stringify({ insights, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-insights:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calculateStreak(logs: any[]): number {
  if (logs.length === 0) return 0;
  
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  );
  
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentDate = new Date(sortedLogs[0].log_date);
  currentDate.setHours(0, 0, 0, 0);
  
  // Check if there's a log for today or yesterday
  const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1) return 0;
  
  for (let i = 1; i < sortedLogs.length; i++) {
    const prevDate = new Date(sortedLogs[i - 1].log_date);
    const currDate = new Date(sortedLogs[i].log_date);
    const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
