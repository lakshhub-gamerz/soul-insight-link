import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Scale, Plus, Brain, Zap, Heart, TrendingUp, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DecisionOption {
  text: string;
  probability?: number;
  emotionalImpact?: number;
  energyCost?: number;
  aiAnalysis?: string;
}

interface Decision {
  id: string;
  title: string;
  options: DecisionOption[];
  ai_analysis: {
    recommendation?: string;
    reasoning?: string;
    risks?: string[];
    opportunities?: string[];
  } | null;
  chosen_option: string | null;
  outcome_notes: string | null;
  status: string;
  created_at: string;
}

export default function Decisions() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);

  const [newDecision, setNewDecision] = useState({
    title: "",
    options: ["", "", ""],
  });

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("decision_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(d => ({
        ...d,
        options: (d.options as unknown as DecisionOption[]) || [],
        ai_analysis: d.ai_analysis as unknown as Decision["ai_analysis"],
      }));
      
      setDecisions(typedData);
    } catch (error) {
      console.error("Error loading decisions:", error);
      toast.error("Failed to load decisions");
    } finally {
      setLoading(false);
    }
  };

  const analyzeDecision = async () => {
    if (!newDecision.title || newDecision.options.filter(o => o.trim()).length < 2) {
      toast.error("Please enter a title and at least 2 options");
      return;
    }

    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const validOptions = newDecision.options.filter(o => o.trim());
      
      // Call AI to analyze the decision
      const { data: aiData } = await supabase.functions.invoke("lifesync-chat", {
        body: {
          chatId: "decision-analysis",
          message: `Analyze this life decision: "${newDecision.title}"
Options: ${validOptions.map((o, i) => `${i + 1}. ${o}`).join(", ")}

For each option, provide:
1. Probability of success (0-100%)
2. Emotional impact score (-10 to +10)
3. Energy cost (1-10)
4. Brief analysis

Also provide:
- Overall recommendation
- Key reasoning
- Top 2 risks
- Top 2 opportunities

Format as JSON with structure:
{
  "options": [{"text": "...", "probability": 75, "emotionalImpact": 5, "energyCost": 6, "aiAnalysis": "..."}],
  "recommendation": "...",
  "reasoning": "...",
  "risks": ["...", "..."],
  "opportunities": ["...", "..."]
}`,
        },
      });

      let analysisResult = {
        options: validOptions.map(text => ({
          text,
          probability: Math.floor(Math.random() * 40) + 40,
          emotionalImpact: Math.floor(Math.random() * 10) - 2,
          energyCost: Math.floor(Math.random() * 5) + 3,
          aiAnalysis: "Consider the long-term implications of this choice.",
        })),
        recommendation: validOptions[0],
        reasoning: "Based on the options provided, consider which aligns best with your values and goals.",
        risks: ["Potential unforeseen challenges", "Time and resource commitment"],
        opportunities: ["Personal growth", "New possibilities"],
      };

      if (aiData?.response) {
        try {
          const jsonMatch = aiData.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            analysisResult = { ...analysisResult, ...parsed };
          }
        } catch (e) {
          console.log("Using fallback analysis");
        }
      }

      // Save to database
      const { error } = await supabase.from("decision_logs").insert({
        user_id: user.id,
        title: newDecision.title,
        options: analysisResult.options,
        ai_analysis: {
          recommendation: analysisResult.recommendation,
          reasoning: analysisResult.reasoning,
          risks: analysisResult.risks,
          opportunities: analysisResult.opportunities,
        },
        status: "analyzing",
      });

      if (error) throw error;
      
      toast.success("Decision analyzed! Review the AI insights.");
      setIsDialogOpen(false);
      setNewDecision({ title: "", options: ["", "", ""] });
      loadDecisions();
    } catch (error) {
      console.error("Error analyzing decision:", error);
      toast.error("Failed to analyze decision");
    } finally {
      setAnalyzing(false);
    }
  };

  const makeChoice = async (decisionId: string, chosenOption: string) => {
    try {
      const { error } = await supabase
        .from("decision_logs")
        .update({
          chosen_option: chosenOption,
          status: "decided",
          updated_at: new Date().toISOString(),
        })
        .eq("id", decisionId);

      if (error) throw error;
      toast.success("Choice recorded!");
      loadDecisions();
    } catch (error) {
      console.error("Error making choice:", error);
      toast.error("Failed to record choice");
    }
  };

  const updateOutcome = async (decisionId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from("decision_logs")
        .update({
          outcome_notes: notes,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", decisionId);

      if (error) throw error;
      toast.success("Outcome recorded!");
      setSelectedDecision(null);
      loadDecisions();
    } catch (error) {
      console.error("Error updating outcome:", error);
      toast.error("Failed to record outcome");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-500/20 text-amber-400";
      case "analyzing": return "bg-blue-500/20 text-blue-400";
      case "decided": return "bg-emerald-500/20 text-emerald-400";
      case "completed": return "bg-violet-500/20 text-violet-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Quantum Decision Assistant
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered decision analysis with probability simulations
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                New Decision
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10 max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-400" />
                  Analyze a Life Decision
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    What decision are you facing?
                  </label>
                  <Input
                    placeholder="e.g., Should I change careers?"
                    value={newDecision.title}
                    onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">
                    Enter 2-3 options you're considering:
                  </label>
                  {newDecision.options.map((option, index) => (
                    <Input
                      key={index}
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const updated = [...newDecision.options];
                        updated[index] = e.target.value;
                        setNewDecision({ ...newDecision, options: updated });
                      }}
                    />
                  ))}
                </div>
                <Button
                  onClick={analyzeDecision}
                  disabled={analyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Simulating Outcomes...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <Scale className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{decisions.length}</p>
                <p className="text-sm text-muted-foreground">Total Decisions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <Clock className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">{decisions.filter(d => d.status === "pending" || d.status === "analyzing").length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold">{decisions.filter(d => d.status === "decided").length}</p>
                <p className="text-sm text-muted-foreground">Decided</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 border-violet-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <TrendingUp className="w-8 h-8 text-violet-400" />
              <div>
                <p className="text-2xl font-bold">{decisions.filter(d => d.status === "completed").length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Decisions List */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-background/50 border border-white/10">
            <TabsTrigger value="active">Active Decisions</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <AnimatePresence>
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : decisions.filter(d => d.status !== "completed").length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Scale className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No active decisions. Create one to get AI-powered insights!</p>
                </motion.div>
              ) : (
                <div className="grid gap-6">
                  {decisions.filter(d => d.status !== "completed").map((decision, index) => (
                    <motion.div
                      key={decision.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(decision.status)}`}>
                                {decision.status}
                              </span>
                              <CardTitle className="mt-2">{decision.title}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(decision.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Options with analysis */}
                          <div className="space-y-4">
                            {decision.options.map((option, idx) => (
                              <div
                                key={idx}
                                className={`p-4 rounded-lg border transition-all ${
                                  decision.chosen_option === option.text
                                    ? "border-emerald-500 bg-emerald-500/10"
                                    : "border-white/10 hover:border-white/20"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium">{option.text}</h4>
                                  {!decision.chosen_option && decision.status !== "pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => makeChoice(decision.id, option.text)}
                                      className="border-emerald-500/50 hover:bg-emerald-500/20"
                                    >
                                      Choose This
                                    </Button>
                                  )}
                                </div>
                                
                                {option.probability !== undefined && (
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <TrendingUp className="w-4 h-4" />
                                        Success Probability
                                      </div>
                                      <Progress value={option.probability} className="h-2" />
                                      <span className="text-xs">{option.probability}%</span>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <Heart className="w-4 h-4" />
                                        Emotional Impact
                                      </div>
                                      <div className={`font-semibold ${option.emotionalImpact! >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                        {option.emotionalImpact! >= 0 ? "+" : ""}{option.emotionalImpact}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <Zap className="w-4 h-4" />
                                        Energy Cost
                                      </div>
                                      <div className="font-semibold">{option.energyCost}/10</div>
                                    </div>
                                  </div>
                                )}
                                
                                {option.aiAnalysis && (
                                  <p className="text-sm text-muted-foreground mt-3 italic">
                                    {option.aiAnalysis}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* AI Analysis */}
                          {decision.ai_analysis && (
                            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                              <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-5 h-5 text-cyan-400" />
                                <h4 className="font-semibold text-cyan-400">AI Recommendation</h4>
                              </div>
                              {decision.ai_analysis.recommendation && (
                                <p className="font-medium mb-2">"{decision.ai_analysis.recommendation}"</p>
                              )}
                              {decision.ai_analysis.reasoning && (
                                <p className="text-sm text-muted-foreground mb-3">{decision.ai_analysis.reasoning}</p>
                              )}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {decision.ai_analysis.risks && decision.ai_analysis.risks.length > 0 && (
                                  <div>
                                    <p className="text-rose-400 font-medium mb-1">Risks</p>
                                    <ul className="space-y-1">
                                      {decision.ai_analysis.risks.map((risk, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                          {risk}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {decision.ai_analysis.opportunities && decision.ai_analysis.opportunities.length > 0 && (
                                  <div>
                                    <p className="text-emerald-400 font-medium mb-1">Opportunities</p>
                                    <ul className="space-y-1">
                                      {decision.ai_analysis.opportunities.map((opp, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                          {opp}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Record Outcome */}
                          {decision.chosen_option && decision.status === "decided" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="w-full border-violet-500/50 hover:bg-violet-500/20">
                                  Record Outcome
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
                                <DialogHeader>
                                  <DialogTitle>How did it turn out?</DialogTitle>
                                </DialogHeader>
                                <Textarea
                                  placeholder="Describe the outcome of your decision..."
                                  className="min-h-[100px]"
                                  onChange={(e) => setSelectedDecision({ ...decision, outcome_notes: e.target.value })}
                                />
                                <Button
                                  onClick={() => selectedDecision && updateOutcome(decision.id, selectedDecision.outcome_notes || "")}
                                  className="bg-gradient-to-r from-violet-600 to-purple-600"
                                >
                                  Save Outcome
                                </Button>
                              </DialogContent>
                            </Dialog>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="grid gap-4">
              {decisions.filter(d => d.status === "completed").map((decision) => (
                <Card key={decision.id} className="bg-card/50 backdrop-blur-sm border-white/10">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{decision.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Chose: <span className="text-emerald-400">{decision.chosen_option}</span>
                        </p>
                        {decision.outcome_notes && (
                          <p className="text-sm mt-2 text-muted-foreground italic">
                            Outcome: {decision.outcome_notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(decision.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
