import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, ChevronRight, Sparkles, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReflectionPrompt {
  id: string;
  category: string;
  prompt: string;
  followUp: string;
}

const reflectionPrompts: ReflectionPrompt[] = [
  {
    id: "gratitude",
    category: "Gratitude",
    prompt: "What are three things you're grateful for today, no matter how small?",
    followUp: "How do these make you feel when you think about them?",
  },
  {
    id: "emotion",
    category: "Emotional Awareness",
    prompt: "What emotion has been most present for you today?",
    followUp: "Where do you feel this emotion in your body?",
  },
  {
    id: "challenge",
    category: "Growth",
    prompt: "What challenge did you face today, and what did it teach you?",
    followUp: "How might you approach similar situations differently?",
  },
  {
    id: "energy",
    category: "Energy",
    prompt: "What gave you energy today? What drained it?",
    followUp: "How can you create more balance tomorrow?",
  },
  {
    id: "connection",
    category: "Connection",
    prompt: "Who made a positive impact on your day, and why?",
    followUp: "How might you nurture this connection?",
  },
  {
    id: "intention",
    category: "Intention",
    prompt: "What intention do you want to set for tomorrow?",
    followUp: "What's one small step you can take toward it?",
  },
];

export default function GuidedReflection() {
  const { toast } = useToast();
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [mainResponse, setMainResponse] = useState("");
  const [followUpResponse, setFollowUpResponse] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currentPrompt = reflectionPrompts[currentPromptIndex];

  const handleNext = () => {
    if (!showFollowUp && mainResponse.trim()) {
      setShowFollowUp(true);
    } else {
      const nextIndex = (currentPromptIndex + 1) % reflectionPrompts.length;
      setCurrentPromptIndex(nextIndex);
      setShowFollowUp(false);
      setMainResponse("");
      setFollowUpResponse("");
    }
  };

  const handleSave = async () => {
    if (!mainResponse.trim()) {
      toast({
        title: "Please write your reflection first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];
      const reflectionText = `[${currentPrompt.category}]\n\nQ: ${currentPrompt.prompt}\nA: ${mainResponse}${
        followUpResponse ? `\n\nQ: ${currentPrompt.followUp}\nA: ${followUpResponse}` : ""
      }`;

      // Get existing notes for today
      const { data: existingLog } = await supabase
        .from("lifesync_logs")
        .select("notes")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .single();

      const updatedNotes = existingLog?.notes 
        ? `${existingLog.notes}\n\n---\n\n${reflectionText}`
        : reflectionText;

      await supabase
        .from("lifesync_logs")
        .upsert({
          user_id: user.id,
          log_date: today,
          notes: updatedNotes,
        }, {
          onConflict: "user_id,log_date"
        });

      toast({
        title: "✨ Reflection saved",
        description: "Your thoughts have been recorded.",
      });

      // Move to next prompt
      handleNext();
    } catch (error: any) {
      toast({
        title: "Error saving reflection",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const shufflePrompt = () => {
    const randomIndex = Math.floor(Math.random() * reflectionPrompts.length);
    setCurrentPromptIndex(randomIndex);
    setShowFollowUp(false);
    setMainResponse("");
    setFollowUpResponse("");
  };

  return (
    <div className="space-y-6">
      {/* Category Badge */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 rounded-full text-xs font-orbitron bg-inner-primary/20 text-inner-primary">
          {currentPrompt.category}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={shufflePrompt}
          className="hover:bg-inner-primary/10"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Prompt */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentPrompt.id}-${showFollowUp}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-inner flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-background" />
            </div>
            <p className="text-lg font-medium text-foreground leading-relaxed">
              {showFollowUp ? currentPrompt.followUp : currentPrompt.prompt}
            </p>
          </div>

          <Textarea
            placeholder="Take your time to reflect..."
            value={showFollowUp ? followUpResponse : mainResponse}
            onChange={(e) => 
              showFollowUp 
                ? setFollowUpResponse(e.target.value) 
                : setMainResponse(e.target.value)
            }
            className="glass-panel border-inner-primary/30 min-h-[120px] resize-none focus:border-inner-primary"
          />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {reflectionPrompts.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentPromptIndex(idx);
              setShowFollowUp(false);
              setMainResponse("");
              setFollowUpResponse("");
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentPromptIndex 
                ? "bg-inner-primary w-6" 
                : "bg-inner-primary/30 hover:bg-inner-primary/50"
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !mainResponse.trim()}
          className="flex-1 gradient-inner hover:opacity-90 text-background font-orbitron"
        >
          {isSaving ? (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
            </motion.div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Reflection
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={!showFollowUp && !mainResponse.trim()}
          className="border-inner-primary/30 hover:bg-inner-primary/10"
        >
          {showFollowUp ? "Next" : "Continue"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
