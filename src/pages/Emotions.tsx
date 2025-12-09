import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Brain, Wind, TrendingUp, Calendar, Sparkles, Sun, Moon, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface MoodLog {
  id: string;
  mood: number;
  energy_level: number;
  sleep_hours: number;
  focus_hours: number;
  notes: string | null;
  log_date: string;
  created_at: string;
}

const moodEmojis = ["😔", "😕", "😐", "🙂", "😊", "😄", "🤩", "😇", "🌟", "✨"];

const breathingPatterns = [
  { name: "Calm", inhale: 4, hold: 4, exhale: 4, rounds: 4, color: "from-blue-500 to-cyan-500" },
  { name: "Energize", inhale: 4, hold: 0, exhale: 2, rounds: 6, color: "from-amber-500 to-orange-500" },
  { name: "Focus", inhale: 4, hold: 7, exhale: 8, rounds: 4, color: "from-violet-500 to-purple-500" },
  { name: "Sleep", inhale: 4, hold: 7, exhale: 8, rounds: 3, color: "from-indigo-500 to-blue-500" },
];

export default function Emotions() {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  
  const [todayLog, setTodayLog] = useState({
    mood: 5,
    energy_level: 5,
    sleep_hours: 7,
    focus_hours: 4,
    notes: "",
  });

  // Breathing state
  const [activeBreathing, setActiveBreathing] = useState<typeof breathingPatterns[0] | null>(null);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breathProgress, setBreathProgress] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (!activeBreathing) return;

    const pattern = activeBreathing;
    const phases = [
      { name: "inhale" as const, duration: pattern.inhale * 1000 },
      ...(pattern.hold > 0 ? [{ name: "hold" as const, duration: pattern.hold * 1000 }] : []),
      { name: "exhale" as const, duration: pattern.exhale * 1000 },
    ];

    let phaseIndex = 0;
    let startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPhase = phases[phaseIndex];
      
      if (elapsed >= currentPhase.duration) {
        phaseIndex = (phaseIndex + 1) % phases.length;
        startTime = Date.now();
        
        if (phaseIndex === 0) {
          if (currentRound >= pattern.rounds) {
            setActiveBreathing(null);
            toast.success("Breathing exercise complete!");
            return;
          }
          setCurrentRound(r => r + 1);
        }
      }

      setBreathPhase(phases[phaseIndex].name);
      setBreathProgress((elapsed / currentPhase.duration) * 100);
    }, 50);

    return () => clearInterval(interval);
  }, [activeBreathing, currentRound]);

  const loadLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", format(subDays(new Date(), 30), "yyyy-MM-dd"))
        .order("log_date", { ascending: false });

      if (error) throw error;
      setLogs(data || []);

      // Check if there's a log for today
      const today = format(new Date(), "yyyy-MM-dd");
      const todayEntry = data?.find(l => l.log_date === today);
      if (todayEntry) {
        setTodayLog({
          mood: todayEntry.mood || 5,
          energy_level: todayEntry.energy_level || 5,
          sleep_hours: todayEntry.sleep_hours || 7,
          focus_hours: todayEntry.focus_hours || 4,
          notes: todayEntry.notes || "",
        });
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveLog = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const existingLog = logs.find(l => l.log_date === today);

      if (existingLog) {
        const { error } = await supabase
          .from("lifesync_logs")
          .update({
            ...todayLog,
            notes: todayLog.notes || null,
          })
          .eq("id", existingLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lifesync_logs").insert({
          user_id: user.id,
          log_date: today,
          ...todayLog,
          notes: todayLog.notes || null,
        });
        if (error) throw error;
      }

      toast.success("Mood logged successfully!");
      loadLogs();
    } catch (error) {
      console.error("Error saving log:", error);
      toast.error("Failed to save mood log");
    } finally {
      setSaving(false);
    }
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      const recentLogs = logs.slice(0, 7);
      const { data } = await supabase.functions.invoke("lifesync-chat", {
        body: {
          chatId: "emotion-analysis",
          message: `Analyze my emotional patterns from the last week:
${recentLogs.map(l => `${l.log_date}: Mood ${l.mood}/10, Energy ${l.energy_level}/10, Sleep ${l.sleep_hours}hrs, Focus ${l.focus_hours}hrs${l.notes ? `, Notes: "${l.notes}"` : ""}`).join("\n")}

Provide:
1. Overall emotional trend
2. Key patterns noticed
3. 2-3 actionable suggestions for improvement
4. A positive affirmation

Keep it supportive and constructive.`,
        },
      });

      if (data?.response) {
        setAiInsights(data.response);
      }
    } catch (error) {
      console.error("Error analyzing:", error);
      toast.error("Failed to analyze mood patterns");
    } finally {
      setAnalyzing(false);
    }
  };

  const startBreathing = (pattern: typeof breathingPatterns[0]) => {
    setActiveBreathing(pattern);
    setBreathPhase("inhale");
    setBreathProgress(0);
    setCurrentRound(1);
  };

  const chartData = logs.slice(0, 14).reverse().map(log => ({
    date: format(new Date(log.log_date), "MMM d"),
    mood: log.mood,
    energy: log.energy_level,
    sleep: log.sleep_hours,
  }));

  const averageMood = logs.length > 0
    ? (logs.reduce((sum, l) => sum + (l.mood || 0), 0) / logs.length).toFixed(1)
    : "0";

  const averageEnergy = logs.length > 0
    ? (logs.reduce((sum, l) => sum + (l.energy_level || 0), 0) / logs.length).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            LifeSync Emotions
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your emotional wellbeing and grow with AI-powered insights
          </p>
        </div>

        <Tabs defaultValue="check-in" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto bg-background/50 border border-white/10">
            <TabsTrigger value="check-in">Check-in</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="breathe">Breathe</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Daily Check-in */}
          <TabsContent value="check-in" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-400" />
                    Daily Emotional Check-in
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mood */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">How are you feeling?</span>
                      <span className="text-2xl">{moodEmojis[todayLog.mood - 1]}</span>
                    </div>
                    <Slider
                      value={[todayLog.mood]}
                      onValueChange={([v]) => setTodayLog(prev => ({ ...prev, mood: v }))}
                      max={10}
                      min={1}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Low</span>
                      <span>{todayLog.mood}/10</span>
                      <span>Great</span>
                    </div>
                  </div>

                  {/* Energy */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium">Energy Level</span>
                    </div>
                    <Slider
                      value={[todayLog.energy_level]}
                      onValueChange={([v]) => setTodayLog(prev => ({ ...prev, energy_level: v }))}
                      max={10}
                      min={1}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Drained</span>
                      <span>{todayLog.energy_level}/10</span>
                      <span>Energized</span>
                    </div>
                  </div>

                  {/* Sleep */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium">Hours of Sleep</span>
                    </div>
                    <Slider
                      value={[todayLog.sleep_hours]}
                      onValueChange={([v]) => setTodayLog(prev => ({ ...prev, sleep_hours: v }))}
                      max={12}
                      min={0}
                      step={0.5}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0h</span>
                      <span>{todayLog.sleep_hours}h</span>
                      <span>12h</span>
                    </div>
                  </div>

                  {/* Focus */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium">Focus Hours</span>
                    </div>
                    <Slider
                      value={[todayLog.focus_hours]}
                      onValueChange={([v]) => setTodayLog(prev => ({ ...prev, focus_hours: v }))}
                      max={12}
                      min={0}
                      step={0.5}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0h</span>
                      <span>{todayLog.focus_hours}h</span>
                      <span>12h</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                    <Textarea
                      placeholder="How was your day? Any thoughts to capture..."
                      value={todayLog.notes}
                      onChange={(e) => setTodayLog(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button
                    onClick={saveLog}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-pink-600 to-violet-600"
                  >
                    {saving ? "Saving..." : "Save Check-in"}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/20 border-pink-500/30">
                    <CardContent className="p-4 text-center">
                      <span className="text-3xl">{moodEmojis[Math.round(parseFloat(averageMood)) - 1]}</span>
                      <p className="text-2xl font-bold mt-2">{averageMood}</p>
                      <p className="text-sm text-muted-foreground">Avg Mood</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/30">
                    <CardContent className="p-4 text-center">
                      <Zap className="w-8 h-8 mx-auto text-amber-400" />
                      <p className="text-2xl font-bold mt-2">{averageEnergy}</p>
                      <p className="text-sm text-muted-foreground">Avg Energy</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Mini Chart */}
                <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-sm">Last 14 Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#666" fontSize={10} />
                          <YAxis domain={[0, 10]} stroke="#666" fontSize={10} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(0,0,0,0.8)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="mood"
                            stroke="#ec4899"
                            fill="url(#moodGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* AI Insights */}
          <TabsContent value="insights" className="mt-6">
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-400" />
                    AI Emotional Analysis
                  </CardTitle>
                  <Button
                    onClick={analyzeWithAI}
                    disabled={analyzing || logs.length === 0}
                    variant="outline"
                    className="border-violet-500/50 hover:bg-violet-500/20"
                  >
                    {analyzing ? "Analyzing..." : "Analyze Patterns"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiInsights ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30 whitespace-pre-wrap">
                      {aiInsights}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {logs.length === 0
                        ? "Start logging your mood to get AI insights"
                        : "Click 'Analyze Patterns' to get personalized insights"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breathing Coach */}
          <TabsContent value="breathe" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pattern Selection */}
              <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-cyan-400" />
                    Breathing Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {breathingPatterns.map((pattern) => (
                      <Button
                        key={pattern.name}
                        onClick={() => startBreathing(pattern)}
                        disabled={!!activeBreathing}
                        variant="outline"
                        className={`h-auto p-4 flex-col items-start border-white/10 hover:border-white/20 ${
                          activeBreathing?.name === pattern.name ? "border-cyan-500 bg-cyan-500/10" : ""
                        }`}
                      >
                        <span className="font-semibold">{pattern.name}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {pattern.inhale}s in • {pattern.hold > 0 ? `${pattern.hold}s hold • ` : ""}{pattern.exhale}s out
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pattern.rounds} rounds
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Breathing */}
              <Card className={`bg-gradient-to-br ${activeBreathing?.color || "from-gray-500 to-gray-600"} border-0 transition-all duration-500`}>
                <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                  {activeBreathing ? (
                    <>
                      <motion.div
                        animate={{
                          scale: breathPhase === "inhale" ? [1, 1.5] : breathPhase === "exhale" ? [1.5, 1] : 1.5,
                        }}
                        transition={{
                          duration: breathPhase === "inhale" ? activeBreathing.inhale : breathPhase === "exhale" ? activeBreathing.exhale : 0.1,
                          ease: "easeInOut",
                        }}
                        className="w-32 h-32 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
                      >
                        <span className="text-2xl font-bold text-white capitalize">
                          {breathPhase}
                        </span>
                      </motion.div>
                      <p className="text-white/80 mt-6">
                        Round {currentRound} of {activeBreathing.rounds}
                      </p>
                      <Button
                        onClick={() => setActiveBreathing(null)}
                        variant="outline"
                        className="mt-4 border-white/30 text-white hover:bg-white/20"
                      >
                        Stop
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-white/70">
                      <Wind className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Select a breathing pattern to begin</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-6">
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Mood History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No mood logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{moodEmojis[(log.mood || 5) - 1]}</span>
                              <div>
                                <p className="font-medium">{format(new Date(log.log_date), "EEEE, MMMM d")}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-pink-400" />
                                    {log.mood}/10
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-amber-400" />
                                    {log.energy_level}/10
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Moon className="w-3 h-3 text-indigo-400" />
                                    {log.sleep_hours}h sleep
                                  </span>
                                </div>
                              </div>
                            </div>
                            {log.notes && (
                              <p className="text-sm text-muted-foreground mt-2 ml-11 italic">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
