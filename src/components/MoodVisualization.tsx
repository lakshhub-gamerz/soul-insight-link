import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MoodNode {
  date: string;
  mood: number;
}

const emotionColors: Record<string, string> = {
  calm: "#4A90E2",
  joy: "#FFD36A",
  focus: "#8AFFEE",
  sad: "#9353FF",
  grateful: "#FF7AF5",
  neutral: "#999999",
};

export default function MoodVisualization() {
  const [nodes, setNodes] = useState<MoodNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoodData();
  }, []);

  const loadMoodData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("log_date", { ascending: true });

      if (data) {
        setNodes(data.map(log => ({
          date: log.log_date,
          mood: log.mood || 3,
        })));
      }
    } catch (error) {
      console.error("Error loading mood data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-inner-primary" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No mood data yet. Start logging your emotions!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 overflow-x-auto">
      <svg width={nodes.length * 80} height="100%" className="min-w-full">
        {/* Connection lines */}
        {nodes.map((node, i) => {
          if (i === nodes.length - 1) return null;
          const x1 = i * 80 + 40;
          const y1 = 150 - (node.mood * 20);
          const x2 = (i + 1) * 80 + 40;
          const y2 = 150 - (nodes[i + 1].mood * 20);
          
          return (
            <motion.line
              key={`line-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#gradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--inner-primary))" />
            <stop offset="100%" stopColor="hsl(var(--inner-accent))" />
          </linearGradient>
        </defs>

        {/* Mood nodes */}
        {nodes.map((node, i) => {
          const x = i * 80 + 40;
          const y = 150 - (node.mood * 20);
          const color = emotionColors.grateful;
          
          return (
            <g key={`node-${i}`}>
              <motion.circle
                cx={x}
                cy={y}
                r="8"
                fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="cursor-pointer"
              >
                <title>{`${node.date}\nMood: ${node.mood}/5`}</title>
              </motion.circle>
              <motion.circle
                cx={x}
                cy={y}
                r="12"
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity="0.3"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
              <text
                x={x}
                y={y + 30}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground"
              >
                {new Date(node.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
