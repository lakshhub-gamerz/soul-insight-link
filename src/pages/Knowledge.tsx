import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Brain, BookOpen, Lightbulb, FileText, History, Download, Loader2, Sparkles, ExternalLink, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SavedSearch {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Knowledge() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    explanation: string;
    examples: string[];
    sources: string[];
  } | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [mode, setMode] = useState<"standard" | "eli5" | "expert">("standard");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("querynet_chats")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error("Error loading searches:", error);
    }
  };

  const search = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to search");
        return;
      }

      // Create a new chat for this search
      const { data: chatData, error: chatError } = await supabase
        .from("querynet_chats")
        .insert({
          user_id: user.id,
          title: query.slice(0, 100),
        })
        .select()
        .single();

      if (chatError) throw chatError;

      setActiveChat(chatData.id);

      // Get AI response
      const modePrompt = mode === "eli5" 
        ? "Explain like I'm 5 years old. Use simple words and fun analogies."
        : mode === "expert"
        ? "Provide an expert-level, detailed technical explanation with precise terminology."
        : "Provide a clear, balanced explanation suitable for a general audience.";

      const { data: aiData, error: aiError } = await supabase.functions.invoke("querynet-chat", {
        body: {
          chatId: chatData.id,
          message: `${modePrompt}

Query: ${query}

Please provide:
1. SUMMARY: A concise 2-3 sentence summary
2. EXPLANATION: A detailed explanation
3. EXAMPLES: 2-3 practical examples
4. SOURCES: Suggest 2-3 reliable sources for further reading

Format your response with clear sections labeled [SUMMARY], [EXPLANATION], [EXAMPLES], [SOURCES].`,
        },
      });

      if (aiError) throw aiError;

      const response = aiData?.response || "";
      
      // Parse the structured response
      const summaryMatch = response.match(/\[SUMMARY\]([\s\S]*?)(?=\[EXPLANATION\]|\[EXAMPLES\]|\[SOURCES\]|$)/i);
      const explanationMatch = response.match(/\[EXPLANATION\]([\s\S]*?)(?=\[EXAMPLES\]|\[SOURCES\]|$)/i);
      const examplesMatch = response.match(/\[EXAMPLES\]([\s\S]*?)(?=\[SOURCES\]|$)/i);
      const sourcesMatch = response.match(/\[SOURCES\]([\s\S]*?)$/i);

      setResult({
        summary: summaryMatch?.[1]?.trim() || response.slice(0, 200),
        explanation: explanationMatch?.[1]?.trim() || response,
        examples: examplesMatch?.[1]?.trim().split(/\d+\.\s+/).filter(Boolean) || [],
        sources: sourcesMatch?.[1]?.trim().split(/\d+\.\s+|\n-\s+/).filter(Boolean) || [],
      });

      setMessages([
        { role: "user", content: query },
        { role: "assistant", content: response },
      ]);

      // Save message to database
      await supabase.from("querynet_messages").insert([
        { chat_id: chatData.id, role: "user", content: query },
        { chat_id: chatData.id, role: "assistant", content: response },
      ]);

      loadSavedSearches();
      toast.success("Search complete!");
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("querynet_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setActiveChat(chatId);
      setMessages((data || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
      
      // Try to parse the last assistant message for result display
      const lastAssistant = data?.filter(m => m.role === "assistant").pop();
      if (lastAssistant) {
        const response = lastAssistant.content;
        const summaryMatch = response.match(/\[SUMMARY\]([\s\S]*?)(?=\[EXPLANATION\]|\[EXAMPLES\]|\[SOURCES\]|$)/i);
        const explanationMatch = response.match(/\[EXPLANATION\]([\s\S]*?)(?=\[EXAMPLES\]|\[SOURCES\]|$)/i);
        const examplesMatch = response.match(/\[EXAMPLES\]([\s\S]*?)(?=\[SOURCES\]|$)/i);
        const sourcesMatch = response.match(/\[SOURCES\]([\s\S]*?)$/i);

        setResult({
          summary: summaryMatch?.[1]?.trim() || response.slice(0, 200),
          explanation: explanationMatch?.[1]?.trim() || response,
          examples: examplesMatch?.[1]?.trim().split(/\d+\.\s+/).filter(Boolean) || [],
          sources: sourcesMatch?.[1]?.trim().split(/\d+\.\s+|\n-\s+/).filter(Boolean) || [],
        });
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const deleteSearch = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from("querynet_messages").delete().eq("chat_id", chatId);
      await supabase.from("querynet_chats").delete().eq("id", chatId);
      
      if (activeChat === chatId) {
        setActiveChat(null);
        setResult(null);
        setMessages([]);
      }
      
      loadSavedSearches();
      toast.success("Search deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  const exportToPDF = () => {
    if (!result) return;
    
    // Create a simple text export (PDF generation would require a library)
    const content = `
# QueryNet Knowledge Export

## Query
${query || messages[0]?.content}

## Summary
${result.summary}

## Explanation
${result.explanation}

## Examples
${result.examples.map((e, i) => `${i + 1}. ${e}`).join("\n")}

## Sources
${result.sources.map((s, i) => `${i + 1}. ${s}`).join("\n")}

---
Exported from GodwithYou on ${format(new Date(), "MMMM d, yyyy")}
    `.trim();

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `querynet-export-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Exported to Markdown!");
  };

  const categoryFilters = [
    { label: "All", value: "all" },
    { label: "Science", value: "science" },
    { label: "Math", value: "math" },
    { label: "History", value: "history" },
    { label: "Tech", value: "tech" },
    { label: "General", value: "general" },
  ];

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            QueryNet Knowledge Engine
          </h1>
          <p className="text-muted-foreground mt-2">
            Ask anything. Get AI-powered summaries, explanations, and examples.
          </p>
        </div>

        {/* Search Box */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Ask any question..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <Button
                  onClick={search}
                  disabled={loading || !query.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Mode:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={mode === "eli5" ? "default" : "outline"}
                    onClick={() => setMode("eli5")}
                    className={mode === "eli5" ? "bg-gradient-to-r from-pink-500 to-rose-500" : ""}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    ELI5
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "standard" ? "default" : "outline"}
                    onClick={() => setMode("standard")}
                    className={mode === "standard" ? "bg-gradient-to-r from-blue-500 to-cyan-500" : ""}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Standard
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "expert" ? "default" : "outline"}
                    onClick={() => setMode("expert")}
                    className={mode === "expert" ? "bg-gradient-to-r from-violet-500 to-purple-500" : ""}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Expert
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Saved Searches Sidebar */}
          <Card className="bg-card/50 backdrop-blur-sm border-white/10 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-blue-400" />
                Recent Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {savedSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No searches yet
                    </p>
                  ) : (
                    savedSearches.map((search) => (
                      <div
                        key={search.id}
                        onClick={() => loadChat(search.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                          activeChat === search.id
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <p className="text-sm font-medium line-clamp-2">{search.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(search.created_at), "MMM d")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => deleteSearch(search.id, e)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                  <p className="text-muted-foreground">Searching knowledge base...</p>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Summary */}
                  <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg">{result.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Explanation */}
                  <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-400" />
                        Detailed Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{result.explanation}</p>
                    </CardContent>
                  </Card>

                  {/* Examples */}
                  {result.examples.length > 0 && (
                    <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-400" />
                          Examples
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {result.examples.map((example, index) => (
                            <div
                              key={index}
                              className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                            >
                              <p>{example}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Sources */}
                  {result.sources.length > 0 && (
                    <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <ExternalLink className="w-5 h-5 text-violet-400" />
                            Suggested Sources
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={exportToPDF}
                            className="border-violet-500/50 hover:bg-violet-500/20"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {result.sources.map((source, index) => (
                            <div
                              key={index}
                              className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-sm"
                            >
                              {source}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Brain className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ask anything</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Get comprehensive answers with summaries, explanations, examples, and sources. 
                    Choose your preferred explanation mode above.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
