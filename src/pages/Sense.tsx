import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, Heart, Focus, Sparkles, RefreshCw, CheckCircle2, Clock, Activity, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SenseReading {
  id: string;
  energy_level: number;
  focus_level: number;
  mood_level: number;
  ai_recommendations: string[] | null;
  generated_tasks: { title: string; priority: string; duration: string }[] | null;
  reading_time: string;
  created_at: string;
}

interface GeneratedTask {
  title: string;
  priority: "high" | "medium" | "low";
  duration: string;
  completed?: boolean;
}

export default function Sense() {
  const [readings, setReadings] = useState<SenseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentTasks, setCurrentTasks] = useState<GeneratedTask[]>([]);
  
  const [currentSense, setCurrentSense] = useState({
    energy: 5,
    focus: 5,
    mood: 5,
  });

  useEffect(() => {
    loadReadings();
  }, []);

  const loadReadings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sense_readings")
        .select("*")
        .eq("user_id", user.id)
        .order("reading_time", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const typedReadings = (data || []).map(r => ({
        ...r,
        ai_recommendations: r.ai_recommendations as string[] | null,
        generated_tasks: r.generated_tasks as unknown as GeneratedTask[] | null,
      }));
      
      setReadings(typedReadings);
      
      // Set current tasks from latest reading
      if (typedReadings[0]?.generated_tasks) {
        setCurrentTasks(typedReadings[0].generated_tasks);
      }
    } catch (error) {
      console.error("Error loading readings:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call AI to generate adaptive tasks based on current sense
      const { data: aiData } = await supabase.functions.invoke("lifesync-chat", {
        body: {
          chatId: "sense-tasks",
          message: `Based on my current state:
- Energy: ${currentSense.energy}/10
- Focus: ${currentSense.focus}/10
- Mood: ${currentSense.mood}/10

Generate 3-5 tasks perfectly suited for this state. Consider:
- Low energy = lighter tasks, breaks, self-care
- High energy = challenging tasks, exercise, creative work
- Low focus = short tasks, routine work
- High focus = deep work, complex problems
- Low mood = gentle tasks, social activities
- High mood = ambitious goals, learning

Format as JSON:
{
  "tasks": [{"title": "...", "priority": "high/medium/low", "duration": "15min/30min/1hr/2hr"}],
  "recommendations": ["tip1", "tip2"]
}`,
        },
      });

      let result = {
        tasks: [
          { title: "Take a short break and stretch", priority: "high" as const, duration: "10min" },
          { title: "Review your top priority for today", priority: "medium" as const, duration: "15min" },
          { title: "Clear 3 small tasks from your list", priority: "medium" as const, duration: "30min" },
        ],
        recommendations: [
          "Your current energy suggests focusing on moderate tasks",
          "Consider a quick walk to boost focus",
        ],
      };

      if (aiData?.response) {
        try {
          const jsonMatch = aiData.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            result = { ...result, ...parsed };
          }
        } catch (e) {
          console.log("Using fallback tasks");
        }
      }

      // Save to database
      const { error } = await supabase.from("sense_readings").insert({
        user_id: user.id,
        energy_level: currentSense.energy,
        focus_level: currentSense.focus,
        mood_level: currentSense.mood,
        ai_recommendations: result.recommendations,
        generated_tasks: result.tasks,
      });

      if (error) throw error;

      setCurrentTasks(result.tasks);
      toast.success("Tasks generated based on your current state!");
      loadReadings();
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast.error("Failed to generate tasks");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTaskComplete = (index: number) => {
    setCurrentTasks(prev =>
      prev.map((task, i) =>
        i === index ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const getSenseLevel = (value: number): { label: string; color: string } => {
    if (value <= 3) return { label: "Low", color: "text-rose-400" };
    if (value <= 6) return { label: "Moderate", color: "text-amber-400" };
    return { label: "High", color: "text-emerald-400" };
  };

  const getOverallState = () => {
    const avg = (currentSense.energy + currentSense.focus + currentSense.mood) / 3;
    if (avg <= 3) return { state: "Rest Mode", color: "from-rose-500 to-pink-600", icon: Heart };
    if (avg <= 5) return { state: "Maintenance Mode", color: "from-amber-500 to-orange-600", icon: Activity };
    if (avg <= 7) return { state: "Flow Mode", color: "from-emerald-500 to-green-600", icon: Focus };
    return { state: "Peak Performance", color: "from-violet-500 to-purple-600", icon: Sparkles };
  };

  const overallState = getOverallState();
  const StateIcon = overallState.icon;

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Sense-Based Productivity
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time adaptive task generation based on your current state
          </p>
        </div>

        {/* Current State Card */}
        <Card className={`bg-gradient-to-br ${overallState.color} border-0 overflow-hidden`}>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <StateIcon className="w-10 h-10 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white">{overallState.state}</h2>
                <p className="text-white/80">Your current productivity zone</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {/* Energy */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Energy</span>
                </div>
                <Slider
                  value={[currentSense.energy]}
                  onValueChange={([v]) => setCurrentSense(prev => ({ ...prev, energy: v }))}
                  max={10}
                  min={1}
                  step={1}
                  className="my-4"
                />
                <div className="flex justify-between text-sm text-white/70">
                  <span>Drained</span>
                  <span className="font-bold text-white text-lg">{currentSense.energy}</span>
                  <span>Energized</span>
                </div>
              </div>

              {/* Focus */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Focus className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Focus</span>
                </div>
                <Slider
                  value={[currentSense.focus]}
                  onValueChange={([v]) => setCurrentSense(prev => ({ ...prev, focus: v }))}
                  max={10}
                  min={1}
                  step={1}
                  className="my-4"
                />
                <div className="flex justify-between text-sm text-white/70">
                  <span>Scattered</span>
                  <span className="font-bold text-white text-lg">{currentSense.focus}</span>
                  <span>Laser</span>
                </div>
              </div>

              {/* Mood */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Mood</span>
                </div>
                <Slider
                  value={[currentSense.mood]}
                  onValueChange={([v]) => setCurrentSense(prev => ({ ...prev, mood: v }))}
                  max={10}
                  min={1}
                  step={1}
                  className="my-4"
                />
                <div className="flex justify-between text-sm text-white/70">
                  <span>Low</span>
                  <span className="font-bold text-white text-lg">{currentSense.mood}</span>
                  <span>Great</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={generateTasks}
                disabled={generating}
                size="lg"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Generating Tasks...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Generate Adaptive Tasks
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generated Tasks */}
          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Your Adaptive Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence>
                {currentTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      Adjust your sense levels and generate tasks
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {currentTasks.map((task, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          task.completed
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                        onClick={() => toggleTaskComplete(index)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            task.completed
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-muted-foreground"
                          }`}>
                            {task.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={
                                task.priority === "high" ? "destructive" :
                                task.priority === "medium" ? "default" : "secondary"
                              }>
                                {task.priority}
                              </Badge>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Recent Readings */}
          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Recent Sense Readings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : readings.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No readings yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {readings.slice(0, 5).map((reading) => (
                    <div
                      key={reading.id}
                      className="p-3 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(reading.reading_time), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className={getSenseLevel(reading.energy_level).color}>
                            {reading.energy_level}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Focus className="w-4 h-4 text-blue-400" />
                          <span className={getSenseLevel(reading.focus_level).color}>
                            {reading.focus_level}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-pink-400" />
                          <span className={getSenseLevel(reading.mood_level).color}>
                            {reading.mood_level}
                          </span>
                        </div>
                      </div>
                      {reading.generated_tasks && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {reading.generated_tasks.length} tasks generated
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations */}
        {readings[0]?.ai_recommendations && (
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border-violet-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-violet-400" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {readings[0].ai_recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/10"
                  >
                    <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
