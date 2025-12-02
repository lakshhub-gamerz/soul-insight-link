import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MoodNode {
  date: string;
  mood: number;
  energy: number;
}

const moodColors = [
  "hsl(var(--emotion-sad))",      // 1
  "hsl(var(--emotion-neutral))",  // 2
  "hsl(var(--emotion-calm))",     // 3
  "hsl(var(--emotion-focus))",    // 4
  "hsl(var(--emotion-joy))",      // 5
];

const moodEmojis = ["😢", "😕", "😐", "🙂", "😊"];

export default function MoodVisualization() {
  const [nodes, setNodes] = useState<MoodNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

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
          energy: log.energy_level || 3,
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

  const width = Math.max(nodes.length * 60, 400);
  const height = 200;
  const padding = { top: 30, bottom: 40, left: 20, right: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (i: number) => padding.left + (i / (nodes.length - 1 || 1)) * chartWidth;
  const yScale = (mood: number) => padding.top + chartHeight - ((mood - 1) / 4) * chartHeight;

  // Generate smooth path
  const generatePath = () => {
    if (nodes.length < 2) return "";
    
    const points = nodes.map((node, i) => ({
      x: xScale(i),
      y: yScale(node.mood),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x + (cpx - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpx + (curr.x - cpx) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  // Generate area fill path
  const generateAreaPath = () => {
    if (nodes.length < 2) return "";
    const linePath = generatePath();
    const lastX = xScale(nodes.length - 1);
    const firstX = xScale(0);
    return `${linePath} L ${lastX} ${height - padding.bottom} L ${firstX} ${height - padding.bottom} Z`;
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        <defs>
          {/* Gradient for line */}
          <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--inner-primary))" />
            <stop offset="50%" stopColor="hsl(var(--inner-accent))" />
            <stop offset="100%" stopColor="hsl(var(--inner-primary))" />
          </linearGradient>
          
          {/* Gradient for area */}
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--inner-primary) / 0.3)" />
            <stop offset="100%" stopColor="hsl(var(--inner-primary) / 0)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((level) => (
          <line
            key={level}
            x1={padding.left}
            y1={yScale(level)}
            x2={width - padding.right}
            y2={yScale(level)}
            stroke="hsl(var(--inner-primary) / 0.1)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <motion.path
          d={generateAreaPath()}
          fill="url(#areaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Main line */}
        <motion.path
          d={generatePath()}
          fill="none"
          stroke="url(#moodGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Mood nodes */}
        {nodes.map((node, i) => {
          const x = xScale(i);
          const y = yScale(node.mood);
          const color = moodColors[node.mood - 1] || moodColors[2];
          const isHovered = hoveredNode === i;
          
          return (
            <g 
              key={`node-${i}`}
              onMouseEnter={() => setHoveredNode(i)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              {/* Outer glow ring */}
              <motion.circle
                cx={x}
                cy={y}
                r={isHovered ? 18 : 12}
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity={isHovered ? 0.5 : 0.2}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: isHovered ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: isHovered ? 1 : 0.3,
                  repeat: isHovered ? Infinity : 0,
                }}
              />

              {/* Main dot */}
              <motion.circle
                cx={x}
                cy={y}
                r={isHovered ? 10 : 6}
                fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              />

              {/* Tooltip */}
              {isHovered && (
                <motion.g
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <rect
                    x={x - 50}
                    y={y - 55}
                    width={100}
                    height={40}
                    rx={8}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--inner-primary) / 0.3)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={y - 38}
                    textAnchor="middle"
                    className="text-xs fill-foreground font-medium"
                  >
                    {new Date(node.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                  <text
                    x={x}
                    y={y - 22}
                    textAnchor="middle"
                    className="text-sm fill-inner-primary font-orbitron"
                  >
                    {moodEmojis[node.mood - 1]} Mood: {node.mood}/5
                  </text>
                </motion.g>
              )}

              {/* Date label (only show every few) */}
              {(i % Math.ceil(nodes.length / 7) === 0 || i === nodes.length - 1) && (
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground"
                >
                  {new Date(node.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              )}
            </g>
          );
        })}

        {/* Y-axis labels */}
        {[1, 3, 5].map((level) => (
          <text
            key={`label-${level}`}
            x={padding.left - 5}
            y={yScale(level) + 4}
            textAnchor="end"
            className="text-[10px] fill-muted-foreground"
          >
            {moodEmojis[level - 1]}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-emotion-sad" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-emotion-calm" /> Neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-emotion-joy" /> Great
        </span>
      </div>
    </div>
  );
}
