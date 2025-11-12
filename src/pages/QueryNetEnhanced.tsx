import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Globe, Send, Upload, ArrowLeft, Sparkles, History, Share2, Sparkle, Loader2, Map, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryNetChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import ChatHistory from "@/components/ChatHistory";
import ShareChatDialog from "@/components/ShareChatDialog";
import GalaxyBackground from "@/components/GalaxyBackground";
import VoiceSearch from "@/components/VoiceSearch";
import KnowledgeMap from "@/components/KnowledgeMap";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const QueryNetEnhanced = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [url, setUrl] = useState("");
  const [chatId, setChatId] = useState<string>("");
  const [documentId, setDocumentId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [ambientSound, setAmbientSound] = useState(false);
  const [isQueryAnimating, setIsQueryAnimating] = useState(false);
  
  const { messages, isLoading, sendMessage } = useQueryNetChat(chatId, documentId);

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingChats } = await supabase
      .from("querynet_chats")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingChats && existingChats.length > 0) {
      setChatId(existingChats[0].id);
    } else {
      const { data: newChat } = await supabase
        .from("querynet_chats")
        .insert({ user_id: user.id, title: "New Chat" })
        .select()
        .single();
      
      if (newChat) {
        setChatId(newChat.id);
        await supabase
          .from("querynet_messages")
          .insert({
            chat_id: newChat.id,
            role: "assistant",
            content: "🌌 Greetings, explorer. I am Astra, your navigator through the infinite knowledge galaxy. Share your curiosity with me — upload a document, paste a URL, or simply ask. Together we'll illuminate the cosmos of understanding."
          });
      }
    }
  };

  const loadMessages = async () => {
    const { data: msgs } = await supabase
      .from("querynet_messages")
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
    
    setIsQueryAnimating(true);
    setTimeout(() => setIsQueryAnimating(false), 1000);
    
    await sendMessage(input);
    setInput("");
    loadMessages();
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    toast({
      title: "Voice captured",
      description: "Your voice has been transcribed. Press send to query.",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("process-document", {
        body: formData,
      });

      if (error) throw error;

      setDocumentId(data.documentId);
      toast({
        title: "Document uploaded!",
        description: `${data.chunksCount} sections extracted. You can now ask questions about it.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!chatId) return;
    
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { chatId },
      });

      if (error) throw error;

      setSummary(data.summary);
      setShowSummary(true);
    } catch (error: any) {
      toast({
        title: "Summary generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSelectChat = async (newChatId: string) => {
    setChatId(newChatId);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-[#000010] relative overflow-hidden font-poppins">
      <GalaxyBackground />
      
      {/* Cosmic overlay gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-outer-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-outer-secondary/10 rounded-full blur-[150px]" />
      </div>

      {/* Shooting star animation */}
      <AnimatePresence>
        {isQueryAnimating && (
          <motion.div
            className="absolute top-1/2 left-1/2 w-2 h-2 bg-outer-primary rounded-full"
            initial={{ x: -100, y: 0, opacity: 1, scale: 1 }}
            animate={{ 
              x: [0, 500, 1000], 
              y: [0, -200, -400],
              opacity: [1, 0.5, 0],
              scale: [1, 1.5, 0.5]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              boxShadow: "0 0 20px hsl(var(--outer-primary)), 0 0 40px hsl(var(--outer-primary))",
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 border-b border-outer-primary/20 bg-black/40 backdrop-blur-xl">
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
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Globe className="w-7 h-7 text-outer-primary" style={{ filter: "drop-shadow(0 0 8px hsl(var(--outer-primary)))" }} />
              </motion.div>
              <div>
                <h1 className="text-2xl font-orbitron font-bold text-outer-primary" style={{ textShadow: "0 0 20px hsl(var(--outer-primary))" }}>
                  ASTRA
                </h1>
                <p className="text-xs text-outer-glow font-light">Knowledge Galaxy Navigator</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAmbientSound(!ambientSound)}
              className="hover:bg-outer-primary/10"
            >
              {ambientSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/lifesync")}
              className="border-inner-primary/50 text-inner-primary hover:bg-inner-primary/10 gap-2"
            >
              <Sparkles className="w-4 h-4" />
              LifeSync Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6 bg-black/40 backdrop-blur-xl border border-outer-primary/20">
            <TabsTrigger value="chat" className="data-[state=active]:bg-outer-primary/20">
              Chat Mode
            </TabsTrigger>
            <TabsTrigger value="map" className="data-[state=active]:bg-outer-primary/20">
              <Map className="w-4 h-4 mr-2" />
              Knowledge Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Input panel */}
              <Card className="bg-black/40 backdrop-blur-xl border-outer-primary/20 p-6 space-y-4 lg:col-span-1">
                <div>
                  <h2 className="text-lg font-orbitron font-semibold mb-4 text-outer-primary">Data Source</h2>
                  <div className="space-y-3">
                    <Input
                      placeholder="Paste URL from the cosmos..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="bg-black/60 border-outer-primary/30 focus:border-outer-primary text-foreground placeholder:text-muted-foreground"
                    />
                    <Button 
                      onClick={() => toast({ title: "URL Processing", description: "Feature coming soon!" })}
                      className="w-full bg-outer-primary hover:bg-outer-primary-light text-black font-semibold"
                      style={{ boxShadow: "0 0 20px hsl(var(--outer-primary) / 0.5)" }}
                    >
                      Load URL
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-outer-primary/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv,.json,.html"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="w-full gap-2 border-outer-primary/30 hover:bg-outer-primary/10"
                    >
                      {uploadingFile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploadingFile ? "Uploading..." : "Upload Document"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-outer-primary/20">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground font-orbitron">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="ghost" 
                      onClick={handleGenerateSummary}
                      disabled={generatingSummary || localMessages.length < 2}
                      className="w-full justify-start text-sm hover:bg-outer-primary/10"
                    >
                      {generatingSummary ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkle className="mr-2" />
                      )}
                      Generate Summary
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowHistory(true)}
                      className="w-full justify-start text-sm hover:bg-outer-primary/10"
                    >
                      <History className="mr-2" /> History
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => setShowShare(true)}
                      className="w-full justify-start text-sm hover:bg-outer-primary/10"
                    >
                      <Share2 className="mr-2" /> Share
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Chat panel */}
              <Card className="bg-black/40 backdrop-blur-xl border-outer-primary/20 p-6 lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-outer-primary/20">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-outer-primary to-outer-secondary flex items-center justify-center"
                    animate={{ 
                      boxShadow: [
                        "0 0 20px hsl(var(--outer-primary))",
                        "0 0 40px hsl(var(--outer-secondary))",
                        "0 0 20px hsl(var(--outer-primary))"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Globe className="w-5 h-5 text-black" />
                  </motion.div>
                  <div>
                    <h3 className="font-orbitron font-bold text-outer-primary">ASTRA</h3>
                    <p className="text-xs text-muted-foreground">Analytical • Precise • Cosmic</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--outer-primary)) transparent" }}>
                  {localMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-outer-primary to-outer-secondary text-black font-medium"
                            : "bg-black/60 backdrop-blur-md border border-outer-primary/20"
                        }`}
                        style={msg.role === "user" ? { boxShadow: "0 0 20px hsl(var(--outer-primary) / 0.3)" } : {}}
                      >
                        {msg.content}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-outer-primary/20 text-xs">
                            <p className="font-semibold mb-1 text-outer-glow">Sources:</p>
                            {msg.sources.map((source: any, idx: number) => (
                              <p key={idx} className="text-muted-foreground">
                                • {source.preview}...
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-black/60 backdrop-blur-md border border-outer-primary/20 rounded-2xl px-4 py-3">
                        <div className="flex gap-2">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full bg-outer-primary"
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask Astra to explore the cosmos..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading || !chatId}
                    className="bg-black/60 border-outer-primary/30 focus:border-outer-primary text-foreground placeholder:text-muted-foreground"
                  />
                  <VoiceSearch onTranscript={handleVoiceTranscript} isDisabled={isLoading || !chatId} />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !chatId}
                    className="bg-gradient-to-br from-outer-primary to-outer-secondary hover:opacity-90 text-black"
                    style={{ boxShadow: "0 0 20px hsl(var(--outer-primary) / 0.5)" }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-xl border-outer-primary/20 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-orbitron font-bold text-outer-primary mb-2">
                  Your Knowledge Constellation
                </h2>
                <p className="text-sm text-muted-foreground">
                  Each node represents a query, connected through the fabric of curiosity
                </p>
              </div>
              <KnowledgeMap messages={localMessages} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent className="bg-black/90 backdrop-blur-xl border-outer-primary/20">
          <SheetHeader>
            <SheetTitle className="font-orbitron text-outer-primary">Chat History</SheetTitle>
            <SheetDescription>Browse and select previous explorations</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ChatHistory 
              mode="querynet"
              onSelectChat={handleSelectChat}
              currentChatId={chatId}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Share Dialog */}
      <ShareChatDialog 
        chatId={chatId}
        open={showShare}
        onOpenChange={setShowShare}
      />

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-xl border-outer-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-orbitron text-outer-primary">
              <Sparkle className="w-5 h-5" />
              Cosmic Summary
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="whitespace-pre-wrap">{summary}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QueryNetEnhanced;
