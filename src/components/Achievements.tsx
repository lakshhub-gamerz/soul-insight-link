import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { 
  Trophy, Flame, Star, Heart, Moon, Target, Zap, 
  Calendar, Sparkles, Lock, CheckCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  condition: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => number;
  maxProgress: number;
}

interface UserStats {
  totalLogs: number;
  streak: number;
  avgMood: number;
  totalSleep: number;
  totalFocus: number;
  perfectDays: number;
  weeklyLogs: number;
}

const achievements: Achievement[] = [
  {
    id: "first-step",
    name: "First Step",
    description: "Complete your first check-in",
    icon: <Star className="w-6 h-6" />,
    condition: (stats) => stats.totalLogs >= 1,
    progress: (stats) => Math.min(stats.totalLogs, 1),
    maxProgress: 1,
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Log 7 days in a row",
    icon: <Flame className="w-6 h-6" />,
    condition: (stats) => stats.streak >= 7,
    progress: (stats) => Math.min(stats.streak, 7),
    maxProgress: 7,
  },
  {
    id: "mood-master",
    name: "Mood Master",
    description: "Maintain avg mood above 4 for a week",
    icon: <Heart className="w-6 h-6" />,
    condition: (stats) => stats.avgMood >= 4 && stats.weeklyLogs >= 5,
    progress: (stats) => stats.avgMood >= 4 && stats.weeklyLogs >= 5 ? 1 : 0,
    maxProgress: 1,
  },
  {
    id: "sleep-champion",
    name: "Sleep Champion",
    description: "Log 7+ hours of sleep for 5 days",
    icon: <Moon className="w-6 h-6" />,
    condition: (stats) => stats.perfectDays >= 5,
    progress: (stats) => Math.min(stats.perfectDays, 5),
    maxProgress: 5,
  },
  {
    id: "focus-ninja",
    name: "Focus Ninja",
    description: "Accumulate 50 focus hours",
    icon: <Target className="w-6 h-6" />,
    condition: (stats) => stats.totalFocus >= 50,
    progress: (stats) => Math.min(stats.totalFocus, 50),
    maxProgress: 50,
  },
  {
    id: "consistency-king",
    name: "Consistency King",
    description: "Complete 30 check-ins",
    icon: <Calendar className="w-6 h-6" />,
    condition: (stats) => stats.totalLogs >= 30,
    progress: (stats) => Math.min(stats.totalLogs, 30),
    maxProgress: 30,
  },
  {
    id: "energy-surge",
    name: "Energy Surge",
    description: "Log energy level 5 for 3 days",
    icon: <Zap className="w-6 h-6" />,
    condition: (stats) => stats.perfectDays >= 3,
    progress: (stats) => Math.min(stats.perfectDays, 3),
    maxProgress: 3,
  },
  {
    id: "zen-master",
    name: "Zen Master",
    description: "Achieve a 30-day streak",
    icon: <Sparkles className="w-6 h-6" />,
    condition: (stats) => stats.streak >= 30,
    progress: (stats) => Math.min(stats.streak, 30),
    maxProgress: 30,
  },
];

export default function Achievements() {
  const [stats, setStats] = useState<UserStats>({
    totalLogs: 0,
    streak: 0,
    avgMood: 0,
    totalSleep: 0,
    totalFocus: 0,
    perfectDays: 0,
    weeklyLogs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: logs } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false });

      if (logs && logs.length > 0) {
        // Calculate streak
        let streak = 0;
        const today = new Date().toISOString().split("T")[0];
        let checkDate = new Date();
        
        for (const log of logs) {
          const logDate = log.log_date;
          const expectedDate = checkDate.toISOString().split("T")[0];
          
          if (logDate === expectedDate || logDate === today) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (logDate < expectedDate) {
            break;
          }
        }

        // Weekly logs
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyLogs = logs.filter(log => 
          new Date(log.log_date) >= weekAgo
        ).length;

        // Perfect days (sleep >= 7 and energy >= 4)
        const perfectDays = logs.filter(log => 
          (log.sleep_hours || 0) >= 7 && (log.energy_level || 0) >= 4
        ).length;

        // Calculate averages and totals
        const avgMood = logs.reduce((sum, log) => sum + (log.mood || 0), 0) / logs.length;
        const totalSleep = logs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0);
        const totalFocus = logs.reduce((sum, log) => sum + (log.focus_hours || 0), 0);

        setStats({
          totalLogs: logs.length,
          streak,
          avgMood,
          totalSleep,
          totalFocus,
          perfectDays,
          weeklyLogs,
        });
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.condition(stats)).length;

  if (loading) {
    return (
      <Card className="glass-intense p-6 animate-pulse">
        <div className="h-64 bg-inner-primary/10 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="glass-intense p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-inner flex items-center justify-center">
            <Trophy className="w-6 h-6 text-background" />
          </div>
          <div>
            <h3 className="font-orbitron text-lg text-inner-primary">Achievements</h3>
            <p className="text-sm text-muted-foreground">
              {unlockedCount}/{achievements.length} unlocked
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-inner-accent">{stats.streak}🔥</p>
          <p className="text-xs text-muted-foreground">Day streak</p>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 gap-3">
        {achievements.map((achievement, index) => {
          const unlocked = achievement.condition(stats);
          const progress = achievement.progress(stats);
          const progressPercent = (progress / achievement.maxProgress) * 100;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative rounded-xl p-4 transition-all ${
                unlocked 
                  ? "glass-intense border border-inner-primary/30" 
                  : "glass-panel opacity-60"
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                unlocked 
                  ? "bg-gradient-inner text-background" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {unlocked ? achievement.icon : <Lock className="w-5 h-5" />}
              </div>

              {/* Content */}
              <h4 className={`font-orbitron text-sm mb-1 ${
                unlocked ? "text-inner-primary" : "text-muted-foreground"
              }`}>
                {achievement.name}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {achievement.description}
              </p>

              {/* Progress bar */}
              {!unlocked && achievement.maxProgress > 1 && (
                <div className="mt-3">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-inner-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {progress}/{achievement.maxProgress}
                  </p>
                </div>
              )}

              {/* Unlocked indicator */}
              {unlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <CheckCircle className="w-5 h-5 text-inner-accent" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
