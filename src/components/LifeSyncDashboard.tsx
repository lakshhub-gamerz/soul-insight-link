import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Heart, Moon, Focus, Zap, Loader2 } from "lucide-react";

interface DashboardProps {
  onClose: () => void;
}

export default function LifeSyncDashboard({ onClose }: DashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [insights, setInsights] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 30 days of logs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logsData } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("log_date", { ascending: true });

      setLogs(logsData || []);

      // Generate insights
      const { data: insightsData, error } = await supabase.functions.invoke("generate-insights");
      
      if (error) throw error;
      
      if (insightsData) {
        setInsights(insightsData.insights);
        setStats(insightsData.stats);
      }
    } catch (error: any) {
      console.error("Dashboard error:", error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData = logs.map(log => ({
    date: new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: log.mood || 0,
    energy: log.energy_level || 0,
    sleep: log.sleep_hours || 0,
    focus: log.focus_hours || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-inner-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-inner-primary">Your Life Analytics</h2>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-panel p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-inner-primary/20">
                <Heart className="w-5 h-5 text-inner-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Mood</p>
                <p className="text-2xl font-bold">{stats.avgMood.toFixed(1)}</p>
              </div>
            </div>
          </Card>

          <Card className="glass-panel p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Moon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Sleep</p>
                <p className="text-2xl font-bold">{stats.avgSleep.toFixed(1)}h</p>
              </div>
            </div>
          </Card>

          <Card className="glass-panel p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Focus className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Focus</p>
                <p className="text-2xl font-bold">{stats.avgFocus.toFixed(1)}h</p>
              </div>
            </div>
          </Card>

          <Card className="glass-panel p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold">{stats.streak}🔥</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-inner-primary" />
          Mood & Energy Trends
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 5]} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
            <Legend />
            <Line type="monotone" dataKey="mood" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
            <Line type="monotone" dataKey="energy" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24' }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-400" />
            Sleep Pattern
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 12]} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
              <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Focus className="w-5 h-5 text-green-400" />
            Focus Hours
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 12]} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
              <Line type="monotone" dataKey="focus" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {insights && (
        <Card className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-inner-primary" />
            Luma's Insights
          </h3>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-foreground/90">{insights}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
