import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, ArrowLeft, BarChart3, History, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLifeSyncChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import LifeSyncDashboard from "@/components/LifeSyncDashboard";
import ChatHistory from "@/components/ChatHistory";
import FloatingOrb from "@/components/FloatingOrb";
import EmotionSelector, { type EmotionType } from "@/components/EmotionSelector";
import MoodVisualization from "@/components/MoodVisualization";
import CosmicBackground from "@/components/CosmicBackground";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const LifeSyncEnhanced = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatId, setChatId] = useState<string>("");
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>("neutral");
  const [showMoodViz, setShowMoodViz] = useState(false);
  
  const { messages, isLoading, sendMessage } = useLifeSyncChat(chatId);
  
  // Daily log state
  const [sleepHours, setSleepHours] = useState("");
  const [focusHours, setFocusHours] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingChats } = await supabase
      .from("lifesync_chats")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingChats && existingChats.length > 0) {
      setChatId(existingChats[0].id);
    } else {
      const { data: newChat } = await supabase
        .from("lifesync_chats")
        .insert({ user_id: user.id, title: "Reflection" })
        .select()
        .single();
      
      if (newChat) {
        setChatId(newChat.id);
        await supabase
          .from("lifesync_messages")
          .insert({
            chat_id: newChat.id,
            role: "assistant",
            content: "✨ Welcome to your inner sanctuary. I'm Luma, your guide through the cosmos of your mind. How are you feeling in this moment?"
          });
      }
    }
  };

  const loadMessages = async () => {
    const { data: msgs } = await supabase
      .from("lifesync_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at");
    
    if (msgs) {
      setLocalMessages(msgs);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId) return;
    
    await sendMessage(input);
    setInput("");
    loadMessages();
  };

  const handleSaveLog = async () => {
    if (!sleepHours && !focusHours && !energyLevel && !reflection) {
      toast({
        title: "Please fill at least one field",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const moodValue = ["sad", "grateful"].includes(currentEmotion) ? 2 : 
                       ["calm", "joy"].includes(currentEmotion) ? 5 : 
                       currentEmotion === "focus" ? 4 : 3;

      const { error } = await supabase
        .from("lifesync_logs")
        .upsert({
          user_id: user.id,
          log_date: today,
          mood: moodValue,
          sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
          focus_hours: focusHours ? parseFloat(focusHours) : null,
          energy_level: energyLevel ? parseInt(energyLevel) : null,
          notes: reflection,
        }, {
          onConflict: "user_id,log_date"
        });

      if (error) throw error;

      toast({
        title: "✨ Reflection saved",
        description: "Your journey is being recorded in the stars.",
      });

      setSleepHours("");
      setFocusHours("");
      setEnergyLevel("");
      setReflection("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectChat = async (newChatId: string) => {
    setChatId(newChatId);
    setShowHistory(false);
  };

  if (showDashboard) {
    return (
      <div className="min-h-screen nebula-bg relative overflow-hidden">
        <CosmicBackground />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
          <LifeSyncDashboard onClose={() => setShowDashboard(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen nebula-bg relative overflow-hidden">
      <CosmicBackground />

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-b border-inner-primary/20 glass-intense"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-inner-primary/10 transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-7 h-7 text-inner-primary glow-emotion" />
              </motion.div>
              <h1 className="text-3xl font-orbitron font-bold text-gradient-inner">
                LifeSync
              </h1>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Emotion & Orb Panel */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Floating Orb */}
            <Card className="glass-intense p-6 flex flex-col items-center">
              <h3 className="text-sm font-orbitron text-inner-primary mb-4">
                Your Inner Light
              </h3>
              <FloatingOrb emotion={currentEmotion} />
              <p className="text-xs text-muted-foreground mt-4 text-center font-inter-light">
                The orb reflects your current emotional state
              </p>
            </Card>

            {/* Emotion Selector */}
            <Card className="glass-intense p-6">
              <h3 className="text-sm font-orbitron text-inner-primary mb-4">
                How do you feel?
              </h3>
              <EmotionSelector 
                selected={currentEmotion}
                onSelect={setCurrentEmotion}
              />
            </Card>

            {/* Daily Log */}
            <Card className="glass-intense p-6 space-y-4">
              <h3 className="text-lg font-orbitron text-inner-primary">
                Today's Essence
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Sleep (hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="8"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    className="glass-panel border-inner-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Focus (hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="4"
                    value={focusHours}
                    onChange={(e) => setFocusHours(e.target.value)}
                    className="glass-panel border-inner-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Energy (1-5)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="4"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(e.target.value)}
                    className="glass-panel border-inner-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Quick Reflection
                  </label>
                  <Textarea
                    placeholder="What's on your mind..."
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    className="glass-panel border-inner-primary/30 min-h-[80px]"
                  />
                </div>

                <Button 
                  onClick={handleSaveLog}
                  className="w-full gradient-inner hover:opacity-90 text-background font-orbitron"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save to the Cosmos
                </Button>
              </div>
            </Card>

            {/* Insights */}
            <Card className="glass-intense p-4">
              <h3 className="text-sm font-orbitron text-inner-primary mb-3">
                Journey Insights
              </h3>
              <div className="space-y-2">
                <Button 
                  variant="ghost"
                  onClick={() => setShowDashboard(true)}
                  className="w-full justify-start text-sm hover:bg-inner-primary/10 transition-smooth"
                >
                  <BarChart3 className="mr-2 w-4 h-4" /> Analytics
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setShowMoodViz(!showMoodViz)}
                  className="w-full justify-start text-sm hover:bg-inner-primary/10 transition-smooth"
                >
                  <Brain className="mr-2 w-4 h-4" /> Mood Graph
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setShowHistory(true)}
                  className="w-full justify-start text-sm hover:bg-inner-primary/10 transition-smooth"
                >
                  <History className="mr-2 w-4 h-4" /> History
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Chat & Visualization Panel */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-8 space-y-6"
          >
            {/* Mood Visualization */}
            <AnimatePresence>
              {showMoodViz && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <Card className="glass-intense p-6">
                    <h3 className="text-lg font-orbitron text-inner-primary mb-4">
                      Your Emotional Constellation
                    </h3>
                    <MoodVisualization />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Panel */}
            <Card className="glass-intense p-6 flex flex-col h-[calc(100vh-250px)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-inner-primary/20">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 rounded-full bg-gradient-inner flex items-center justify-center glow-inner"
                >
                  <Sparkles className="w-6 h-6 text-background" />
                </motion.div>
                <div>
                  <h3 className="font-orbitron font-semibold text-inner-primary text-lg">
                    Luma
                  </h3>
                  <p className="text-xs text-muted-foreground font-inter-light">
                    Mirror of Your Mind • Guide of the Inner Cosmos
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {localMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                        msg.role === "user"
                          ? "gradient-inner text-background font-medium"
                          : "glass-intense border border-inner-primary/20"
                      }`}
                    >
                      <p className="font-inter-light leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="glass-intense rounded-2xl px-5 py-4 border border-inner-primary/20">
                      <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-inner-primary"
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  placeholder="Share your thoughts with Luma..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || !chatId}
                  className="glass-panel border-inner-primary/30 focus:border-inner-primary font-inter-light"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !chatId}
                  className="gradient-inner hover:opacity-90 text-background shrink-0 w-12 h-12 animate-pulse-glow"
                  style={{ color: "hsl(var(--inner-primary))" }}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent className="glass-intense border-inner-primary/20">
          <SheetHeader>
            <SheetTitle className="font-orbitron text-inner-primary">
              Reflection History
            </SheetTitle>
            <SheetDescription className="font-inter-light">
              Journey through your past conversations
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ChatHistory 
              mode="lifesync"
              onSelectChat={handleSelectChat}
              currentChatId={chatId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LifeSyncEnhanced;
