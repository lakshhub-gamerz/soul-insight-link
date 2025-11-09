import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, ArrowLeft, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LifeSync = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Welcome! I'm Luma, your personal reflection companion. How are you feeling today?" }
  ]);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, 
      { role: "user", content: input },
      { role: "assistant", content: "Thank you for sharing. I'm here to help you reflect. (AI integration coming soon)" }
    ]);
    setInput("");
  };

  const moods = ["😊", "😐", "😔", "😤", "😌"];

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
                        key={mood}
                        className="text-2xl hover:scale-125 transition-smooth p-2 rounded-lg hover:bg-inner-primary/10"
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Sleep (hours)</label>
                  <Input
                    type="number"
                    placeholder="8"
                    className="bg-input border-inner-primary/30 focus:border-inner-primary"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Focus (hours)</label>
                  <Input
                    type="number"
                    placeholder="4"
                    className="bg-input border-inner-primary/30 focus:border-inner-primary"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Energy Level (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="7"
                    className="bg-input border-inner-primary/30 focus:border-inner-primary"
                  />
                </div>

                <Button className="w-full bg-inner-primary hover:bg-inner-primary-light text-background">
                  Save Today's Log
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Insights</h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-inner-primary/10">
                  📊 Dashboard
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-inner-primary/10">
                  🔥 Streak: 3 days
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-inner-primary/10">
                  ⭐ Weekly Summary
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
              {messages.map((msg, i) => (
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
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Share your thoughts with Luma..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="bg-input border-inner-primary/30 focus:border-inner-primary"
              />
              <Button type="submit" size="icon" className="bg-gradient-to-r from-inner-primary to-inner-secondary hover:opacity-90 text-background">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LifeSync;
