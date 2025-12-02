import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown, Minus, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeekData {
  weekStart: string;
  weekEnd: string;
  avgMood: number;
  avgEnergy: number;
  avgSleep: number;
  avgFocus: number;
  totalLogs: number;
  moodTrend: "up" | "down" | "stable";
  energyTrend: "up" | "down" | "stable";
}

export default function WeeklyInsights() {
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeekData();
  }, [weekOffset]);

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate week bounds
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() - (weekOffset * 7));
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Previous week for comparison
      const prevWeekStart = new Date(startOfWeek);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(startOfWeek);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

      // Fetch current week logs
      const { data: currentLogs } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", startOfWeek.toISOString().split("T")[0])
        .lte("log_date", endOfWeek.toISOString().split("T")[0]);

      // Fetch previous week logs
      const { data: prevLogs } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", prevWeekStart.toISOString().split("T")[0])
        .lte("log_date", prevWeekEnd.toISOString().split("T")[0]);

      if (currentLogs) {
        const avgMood = currentLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / (currentLogs.length || 1);
        const avgEnergy = currentLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / (currentLogs.length || 1);
        const avgSleep = currentLogs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / (currentLogs.length || 1);
        const avgFocus = currentLogs.reduce((sum, log) => sum + (log.focus_hours || 0), 0) / (currentLogs.length || 1);

        // Calculate trends
        const prevAvgMood = prevLogs?.length 
          ? prevLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / prevLogs.length 
          : avgMood;
        const prevAvgEnergy = prevLogs?.length 
          ? prevLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / prevLogs.length 
          : avgEnergy;

        const moodDiff = avgMood - prevAvgMood;
        const energyDiff = avgEnergy - prevAvgEnergy;

        setWeekData({
          weekStart: startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weekEnd: endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avgMood: avgMood || 0,
          avgEnergy: avgEnergy || 0,
          avgSleep: avgSleep || 0,
          avgFocus: avgFocus || 0,
          totalLogs: currentLogs.length,
          moodTrend: moodDiff > 0.3 ? "up" : moodDiff < -0.3 ? "down" : "stable",
          energyTrend: energyDiff > 0.3 ? "up" : energyDiff < -0.3 ? "down" : "stable",
        });
      }
    } catch (error) {
      console.error("Error loading week data:", error);
    } finally {
      setLoading(false);
    }
  };

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4.5) return "😊";
    if (mood >= 3.5) return "🙂";
    if (mood >= 2.5) return "😐";
    if (mood >= 1.5) return "😔";
    return "😢";
  };

  if (loading) {
    return (
      <Card className="glass-intense p-6 animate-pulse">
        <div className="h-48 bg-inner-primary/10 rounded-lg" />
      </Card>
    );
  }

  if (!weekData || weekData.totalLogs === 0) {
    return (
      <Card className="glass-intense p-6 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-inner-primary/50" />
        <p className="text-muted-foreground">No logs for this week yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start checking in to see your weekly insights
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass-intense p-6 space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="hover:bg-inner-primary/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h3 className="font-orbitron text-inner-primary">
            {weekData.weekStart} - {weekData.weekEnd}
          </h3>
          <p className="text-xs text-muted-foreground">
            {weekOffset === 0 ? "This Week" : `${weekOffset} week${weekOffset > 1 ? "s" : ""} ago`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="hover:bg-inner-primary/10"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <span className="text-6xl mb-2 block">{getMoodEmoji(weekData.avgMood)}</span>
        <p className="text-lg font-medium text-foreground">
          {weekData.avgMood >= 4 ? "Great week!" : 
           weekData.avgMood >= 3 ? "Balanced week" : 
           weekData.avgMood >= 2 ? "Challenging week" : "Tough week"}
        </p>
        <p className="text-sm text-muted-foreground">
          {weekData.totalLogs} check-in{weekData.totalLogs !== 1 ? "s" : ""} recorded
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Avg Mood</span>
            <TrendIcon trend={weekData.moodTrend} />
          </div>
          <p className="text-2xl font-bold text-inner-primary">
            {weekData.avgMood.toFixed(1)}
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Avg Energy</span>
            <TrendIcon trend={weekData.energyTrend} />
          </div>
          <p className="text-2xl font-bold text-inner-accent">
            {weekData.avgEnergy.toFixed(1)}
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4">
          <span className="text-xs text-muted-foreground">Avg Sleep</span>
          <p className="text-2xl font-bold text-emotion-calm">
            {weekData.avgSleep.toFixed(1)}h
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4">
          <span className="text-xs text-muted-foreground">Avg Focus</span>
          <p className="text-2xl font-bold text-emotion-focus">
            {weekData.avgFocus.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* AI Insight Teaser */}
      <div className="glass-panel rounded-xl p-4 border border-inner-primary/20">
        <div className="flex items-center gap-2 text-inner-primary mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-orbitron">Weekly Pattern</span>
        </div>
        <p className="text-sm text-foreground/80">
          {weekData.avgMood >= 4 && weekData.avgSleep >= 7 
            ? "Good sleep is correlating with your positive mood. Keep it up!"
            : weekData.avgMood < 3 && weekData.avgSleep < 6
            ? "Your mood might improve with more sleep. Try going to bed 30 minutes earlier."
            : weekData.avgFocus >= 5
            ? "Strong focus this week! Remember to balance deep work with rest."
            : "Consistency is key. Try to log your emotions at the same time each day."}
        </p>
      </div>
    </Card>
  );
}
