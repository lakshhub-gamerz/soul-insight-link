import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, History as HistoryIcon, Search, Heart, 
  MessageCircle, Calendar, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CosmicBackground from "@/components/CosmicBackground";

interface QueryHistory {
  id: string;
  title: string;
  created_at: string;
}

interface LifeSyncHistory {
  id: string;
  title: string;
  created_at: string;
}

interface MoodHistory {
  id: string;
  log_date: string;
  mood: number | null;
  energy_level: number | null;
  notes: string | null;
}

const History = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("queries");
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [lifeSyncHistory, setLifeSyncHistory] = useState<LifeSyncHistory[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [queriesRes, lifeSyncRes, moodRes] = await Promise.all([
        supabase
          .from("querynet_chats")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("lifesync_chats")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("lifesync_logs")
          .select("id, log_date, mood, energy_level, notes")
          .eq("user_id", user.id)
          .order("log_date", { ascending: false })
          .limit(50)
      ]);

      if (queriesRes.data) setQueryHistory(queriesRes.data);
      if (lifeSyncRes.data) setLifeSyncHistory(lifeSyncRes.data);
      if (moodRes.data) setMoodHistory(moodRes.data);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-b border-violet-500/20 glass-intense"
      >
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-violet-500/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-violet-400" />
            <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-inner">
              History
            </h1>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 bg-background/50 mb-6">
            <TabsTrigger value="queries" className="data-[state=active]:bg-cyan-500/20">
              <Search className="w-4 h-4 mr-2" />
              Queries
            </TabsTrigger>
            <TabsTrigger value="chats" className="data-[state=active]:bg-violet-500/20">
              <MessageCircle className="w-4 h-4 mr-2" />
              Reflections
            </TabsTrigger>
            <TabsTrigger value="moods" className="data-[state=active]:bg-pink-500/20">
              <Heart className="w-4 h-4 mr-2" />
              Mood Logs
            </TabsTrigger>
          </TabsList>

          {/* Query History */}
          <TabsContent value="queries">
            {loading ? (
              <Card className="glass-intense p-8 text-center">
                <div className="animate-pulse">Loading...</div>
              </Card>
            ) : queryHistory.length === 0 ? (
              <Card className="glass-intense p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No queries yet</p>
                <Button
                  onClick={() => navigate("/querynet")}
                  className="mt-4 gradient-cosmic"
                >
                  Start Searching
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {queryHistory.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="glass-intense p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                      onClick={() => navigate(`/querynet?chat=${item.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Search className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* LifeSync History */}
          <TabsContent value="chats">
            {loading ? (
              <Card className="glass-intense p-8 text-center">
                <div className="animate-pulse">Loading...</div>
              </Card>
            ) : lifeSyncHistory.length === 0 ? (
              <Card className="glass-intense p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reflections yet</p>
                <Button
                  onClick={() => navigate("/lifesync")}
                  className="mt-4 gradient-inner"
                >
                  Start Reflecting
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {lifeSyncHistory.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="glass-intense p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                      onClick={() => navigate(`/lifesync?chat=${item.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-violet-400" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Mood History */}
          <TabsContent value="moods">
            {loading ? (
              <Card className="glass-intense p-8 text-center">
                <div className="animate-pulse">Loading...</div>
              </Card>
            ) : moodHistory.length === 0 ? (
              <Card className="glass-intense p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No mood logs yet</p>
                <Button
                  onClick={() => navigate("/lifesync")}
                  className="mt-4 gradient-inner"
                >
                  Log Your Mood
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {moodHistory.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="glass-intense p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getMoodEmoji(item.mood)}</span>
                          <div>
                            <p className="font-medium">
                              {new Date(item.log_date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "short",
                                day: "numeric"
                              })}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Mood: {item.mood || "-"}/10</p>
                          <p className="text-xs text-muted-foreground">
                            Energy: {item.energy_level || "-"}/10
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default History;
