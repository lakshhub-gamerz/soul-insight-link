import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, Brain, Zap, Search, Heart, Calendar, 
  TrendingUp, Clock, CheckCircle, Target, Star,
  ArrowRight, Play, MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CosmicBackground from "@/components/CosmicBackground";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  tasksCompleted: number;
  totalTasks: number;
  moodToday: number | null;
  focusMinutes: number;
  streakDays: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    tasksCompleted: 0,
    totalTasks: 0,
    moodToday: null,
    focusMinutes: 0,
    streakDays: 0
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [motivationalMessage, setMotivationalMessage] = useState("");

  const motivationalMessages = [
    "Every step forward is progress. Keep going!",
    "Your potential is limitless. Embrace it today.",
    "Small consistent actions lead to extraordinary results.",
    "You're building something amazing. Stay focused.",
    "Today is full of possibilities. Make it count."
  ];

  useEffect(() => {
    loadDashboardData();
    setMotivationalMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUserName(profile.full_name || profile.email?.split("@")[0] || "Explorer");
      }

      // Get today's tasks
      const today = new Date().toISOString().split("T")[0];
      const { data: tasks } = await supabase
        .from("tasks")
        .select("status")
        .eq("user_id", user.id);

      const completed = tasks?.filter(t => t.status === "completed").length || 0;
      const total = tasks?.length || 0;

      // Get today's mood
      const { data: moodLog } = await supabase
        .from("lifesync_logs")
        .select("mood")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .maybeSingle();

      // Calculate streak (simplified)
      const { data: recentLogs } = await supabase
        .from("lifesync_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false })
        .limit(30);

      let streak = 0;
      if (recentLogs && recentLogs.length > 0) {
        const dates = recentLogs.map(l => l.log_date);
        const todayDate = new Date();
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(todayDate);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = checkDate.toISOString().split("T")[0];
          if (dates.includes(dateStr)) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }
      }

      setStats({
        tasksCompleted: completed,
        totalTasks: total,
        moodToday: moodLog?.mood || null,
        focusMinutes: Math.floor(Math.random() * 120) + 30, // Placeholder
        streakDays: streak
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const productivityScore = stats.totalTasks > 0 
    ? Math.round((stats.tasksCompleted / stats.totalTasks) * 100) 
    : 0;

  const quickActions = [
    { icon: Zap, label: "Generate Routine", path: "/astra", color: "from-cyan-500 to-blue-500" },
    { icon: Target, label: "Create Tasks", path: "/astra", color: "from-violet-500 to-purple-500" },
    { icon: Search, label: "AI Search", path: "/querynet", color: "from-blue-500 to-indigo-500" },
    { icon: Heart, label: "Mood Check", path: "/lifesync", color: "from-pink-500 to-rose-500" },
  ];

  const getMoodEmoji = (mood: number | null) => {
    if (mood === null) return "❓";
    if (mood >= 8) return "😊";
    if (mood >= 6) return "🙂";
    if (mood >= 4) return "😐";
    if (mood >= 2) return "😔";
    return "😢";
  };

  return (
    <div className="min-h-screen nebula-bg relative overflow-hidden">
      <CosmicBackground />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-gradient-cosmic">
                Welcome back, {loading ? "..." : userName}
              </h1>
              <p className="text-muted-foreground mt-2">{motivationalMessage}</p>
            </div>
            <Button
              onClick={() => navigate("/ai-chat")}
              className="gradient-cosmic hover:opacity-90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with AI
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="glass-intense p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass-intense p-4 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs">Productivity</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-400">{productivityScore}%</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="glass-intense p-4 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span className="text-xs">Today's Mood</span>
                  </div>
                  <p className="text-2xl">{getMoodEmoji(stats.moodToday)}</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="glass-intense p-4 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs">Tasks Done</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.tasksCompleted}/{stats.totalTasks}
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="glass-intense p-4 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs">Day Streak</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.streakDays} 🔥</p>
                </Card>
              </motion.div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-orbitron font-semibold mb-4 text-foreground">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Card
                  className="glass-intense p-6 cursor-pointer group hover:scale-105 transition-all"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-medium text-foreground">{action.label}</p>
                  <ArrowRight className="w-4 h-4 mt-2 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Productivity Progress */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Daily Progress
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Tasks Completed</span>
                    <span className="text-cyan-400">{stats.tasksCompleted}/{stats.totalTasks}</span>
                  </div>
                  <Progress value={productivityScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Focus Time</span>
                    <span className="text-violet-400">{stats.focusMinutes} min</span>
                  </div>
                  <Progress value={(stats.focusMinutes / 120) * 100} className="h-2" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-cyan-500/30 hover:bg-cyan-500/10"
                  onClick={() => navigate("/astra")}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Focus
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-violet-500/30 hover:bg-violet-500/10"
                  onClick={() => navigate("/projects")}
                >
                  <Target className="w-4 h-4 mr-2" />
                  View Projects
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* AI Modules */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                AI Modules
              </h3>
              <div className="space-y-3">
                <Card
                  className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate("/querynet")}
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-8 h-8 text-cyan-400" />
                    <div>
                      <p className="font-medium">Astra - QueryNet</p>
                      <p className="text-xs text-muted-foreground">Knowledge Engine</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate("/lifesync")}
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-8 h-8 text-violet-400" />
                    <div>
                      <p className="font-medium">Luma - LifeSync</p>
                      <p className="text-xs text-muted-foreground">Emotional Engine</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate("/astra")}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-8 h-8 text-emerald-400" />
                    <div>
                      <p className="font-medium">Astra - Productivity</p>
                      <p className="text-xs text-muted-foreground">Task & Focus Engine</p>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
