import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, ArrowLeft, Plus, Play, Pause, RotateCcw, 
  CheckCircle, Clock, Target, Sparkles, Calendar,
  Trash2, Edit, Save, X, ListTodo, Timer, Wand2,
  Volume2, VolumeX, Cloud, TreePine, Waves, Coffee, Music, BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  estimated_minutes: number | null;
  due_date: string | null;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  schedule: any;
  is_active: boolean;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  actual_minutes: number;
  completed: boolean;
  ambient_sound: string | null;
  started_at: string;
  completed_at: string | null;
}

interface FocusStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusMinutes: number;
  currentStreak: number;
  todaySessions: number;
}

const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain", icon: Cloud, url: "https://cdn.pixabay.com/audio/2022/05/13/audio_257112671d.mp3" },
  { id: "forest", name: "Forest", icon: TreePine, url: "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3" },
  { id: "ocean", name: "Ocean", icon: Waves, url: "https://cdn.pixabay.com/audio/2022/06/25/audio_69a61cd6d6.mp3" },
  { id: "cafe", name: "Café", icon: Coffee, url: "https://cdn.pixabay.com/audio/2022/03/10/audio_c7a91f02ad.mp3" },
  { id: "lofi", name: "Lo-Fi", icon: Music, url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
];

const Astra = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);

  // Focus timer state
  const [focusTime, setFocusTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFocusDuration, setSelectedFocusDuration] = useState(25);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Ambient sound state
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Analytics state
  const [focusStats, setFocusStats] = useState<FocusStats>({
    totalSessions: 0,
    completedSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    todaySessions: 0,
  });

  useEffect(() => {
    loadData();
    loadFocusStats();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && focusTime > 0) {
      interval = setInterval(() => {
        setFocusTime(prev => prev - 1);
      }, 1000);
    } else if (focusTime === 0 && isRunning) {
      setIsRunning(false);
      completeFocusSession();
      toast({
        title: "Focus Session Complete! 🎉",
        description: "Great job! Take a short break.",
      });
    }
    return () => clearInterval(interval);
  }, [isRunning, focusTime]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tasksRes, routinesRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("routines").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (routinesRes.data) setRoutines(routinesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: newTaskTitle,
          priority: newTaskPriority,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks([data, ...tasks]);
        setNewTaskTitle("");
        toast({ title: "Task added!" });
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error adding task", variant: "destructive" });
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null
        })
        .eq("id", task.id);

      if (error) throw error;
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
      toast({ title: "Task deleted" });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const generateMicrotasks = async () => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate 5-minute microtasks using AI
      const { data, error } = await supabase.functions.invoke("generate-tasks", {
        body: { type: "microtasks" }
      });

      if (error) throw error;
      
      if (data?.tasks) {
        for (const task of data.tasks) {
          const { data: newTask } = await supabase
            .from("tasks")
            .insert({
              user_id: user.id,
              title: task.title,
              description: task.description,
              priority: task.priority || "medium",
              estimated_minutes: 5,
              status: "pending"
            })
            .select()
            .single();
          
          if (newTask) {
            setTasks(prev => [newTask, ...prev]);
          }
        }
        toast({ title: "Microtasks generated! ✨" });
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      // Fallback: generate simple tasks
      const fallbackTasks = [
        "Take 5 deep breaths",
        "Drink a glass of water",
        "Stretch for 2 minutes",
        "Write down 3 things you're grateful for",
        "Clear your desk"
      ];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        for (const title of fallbackTasks) {
          const { data: newTask } = await supabase
            .from("tasks")
            .insert({
              user_id: user.id,
              title,
              estimated_minutes: 5,
              priority: "low",
              status: "pending"
            })
            .select()
            .single();
          
          if (newTask) {
            setTasks(prev => [newTask, ...prev]);
          }
        }
        toast({ title: "Quick tasks added!" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetTimer = async () => {
    if (currentSessionId) {
      // Cancel current session
      await supabase
        .from("focus_sessions")
        .delete()
        .eq("id", currentSessionId);
    }
    setIsRunning(false);
    setFocusTime(selectedFocusDuration * 60);
    setCurrentSessionId(null);
    setSessionStartTime(null);
    stopAmbientSound();
  };

  const startFocusSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("focus_sessions")
        .insert({
          user_id: user.id,
          duration_minutes: selectedFocusDuration,
          ambient_sound: selectedSound,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentSessionId(data.id);
        setSessionStartTime(new Date());
        setIsRunning(true);
        playAmbientSound();
      }
    } catch (error) {
      console.error("Error starting session:", error);
      setIsRunning(true); // Still run even if tracking fails
    }
  };

  const completeFocusSession = async () => {
    if (!currentSessionId || !sessionStartTime) return;
    
    try {
      const actualMinutes = Math.round((Date.now() - sessionStartTime.getTime()) / 60000);
      
      await supabase
        .from("focus_sessions")
        .update({
          completed: true,
          actual_minutes: actualMinutes,
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentSessionId);

      setCurrentSessionId(null);
      setSessionStartTime(null);
      stopAmbientSound();
      loadFocusStats();
    } catch (error) {
      console.error("Error completing session:", error);
    }
  };

  const loadFocusStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessions } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (sessions) {
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(
          s => new Date(s.started_at).toDateString() === today
        );

        // Calculate streak (consecutive days with completed sessions)
        let streak = 0;
        const days = new Set(
          sessions
            .filter(s => s.completed)
            .map(s => new Date(s.started_at).toDateString())
        );
        
        const currentDate = new Date();
        while (days.has(currentDate.toDateString())) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        }

        setFocusStats({
          totalSessions: sessions.length,
          completedSessions: sessions.filter(s => s.completed).length,
          totalFocusMinutes: sessions
            .filter(s => s.completed)
            .reduce((sum, s) => sum + (s.actual_minutes || 0), 0),
          currentStreak: streak,
          todaySessions: todaySessions.filter(s => s.completed).length,
        });
      }
    } catch (error) {
      console.error("Error loading focus stats:", error);
    }
  };

  const playAmbientSound = () => {
    if (!selectedSound || isMuted) return;
    
    const sound = AMBIENT_SOUNDS.find(s => s.id === selectedSound);
    if (!sound) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(sound.url);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;
    audioRef.current.play().catch(console.error);
  };

  const stopAmbientSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const toggleSound = (soundId: string) => {
    if (selectedSound === soundId) {
      setSelectedSound(null);
      stopAmbientSound();
    } else {
      setSelectedSound(soundId);
      if (isRunning && !isMuted) {
        const sound = AMBIENT_SOUNDS.find(s => s.id === soundId);
        if (sound) {
          if (audioRef.current) audioRef.current.pause();
          audioRef.current = new Audio(sound.url);
          audioRef.current.loop = true;
          audioRef.current.volume = volume;
          audioRef.current.play().catch(console.error);
        }
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      if (!isMuted) {
        audioRef.current.pause();
      } else if (isRunning && selectedSound) {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-400 bg-red-400/10";
      case "high": return "text-orange-400 bg-orange-400/10";
      case "medium": return "text-yellow-400 bg-yellow-400/10";
      default: return "text-green-400 bg-green-400/10";
    }
  };

  return (
    <div className="min-h-screen nebula-bg relative overflow-hidden">
      <CosmicBackground />

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-b border-cyan-500/20 glass-intense"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-cyan-500/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-7 h-7 text-cyan-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-cosmic">
                  Astra
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Productivity Engine
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate("/projects")}
            variant="outline"
            className="border-cyan-500/30 hover:bg-cyan-500/10"
          >
            <Target className="w-4 h-4 mr-2" />
            Projects
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 bg-background/50 w-full max-w-md mx-auto">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-cyan-500/20">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="focus" className="data-[state=active]:bg-cyan-500/20">
              <Timer className="w-4 h-4 mr-2" />
              Focus
            </TabsTrigger>
            <TabsTrigger value="routines" className="data-[state=active]:bg-cyan-500/20">
              <Calendar className="w-4 h-4 mr-2" />
              Routines
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Add Task */}
              <Card className="glass-intense p-6">
                <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-400" />
                  Add Task
                </h3>
                <div className="space-y-4">
                  <Input
                    placeholder="What needs to be done?"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTask()}
                    className="glass-panel border-cyan-500/30"
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full p-2 rounded-md bg-background/50 border border-cyan-500/30 text-foreground"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <Button onClick={addTask} className="w-full gradient-cosmic">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>

                <div className="mt-6 pt-6 border-t border-cyan-500/20">
                  <Button
                    onClick={generateMicrotasks}
                    disabled={isGenerating}
                    variant="outline"
                    className="w-full border-violet-500/30 hover:bg-violet-500/10"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate 5-Min Tasks"}
                  </Button>
                </div>
              </Card>

              {/* Task List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron font-semibold">Your Tasks</h3>
                  <span className="text-sm text-muted-foreground">
                    {tasks.filter(t => t.status === "completed").length}/{tasks.length} completed
                  </span>
                </div>

                {loading ? (
                  <Card className="glass-intense p-8 text-center">
                    <div className="animate-pulse">Loading tasks...</div>
                  </Card>
                ) : tasks.length === 0 ? (
                  <Card className="glass-intense p-8 text-center">
                    <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No tasks yet. Add your first task!</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                        >
                          <Card className={`glass-intense p-4 ${task.status === "completed" ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => toggleTaskStatus(task)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  task.status === "completed"
                                    ? "bg-cyan-500 border-cyan-500"
                                    : "border-cyan-500/50 hover:border-cyan-500"
                                }`}
                              >
                                {task.status === "completed" && (
                                  <CheckCircle className="w-4 h-4 text-background" />
                                )}
                              </button>
                              <div className="flex-1">
                                <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">{task.description}</p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTask(task.id)}
                                className="text-red-400 hover:bg-red-400/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Focus Tab */}
          <TabsContent value="focus">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Timer */}
              <Card className="glass-intense p-8 lg:col-span-2 text-center">
                <h3 className="font-orbitron font-semibold mb-6 text-xl flex items-center justify-center gap-2">
                  <Timer className="w-6 h-6 text-cyan-400" />
                  Focus Mode
                </h3>
                
                <div className="relative w-64 h-64 mx-auto mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="128"
                      cy="128"
                      r="120"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-cyan-500/20"
                    />
                    <motion.circle
                      cx="128"
                      cy="128"
                      r="120"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 120}
                      strokeDashoffset={2 * Math.PI * 120 * (1 - focusTime / (selectedFocusDuration * 60))}
                      className="text-cyan-400"
                      strokeLinecap="round"
                      animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - focusTime / (selectedFocusDuration * 60)) }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-orbitron font-bold text-cyan-400">
                      {formatTime(focusTime)}
                    </span>
                    {isRunning && (
                      <span className="text-xs text-muted-foreground mt-2">
                        {selectedSound ? `Playing: ${AMBIENT_SOUNDS.find(s => s.id === selectedSound)?.name}` : "No sound"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration Selection */}
                <div className="flex justify-center gap-3 mb-6">
                  {[15, 25, 45, 60].map((mins) => (
                    <Button
                      key={mins}
                      variant={selectedFocusDuration === mins ? "default" : "outline"}
                      size="sm"
                      disabled={isRunning}
                      onClick={() => {
                        setSelectedFocusDuration(mins);
                        setFocusTime(mins * 60);
                      }}
                      className={selectedFocusDuration === mins ? "gradient-cosmic" : "border-cyan-500/30"}
                    >
                      {mins}m
                    </Button>
                  ))}
                </div>

                {/* Control Buttons */}
                <div className="flex justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => {
                      if (isRunning) {
                        setIsRunning(false);
                        stopAmbientSound();
                      } else {
                        startFocusSession();
                      }
                    }}
                    className="gradient-cosmic"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetTimer}
                    className="border-cyan-500/30"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </div>

                {/* Ambient Sounds */}
                <div className="mt-8 pt-6 border-t border-cyan-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Ambient Sounds</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="h-8 w-8"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {AMBIENT_SOUNDS.map((sound) => {
                      const Icon = sound.icon;
                      return (
                        <Button
                          key={sound.id}
                          variant={selectedSound === sound.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleSound(sound.id)}
                          className={`${selectedSound === sound.id ? "gradient-cosmic" : "border-cyan-500/30"}`}
                        >
                          <Icon className="w-4 h-4 mr-1" />
                          {sound.name}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Volume Slider */}
                  {selectedSound && !isMuted && (
                    <div className="mt-4 flex items-center gap-3 justify-center">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-32 accent-cyan-400"
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Analytics Panel */}
              <Card className="glass-intense p-6">
                <h3 className="font-orbitron font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Focus Analytics
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-background/30">
                    <div className="text-3xl font-orbitron font-bold text-cyan-400">
                      {focusStats.currentStreak}
                    </div>
                    <div className="text-sm text-muted-foreground">Day Streak 🔥</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/30 text-center">
                      <div className="text-xl font-semibold">{focusStats.todaySessions}</div>
                      <div className="text-xs text-muted-foreground">Today</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/30 text-center">
                      <div className="text-xl font-semibold">{focusStats.completedSessions}</div>
                      <div className="text-xs text-muted-foreground">Total Sessions</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-background/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Total Focus Time</span>
                      <Clock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-semibold">
                      {Math.floor(focusStats.totalFocusMinutes / 60)}h {focusStats.totalFocusMinutes % 60}m
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-background/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Completion Rate</span>
                      <Target className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-semibold text-green-400">
                      {focusStats.totalSessions > 0 
                        ? Math.round((focusStats.completedSessions / focusStats.totalSessions) * 100)
                        : 0}%
                    </div>
                    <Progress 
                      value={focusStats.totalSessions > 0 
                        ? (focusStats.completedSessions / focusStats.totalSessions) * 100
                        : 0} 
                      className="mt-2 h-2" 
                    />
                  </div>

                  <div className="pt-4 border-t border-cyan-500/20">
                    <h4 className="text-sm font-medium mb-3">Quick Tips</h4>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-cyan-400" />
                        Use the Pomodoro technique: 25 min focus, 5 min break
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-cyan-400" />
                        Try ambient sounds to improve concentration
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-cyan-400" />
                        Build your streak for consistent productivity
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Routines Tab */}
          <TabsContent value="routines">
            <Card className="glass-intense p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-orbitron font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  Daily Routines
                </h3>
                <Button className="gradient-cosmic" onClick={() => setIsGenerating(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Routine
                </Button>
              </div>

              {routines.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No routines yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create a routine to build consistent habits
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {routines.map((routine) => (
                    <Card key={routine.id} className="p-4 bg-background/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{routine.title}</p>
                          {routine.description && (
                            <p className="text-sm text-muted-foreground">{routine.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${routine.is_active ? "bg-green-400/20 text-green-400" : "bg-gray-400/20 text-gray-400"}`}>
                          {routine.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Astra;
