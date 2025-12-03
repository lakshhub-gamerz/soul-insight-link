import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, Send, Sparkles, BookOpen, Code, Brain,
  Heart, Trash2, Download, Copy
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const presets = [
  { icon: BookOpen, label: "Study Mode", prompt: "Help me study and learn effectively. Ask me questions and explain concepts clearly." },
  { icon: Code, label: "Coding Mode", prompt: "Help me with coding. Be concise and provide code examples when needed." },
  { icon: Brain, label: "Brainstorm", prompt: "Help me brainstorm ideas. Be creative and think outside the box." },
  { icon: Heart, label: "Support Mode", prompt: "Be a supportive friend. Listen and provide encouragement." },
];

const AiChat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = selectedPreset 
        ? presets.find(p => p.label === selectedPreset)?.prompt 
        : "You are a helpful AI assistant. Be concise and helpful.";

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            userMessage
          ]
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Fallback response
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm here to help! While I'm connecting to my full capabilities, feel free to ask me anything. I can assist with study questions, brainstorming, coding help, and general conversation."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast({ title: "Chat cleared" });
  };

  const copyChat = () => {
    const text = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Chat copied to clipboard" });
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "You" : "AI"}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-export.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Chat exported" });
  };

  return (
    <div className="min-h-screen nebula-bg relative overflow-hidden flex flex-col">
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
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-7 h-7 text-violet-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-inner">
                  AI Chat
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Your Personal AI Assistant
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={copyChat}
              className="hover:bg-violet-500/10"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={exportChat}
              className="hover:bg-violet-500/10"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="hover:bg-red-500/10 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Presets */}
      <div className="relative z-10 container mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant={selectedPreset === preset.label ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPreset(
                selectedPreset === preset.label ? null : preset.label
              )}
              className={selectedPreset === preset.label 
                ? "gradient-inner shrink-0" 
                : "border-violet-500/30 shrink-0"
              }
            >
              <preset.icon className="w-4 h-4 mr-2" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 relative z-10 container mx-auto px-4 overflow-hidden">
        <Card className="glass-intense h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-violet-400" />
                  <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything! I can help with studying, coding, brainstorming, or just chat.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "gradient-inner text-background"
                        : "glass-panel border border-violet-500/20"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="glass-panel rounded-2xl px-4 py-3 border border-violet-500/20">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-violet-400"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-violet-500/20">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-3"
            >
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="glass-panel border-violet-500/30 focus:border-violet-500"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="gradient-inner shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AiChat;
