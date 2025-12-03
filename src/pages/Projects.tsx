import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Plus, FolderKanban, Sparkles, Trash2, 
  Edit, Eye, Share2, CheckCircle, Clock, Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  roadmap: any;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
}

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: newTitle,
          description: newDescription || null,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProjects([data, ...projects]);
        setNewTitle("");
        setNewDescription("");
        setShowCreate(false);
        toast({ title: "Project created!" });
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast({ title: "Error creating project", variant: "destructive" });
    }
  };

  const generateRoadmap = async (project: Project) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-roadmap", {
        body: { projectTitle: project.title, projectDescription: project.description }
      });

      if (error) throw error;

      if (data?.roadmap) {
        const { error: updateError } = await supabase
          .from("projects")
          .update({ roadmap: data.roadmap })
          .eq("id", project.id);

        if (!updateError) {
          setProjects(projects.map(p => 
            p.id === project.id ? { ...p, roadmap: data.roadmap } : p
          ));
          toast({ title: "Roadmap generated! ✨" });
        }
      }
    } catch (error) {
      console.error("Error generating roadmap:", error);
      // Fallback roadmap
      const fallbackRoadmap = [
        { phase: "Planning", tasks: ["Define goals", "Research", "Create outline"], status: "pending" },
        { phase: "Development", tasks: ["Build foundation", "Core features", "Testing"], status: "pending" },
        { phase: "Launch", tasks: ["Final review", "Deploy", "Monitor"], status: "pending" }
      ];
      
      const { error: updateError } = await supabase
        .from("projects")
        .update({ roadmap: fallbackRoadmap })
        .eq("id", project.id);

      if (!updateError) {
        setProjects(projects.map(p => 
          p.id === project.id ? { ...p, roadmap: fallbackRoadmap } : p
        ));
        toast({ title: "Basic roadmap created" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
      toast({ title: "Project deleted" });
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const toggleProjectStatus = async (project: Project) => {
    const newStatus = project.status === "completed" ? "active" : "completed";
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id);

      if (error) throw error;
      setProjects(projects.map(p => p.id === project.id ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400 bg-green-400/10";
      case "archived": return "text-gray-400 bg-gray-400/10";
      default: return "text-cyan-400 bg-cyan-400/10";
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
              <FolderKanban className="w-7 h-7 text-cyan-400" />
              <div>
                <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-cosmic">
                  Projects
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Manage your projects
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gradient-cosmic">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-intense p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="glass-intense p-12 text-center">
            <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <Button onClick={() => setShowCreate(true)} className="gradient-cosmic">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="glass-intense p-6 hover:scale-[1.02] transition-transform">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{project.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description || "No description"}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>

                    {project.roadmap && project.roadmap.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Roadmap Progress</p>
                        <div className="flex gap-1">
                          {project.roadmap.map((phase: any, idx: number) => (
                            <div
                              key={idx}
                              className={`h-2 flex-1 rounded-full ${
                                phase.status === "completed" 
                                  ? "bg-cyan-400" 
                                  : "bg-cyan-400/20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-cyan-500/30"
                            onClick={() => setSelectedProject(project)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-intense max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="font-orbitron">{project.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-muted-foreground">{project.description}</p>
                            
                            {project.roadmap && project.roadmap.length > 0 ? (
                              <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Target className="w-4 h-4 text-cyan-400" />
                                  Project Roadmap
                                </h4>
                                {project.roadmap.map((phase: any, idx: number) => (
                                  <Card key={idx} className="p-4 bg-background/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">{phase.phase}</span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        phase.status === "completed" 
                                          ? "bg-green-400/20 text-green-400"
                                          : "bg-cyan-400/20 text-cyan-400"
                                      }`}>
                                        {phase.status}
                                      </span>
                                    </div>
                                    <ul className="space-y-1">
                                      {phase.tasks?.map((task: string, tIdx: number) => (
                                        <li key={tIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                                          <CheckCircle className="w-3 h-3" />
                                          {task}
                                        </li>
                                      ))}
                                    </ul>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-muted-foreground mb-4">No roadmap yet</p>
                                <Button
                                  onClick={() => generateRoadmap(project)}
                                  disabled={isGenerating}
                                  className="gradient-cosmic"
                                >
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  {isGenerating ? "Generating..." : "Generate AI Roadmap"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {!project.roadmap?.length && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateRoadmap(project)}
                          disabled={isGenerating}
                          className="border-violet-500/30"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(project.id)}
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-intense">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Project Title</label>
              <Input
                placeholder="My Awesome Project"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="glass-panel border-cyan-500/30 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <Textarea
                placeholder="What's this project about?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="glass-panel border-cyan-500/30 mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={createProject} className="flex-1 gradient-cosmic">
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
