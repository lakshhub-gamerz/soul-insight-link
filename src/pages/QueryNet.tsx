import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Globe, Send, Upload, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryNetChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";

const QueryNet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [chatId, setChatId] = useState<string>("");
  const [documentId, setDocumentId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage } = useQueryNetChat(chatId, documentId);

  useEffect(() => {
    // Create or get active chat
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create a chat
      const { data: existingChats } = await supabase
        .from("querynet_chats")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingChats && existingChats.length > 0) {
        setChatId(existingChats[0].id);
        
        // Load messages
        const { data: msgs } = await supabase
          .from("querynet_messages")
          .select("*")
          .eq("chat_id", existingChats[0].id)
          .order("created_at");
        
        if (msgs && msgs.length === 0) {
          // Insert welcome message
          await supabase
            .from("querynet_messages")
            .insert({
              chat_id: existingChats[0].id,
              role: "assistant",
              content: "Hello! I'm Astra, your guide to the world's knowledge. Share a URL or upload a document, and I'll help you understand it."
            });
        }
      } else {
        // Create new chat
        const { data: newChat } = await supabase
          .from("querynet_chats")
          .insert({ user_id: user.id, title: "New Chat" })
          .select()
          .single();
        
        if (newChat) {
          setChatId(newChat.id);
          // Insert welcome message
          await supabase
            .from("querynet_messages")
            .insert({
              chat_id: newChat.id,
              role: "assistant",
              content: "Hello! I'm Astra, your guide to the world's knowledge. Share a URL or upload a document, and I'll help you understand it."
            });
        }
      }
    };

    initChat();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId) return;
    
    await sendMessage(input);
    setInput("");
  };

  const handleLoadUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "URL Processing",
      description: "Document processing and RAG features coming soon!",
    });
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
                <Button 
                  onClick={handleLoadUrl}
                  className="w-full bg-outer-primary hover:bg-outer-primary-light text-background"
                >
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
                  Upload PDF (Coming Soon)
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
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50 text-xs">
                        <p className="font-semibold mb-1">Sources:</p>
                        {msg.sources.map((source: any, idx: number) => (
                          <p key={idx} className="text-muted-foreground">
                            • {source.preview}...
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-panel rounded-2xl px-4 py-3">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-outer-primary animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-outer-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 rounded-full bg-outer-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Ask Astra anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || !chatId}
                className="bg-input border-outer-primary/30 focus:border-outer-primary"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !chatId}
                className="bg-outer-primary hover:bg-outer-primary-light text-background"
              >
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
