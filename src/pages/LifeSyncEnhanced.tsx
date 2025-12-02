import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Send, ArrowLeft, BarChart3, History, Brain, 
  Wind, BookOpen, CheckCircle, MessageCircle, Trophy, CalendarDays
} from "lucide-react";
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
import BreathCoach from "@/components/BreathCoach";
import GuidedReflection from "@/components/GuidedReflection";
import EmotionAnalyzer from "@/components/EmotionAnalyzer";
import DailyCheckIn from "@/components/DailyCheckIn";
import WeeklyInsights from "@/components/WeeklyInsights";
import Achievements from "@/components/Achievements";
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
  const [activeTab, setActiveTab] = useState("chat");
  
  const { messages, isLoading, sendMessage } = useLifeSyncChat(chatId);

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
              <div>
                <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-inner">
                  LifeSync
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Understand Your Mind. Transform Your Life.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowDashboard(true)}
              className="hover:bg-inner-primary/10"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Analytics</span>
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(true)}
              className="hover:bg-inner-primary/10"
            >
              <History className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">History</span>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Orb & Quick Tools */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Floating Orb Card */}
            <Card className="glass-intense p-6 flex flex-col items-center">
              <h3 className="text-sm font-orbitron text-inner-primary mb-4">
                Your Inner Light
              </h3>
              <FloatingOrb emotion={currentEmotion} />
              <p className="text-xs text-muted-foreground mt-4 text-center">
                The orb reflects your emotional state
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

            {/* Mood Graph Toggle */}
            <AnimatePresence>
              {showMoodViz && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <Card className="glass-intense p-6">
                    <h3 className="text-sm font-orbitron text-inner-primary mb-4">
                      Emotional Constellation
                    </h3>
                    <MoodVisualization />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Actions */}
            <Card className="glass-intense p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="ghost"
                  onClick={() => setShowMoodViz(!showMoodViz)}
                  className="justify-start text-sm hover:bg-inner-primary/10"
                >
                  <Brain className="mr-2 w-4 h-4" /> Mood Graph
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("breath")}
                  className="justify-start text-sm hover:bg-inner-primary/10"
                >
                  <Wind className="mr-2 w-4 h-4" /> Breathe
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("reflect")}
                  className="justify-start text-sm hover:bg-inner-primary/10"
                >
                  <BookOpen className="mr-2 w-4 h-4" /> Reflect
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("weekly")}
                  className="justify-start text-sm hover:bg-inner-primary/10"
                >
                  <CalendarDays className="mr-2 w-4 h-4" /> Weekly
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("achievements")}
                  className="justify-start text-sm hover:bg-inner-primary/10"
                >
                  <Trophy className="mr-2 w-4 h-4" /> Badges
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("checkin")}
                  className="justify-start text-sm hover:bg-inner-primary/10"
                >
                  <CheckCircle className="mr-2 w-4 h-4" /> Check-In
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Right Panel - Main Features */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-8"
          >
            <Card className="glass-intense p-6 h-[calc(100vh-200px)]">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid grid-cols-7 bg-background/50 mb-4 overflow-x-auto">
                  <TabsTrigger value="chat" className="data-[state=active]:bg-inner-primary/20">
                    <MessageCircle className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="analyze" className="data-[state=active]:bg-inner-primary/20">
                    <Brain className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="checkin" className="data-[state=active]:bg-inner-primary/20">
                    <CheckCircle className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="breath" className="data-[state=active]:bg-inner-primary/20">
                    <Wind className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="reflect" className="data-[state=active]:bg-inner-primary/20">
                    <BookOpen className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="data-[state=active]:bg-inner-primary/20">
                    <CalendarDays className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="achievements" className="data-[state=active]:bg-inner-primary/20">
                    <Trophy className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>

                {/* Chat Tab */}
                <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-inner-primary/20">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-full bg-gradient-inner flex items-center justify-center glow-inner"
                    >
                      <Sparkles className="w-6 h-6 text-background" />
                    </motion.div>
                    <div>
                      <h3 className="font-orbitron font-semibold text-inner-primary">
                        Luma
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Your AI Emotional Guide
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
                              ? "gradient-inner text-background"
                              : "glass-panel border border-inner-primary/20"
                          }`}
                        >
                          <p className="leading-relaxed">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="glass-panel rounded-2xl px-5 py-4 border border-inner-primary/20">
                          <div className="flex gap-2">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-inner-primary"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
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
                      className="glass-panel border-inner-primary/30 focus:border-inner-primary"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isLoading || !chatId}
                      className="gradient-inner hover:opacity-90 shrink-0 w-12 h-10"
                    >
                      <Send className="w-5 h-5 text-background" />
                    </Button>
                  </form>
                </TabsContent>

                {/* Emotion Analyzer Tab */}
                <TabsContent value="analyze" className="flex-1 overflow-y-auto mt-0">
                  <EmotionAnalyzer />
                </TabsContent>

                {/* Daily Check-In Tab */}
                <TabsContent value="checkin" className="flex-1 overflow-y-auto mt-0">
                  <DailyCheckIn />
                </TabsContent>

                {/* Breath Coach Tab */}
                <TabsContent value="breath" className="flex-1 overflow-y-auto mt-0">
                  <BreathCoach />
                </TabsContent>

                {/* Guided Reflection Tab */}
                <TabsContent value="reflect" className="flex-1 overflow-y-auto mt-0">
                  <GuidedReflection />
                </TabsContent>

                {/* Weekly Insights Tab */}
                <TabsContent value="weekly" className="flex-1 overflow-y-auto mt-0">
                  <WeeklyInsights />
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements" className="flex-1 overflow-y-auto mt-0">
                  <Achievements />
                </TabsContent>
              </Tabs>
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
            <SheetDescription>
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
