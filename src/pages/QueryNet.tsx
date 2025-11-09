import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Globe, Send, Upload, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QueryNet = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "assistant", content: "Hello! I'm Astra, your guide to the world's knowledge. Share a URL or upload a document, and I'll help you understand it." }
  ]);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, 
      { role: "user", content: input },
      { role: "assistant", content: "I'm analyzing that for you. (AI integration coming soon)" }
    ]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Outer world themed background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-outer-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-outer-accent/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border glass-panel">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-outer-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-outer-primary" />
              <h1 className="text-2xl font-semibold text-outer-primary">QueryNet</h1>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/lifesync")}
            className="border-inner-primary/50 text-inner-primary hover:bg-inner-primary/10 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Switch to LifeSync
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input panel */}
          <Card className="glass-panel p-6 space-y-4 lg:col-span-1">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-outer-primary">Source</h2>
              <div className="space-y-3">
                <Input
                  placeholder="Paste URL here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-input border-outer-primary/30 focus:border-outer-primary"
                />
                <Button className="w-full bg-outer-primary hover:bg-outer-primary-light text-background">
                  Load URL
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2 border-outer-primary/30 hover:bg-outer-primary/10">
                  <Upload className="w-4 h-4" />
                  Upload PDF
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-outer-primary/10">
                  📝 Quick Summary
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-outer-primary/10">
                  📚 History
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-outer-primary/10">
                  🔗 Share Chat
                </Button>
              </div>
            </div>
          </Card>

          {/* Chat panel */}
          <Card className="glass-panel p-6 lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-outer-primary/20 flex items-center justify-center glow-outer">
                <Globe className="w-4 h-4 text-outer-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-outer-primary">Astra</h3>
                <p className="text-xs text-muted-foreground">Analytical • Precise • Sourced</p>
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
                        ? "bg-outer-primary text-background"
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
                placeholder="Ask Astra anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="bg-input border-outer-primary/30 focus:border-outer-primary"
              />
              <Button type="submit" size="icon" className="bg-outer-primary hover:bg-outer-primary-light text-background">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QueryNet;
