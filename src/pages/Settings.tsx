import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, Settings as SettingsIcon, Bell, Moon, 
  Target, Music, Save, User, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";

interface UserSettings {
  theme: string;
  notifications_enabled: boolean;
  daily_goal_minutes: number;
  focus_music_enabled: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    theme: "dark",
    notifications_enabled: true,
    daily_goal_minutes: 120,
    focus_music_enabled: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          theme: data.theme || "dark",
          notifications_enabled: data.notifications_enabled ?? true,
          daily_goal_minutes: data.daily_goal_minutes || 120,
          focus_music_enabled: data.focus_music_enabled ?? true
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          ...settings
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast({ title: "Settings saved!" });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error saving settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
              <SettingsIcon className="w-7 h-7 text-violet-400" />
              <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-inner">
                Settings
              </h1>
            </div>
          </div>
          <Button
            onClick={saveSettings}
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
          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <Moon className="w-5 h-5 text-violet-400" />
                Appearance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Theme</p>
                    <p className="text-sm text-muted-foreground">
                      Use dark colors for the interface
                    </p>
                  </div>
                  <Switch
                    checked={settings.theme === "dark"}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, theme: checked ? "dark" : "light" })
                    }
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-violet-400" />
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders and updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, notifications_enabled: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Productivity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-400" />
                Productivity
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Daily Focus Goal (minutes)
                  </label>
                  <Input
                    type="number"
                    value={settings.daily_goal_minutes}
                    onChange={(e) => 
                      setSettings({ ...settings, daily_goal_minutes: parseInt(e.target.value) || 0 })
                    }
                    className="glass-panel border-violet-500/30 mt-1"
                    min={0}
                    max={480}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Focus Music</p>
                    <p className="text-sm text-muted-foreground">
                      Enable ambient sounds during focus
                    </p>
                  </div>
                  <Switch
                    checked={settings.focus_music_enabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, focus_music_enabled: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-intense p-6">
              <h3 className="font-orbitron font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" />
                Account
              </h3>
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="w-full border-violet-500/30"
                >
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
