import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Sparkles, RefreshCw, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  emotion: string;
  intensity: string;
  insight: string;
  suggestion: string;
}

export default function EmotionAnalyzer() {
  const { toast } = useToast();
  const [feeling, setFeeling] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeEmotion = async () => {
    if (!feeling.trim()) {
      toast({
        title: "Please describe how you're feeling",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-emotion", {
        body: { feeling: feeling.trim() },
      });

      if (error) throw error;

      setResult(data);
    } catch (error: any) {
      console.error("Analysis error:", error);
      // Fallback to local analysis if edge function fails
      const localResult = localAnalyze(feeling);
      setResult(localResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const localAnalyze = (text: string): AnalysisResult => {
    const lowered = text.toLowerCase();
    
    // Simple keyword-based analysis as fallback
    const emotions: Record<string, { emotion: string; insight: string; suggestion: string }> = {
      happy: { emotion: "Joy", insight: "You're experiencing positive energy.", suggestion: "Share this joy with someone you care about." },
      sad: { emotion: "Sadness", insight: "It's okay to feel down sometimes.", suggestion: "Try gentle movement or reach out to a friend." },
      anxious: { emotion: "Anxiety", insight: "Your mind is processing uncertainty.", suggestion: "Try the Breath Coach with the 'Calm' pattern." },
      stressed: { emotion: "Stress", insight: "You're carrying a heavy load.", suggestion: "Break down tasks and take small steps." },
      tired: { emotion: "Fatigue", insight: "Your body needs restoration.", suggestion: "Prioritize rest and gentle self-care tonight." },
      angry: { emotion: "Frustration", insight: "Something has triggered a protective response.", suggestion: "Channel this energy into productive action." },
      peaceful: { emotion: "Peace", insight: "You've found a moment of balance.", suggestion: "Notice what brought you here and cultivate more of it." },
      excited: { emotion: "Excitement", insight: "Anticipation is energizing you.", suggestion: "Use this momentum for creative projects." },
      lonely: { emotion: "Loneliness", insight: "Connection is a fundamental human need.", suggestion: "Reach out to someone, even with a simple message." },
      grateful: { emotion: "Gratitude", insight: "Appreciation opens the heart.", suggestion: "Write down what you're thankful for." },
    };

    for (const [key, value] of Object.entries(emotions)) {
      if (lowered.includes(key)) {
        return { ...value, intensity: "Moderate" };
      }
    }

    return {
      emotion: "Mixed",
      intensity: "Moderate",
      insight: "You're experiencing a complex emotional state, which is completely normal.",
      suggestion: "Take a moment to sit with these feelings without judgment.",
    };
  };

  const reset = () => {
    setFeeling("");
    setResult(null);
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      Joy: "text-emotion-joy",
      Sadness: "text-emotion-sad",
      Anxiety: "text-emotion-focus",
      Stress: "text-destructive",
      Fatigue: "text-emotion-neutral",
      Frustration: "text-destructive",
      Peace: "text-emotion-calm",
      Excitement: "text-emotion-joy",
      Loneliness: "text-emotion-sad",
      Gratitude: "text-emotion-grateful",
      Mixed: "text-inner-primary",
    };
    return colors[emotion] || "text-inner-primary";
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-inner flex items-center justify-center glow-inner"
              >
                <Brain className="w-8 h-8 text-background" />
              </motion.div>
              <h3 className="font-orbitron text-lg text-inner-primary mb-2">
                How are you feeling?
              </h3>
              <p className="text-sm text-muted-foreground">
                Describe your current emotional state in a few words
              </p>
            </div>

            <Input
              placeholder="e.g., anxious, peaceful, excited..."
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyzeEmotion()}
              className="glass-panel border-inner-primary/30 text-center text-lg py-6"
            />

            <Button
              onClick={analyzeEmotion}
              disabled={isAnalyzing || !feeling.trim()}
              className="w-full gradient-inner hover:opacity-90 text-background font-orbitron"
            >
              {isAnalyzing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </motion.div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze My Emotions
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Main emotion */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className={`text-4xl font-orbitron font-bold mb-2 ${getEmotionColor(result.emotion)}`}
              >
                {result.emotion}
              </motion.div>
              <p className="text-sm text-muted-foreground">
                Intensity: {result.intensity}
              </p>
            </div>

            {/* Insight card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-intense rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-inner-primary">
                <Brain className="w-4 h-4" />
                <span className="font-orbitron text-sm">Insight</span>
              </div>
              <p className="text-foreground leading-relaxed">
                {result.insight}
              </p>
            </motion.div>

            {/* Suggestion card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-intense rounded-xl p-4 space-y-3 border-inner-accent/30 border"
            >
              <div className="flex items-center gap-2 text-inner-accent">
                <Lightbulb className="w-4 h-4" />
                <span className="font-orbitron text-sm">Suggestion</span>
              </div>
              <p className="text-foreground leading-relaxed">
                {result.suggestion}
              </p>
            </motion.div>

            {/* Reset button */}
            <Button
              variant="outline"
              onClick={reset}
              className="w-full border-inner-primary/30 hover:bg-inner-primary/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Analyze Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
