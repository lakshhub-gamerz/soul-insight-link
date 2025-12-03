import { useState, useEffect } from "react";
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
  Trash2, Edit, Save, X, ListTodo, Timer, Wand2
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && focusTime > 0) {
      interval = setInterval(() => {
        setFocusTime(prev => prev - 1);
      }, 1000);
    } else if (focusTime === 0) {
      setIsRunning(false);
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

  const resetTimer = () => {
    setIsRunning(false);
    setFocusTime(selectedFocusDuration * 60);
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
            <Card className="glass-intense p-8 max-w-lg mx-auto text-center">
              <h3 className="font-orbitron font-semibold mb-6 text-xl">Focus Mode</h3>
              
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
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - focusTime / (selectedFocusDuration * 60))}
                    className="text-cyan-400 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl font-orbitron font-bold text-cyan-400">
                    {formatTime(focusTime)}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-3 mb-6">
                {[15, 25, 45, 60].map((mins) => (
                  <Button
                    key={mins}
                    variant={selectedFocusDuration === mins ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedFocusDuration(mins);
                      setFocusTime(mins * 60);
                      setIsRunning(false);
                    }}
                    className={selectedFocusDuration === mins ? "gradient-cosmic" : "border-cyan-500/30"}
                  >
                    {mins}m
                  </Button>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => setIsRunning(!isRunning)}
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
            </Card>
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
