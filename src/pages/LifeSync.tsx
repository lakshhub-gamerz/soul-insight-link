import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, ArrowLeft, Globe, BarChart3, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLifeSyncChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import LifeSyncDashboard from "@/components/LifeSyncDashboard";
import ChatHistory from "@/components/ChatHistory";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const LifeSync = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatId, setChatId] = useState<string>("");
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { messages, isLoading, sendMessage } = useLifeSyncChat(chatId);
  
  // Daily log state
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");
  const [focusHours, setFocusHours] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");

  const moods = [
    { emoji: "😊", value: 5 },
    { emoji: "😐", value: 3 },
    { emoji: "😔", value: 2 },
    { emoji: "😤", value: 4 },
    { emoji: "😌", value: 5 },
  ];

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
            content: "Welcome! I'm Luma, your personal reflection companion. How are you feeling today?"
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
    if (!selectedMood && !sleepHours && !focusHours && !energyLevel) {
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

      const { error } = await supabase
        .from("lifesync_logs")
        .upsert({
          user_id: user.id,
          log_date: today,
          mood: selectedMood,
          sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
          focus_hours: focusHours ? parseFloat(focusHours) : null,
          energy_level: energyLevel ? parseInt(energyLevel) : null,
        }, {
          onConflict: "user_id,log_date"
        });

      if (error) throw error;

      toast({
        title: "Log saved!",
        description: "Your daily reflection has been recorded.",
      });

      setSelectedMood(null);
      setSleepHours("");
      setFocusHours("");
      setEnergyLevel("");
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-inner-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-inner-accent/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
          <LifeSyncDashboard onClose={() => setShowDashboard(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Inner world themed background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-inner-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-inner-accent/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border glass-panel">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-inner-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-inner-primary" />
              <h1 className="text-2xl font-semibold text-inner-primary">LifeSync</h1>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/querynet")}
            className="border-outer-primary/50 text-outer-primary hover:bg-outer-primary/10 gap-2"
          >
            <Globe className="w-4 h-4" />
            Switch to QueryNet
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily log panel */}
          <Card className="glass-panel p-6 space-y-6 lg:col-span-1">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-inner-primary">Daily Log</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">How do you feel?</label>
                  <div className="flex gap-2">
                    {moods.map((mood) => (
                      <button
                        key={mood.emoji}
                        onClick={() => setSelectedMood(mood.value)}
                        className={`text-2xl hover:scale-125 transition-smooth p-2 rounded-lg ${
                          selectedMood === mood.value
                            ? "bg-inner-primary/20 scale-125"
                            : "hover:bg-inner-primary/10"
                        }`}
                      >
                        {mood.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Sleep (hours)</label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="8"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    className="bg-input border-inner-primary/30 focus:border-inner-primary"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Focus (hours)</label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="4"
                    value={focusHours}
                    onChange={(e) => setFocusHours(e.target.value)}
                    className="bg-input border-inner-primary/30 focus:border-inner-primary"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Energy Level (1-5)</label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="4"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(e.target.value)}
                    className="bg-input border-inner-primary/30 focus:border-inner-primary"
                  />
                </div>

                <Button 
                  onClick={handleSaveLog}
                  className="w-full bg-inner-primary hover:bg-inner-primary-light text-background"
                >
                  Save Today's Log
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Insights</h3>
              <div className="space-y-2">
                <Button 
                  variant="ghost"
                  onClick={() => setShowDashboard(true)}
                  className="w-full justify-start text-sm hover:bg-inner-primary/10"
                >
                  <BarChart3 className="mr-2" /> Dashboard
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setShowHistory(true)}
                  className="w-full justify-start text-sm hover:bg-inner-primary/10"
                >
                  <History className="mr-2" /> History
                </Button>
              </div>
            </div>
          </Card>

          {/* Chat panel */}
          <Card className="glass-panel p-6 lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-inner-primary/20 flex items-center justify-center glow-inner">
                <Sparkles className="w-4 h-4 text-inner-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-inner-primary">Luma</h3>
                <p className="text-xs text-muted-foreground">Empathetic • Supportive • Reflective</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {localMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-inner-primary to-inner-secondary text-background"
                        : "glass-panel"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-panel rounded-2xl px-4 py-3">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-inner-primary animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-inner-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 rounded-full bg-inner-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Share your thoughts with Luma..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || !chatId}
                className="bg-input border-inner-primary/30 focus:border-inner-primary"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !chatId}
                className="bg-gradient-to-r from-inner-primary to-inner-secondary hover:opacity-90 text-background"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Chat History</SheetTitle>
            <SheetDescription>Browse and select previous reflections</SheetDescription>
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

export default LifeSync;
