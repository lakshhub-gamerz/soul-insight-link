import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Mail, Save, Calendar, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    email: "",
    full_name: "",
    created_at: ""
  });
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalProjects: 0,
    streakDays: 0
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          email: profileData.email,
          full_name: profileData.full_name || "",
          created_at: profileData.created_at
        });
      }

      // Load stats
      const [tasksRes, projectsRes] = await Promise.all([
        supabase.from("tasks").select("status").eq("user_id", user.id),
        supabase.from("projects").select("id").eq("user_id", user.id)
      ]);

      const tasks = tasksRes.data || [];
      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === "completed").length,
        totalProjects: projectsRes.data?.length || 0,
        streakDays: 7 // Placeholder
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profile.full_name })
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Profile updated!" });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen nebula-bg relative overflow-hidden">
      <CosmicBackground />

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-b border-violet-500/20 glass-intense"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-violet-500/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <User className="w-7 h-7 text-violet-400" />
              <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-inner">
                Profile
              </h1>
            </div>
          </div>
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="gradient-inner"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-intense p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full gradient-inner flex items-center justify-center">
                  <User className="w-10 h-10 text-background" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {profile.full_name || "Explorer"}
                  </h2>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your name"
                    className="glass-panel border-violet-500/30 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <Input
                    value={profile.email}
                    disabled
                    className="glass-panel border-violet-500/30 mt-1 opacity-60"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member Since
                  </label>
                  <Input
                    value={profile.created_at ? formatDate(profile.created_at) : "-"}
                    disabled
                    className="glass-panel border-violet-500/30 mt-1 opacity-60"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Your Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-background/30">
                  <p className="text-3xl font-bold text-cyan-400">{stats.totalTasks}</p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-background/30">
                  <p className="text-3xl font-bold text-green-400">{stats.completedTasks}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-background/30">
                  <p className="text-3xl font-bold text-violet-400">{stats.totalProjects}</p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-background/30">
                  <p className="text-3xl font-bold text-yellow-400">{stats.streakDays} 🔥</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
