import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Sun, Moon, Zap, Target, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CheckInData {
  mood: number;
  energy: number;
  sleep: number;
  focus: number;
  gratitude: string;
}

const moodLabels = ["Very Low", "Low", "Neutral", "Good", "Great"];
const energyLabels = ["Exhausted", "Tired", "Okay", "Energized", "Supercharged"];

export default function DailyCheckIn() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [data, setData] = useState<CheckInData>({
    mood: 3,
    energy: 3,
    sleep: 7,
    focus: 4,
    gratitude: "",
  });

  useEffect(() => {
    checkTodayStatus();
  }, []);

  const checkTodayStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const { data: existingLog } = await supabase
        .from("lifesync_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .single();

      if (existingLog) {
        setHasCheckedIn(true);
        setData({
          mood: existingLog.mood || 3,
          energy: existingLog.energy_level || 3,
          sleep: existingLog.sleep_hours || 7,
          focus: existingLog.focus_hours || 4,
          gratitude: "",
        });
      }
    } catch {
      // No check-in yet
    }
  };

  const steps = [
    {
      icon: <Sun className="w-8 h-8" />,
      title: "How's your mood?",
      description: "Rate how you're feeling right now",
      field: "mood",
      min: 1,
      max: 5,
      labels: moodLabels,
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Energy level?",
      description: "How energized do you feel?",
      field: "energy",
      min: 1,
      max: 5,
      labels: energyLabels,
    },
    {
      icon: <Moon className="w-8 h-8" />,
      title: "Hours of sleep?",
      description: "How much did you sleep last night?",
      field: "sleep",
      min: 0,
      max: 12,
      unit: "hours",
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Focus time planned?",
      description: "Deep work hours you'll aim for today",
      field: "focus",
      min: 0,
      max: 10,
      unit: "hours",
    },
  ];

  const currentStep = steps[step];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("lifesync_logs")
        .upsert({
          user_id: user.id,
          log_date: today,
          mood: data.mood,
          energy_level: data.energy,
          sleep_hours: data.sleep,
          focus_hours: data.focus,
          notes: data.gratitude || null,
        }, {
          onConflict: "user_id,log_date"
        });

      if (error) throw error;

      toast({
        title: "✨ Check-in complete!",
        description: "Your daily snapshot has been saved.",
      });

      setHasCheckedIn(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (hasCheckedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-inner flex items-center justify-center glow-inner"
        >
          <Check className="w-10 h-10 text-background" />
        </motion.div>
        <h3 className="font-orbitron text-xl text-inner-primary mb-2">
          Today's Check-In Complete
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          Mood: {moodLabels[data.mood - 1]} • Energy: {energyLabels[data.energy - 1]}
        </p>
        <Button
          variant="outline"
          onClick={() => setHasCheckedIn(false)}
          className="border-inner-primary/30 hover:bg-inner-primary/10"
        >
          Update Check-In
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-1">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full transition-all ${
              idx <= step ? "bg-inner-primary" : "bg-inner-primary/20"
            }`}
          />
        ))}
      </div>

      {/* Current Step */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="py-6"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-inner flex items-center justify-center text-background"
          >
            {currentStep.icon}
          </motion.div>
          <h3 className="font-orbitron text-xl text-inner-primary mb-2">
            {currentStep.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentStep.description}
          </p>
        </div>

        {/* Slider */}
        <div className="space-y-4 px-4">
          <Slider
            value={[data[currentStep.field as keyof CheckInData] as number]}
            onValueChange={([value]) => 
              setData({ ...data, [currentStep.field]: value })
            }
            min={currentStep.min}
            max={currentStep.max}
            step={currentStep.field === "sleep" ? 0.5 : 1}
            className="[&_[role=slider]]:bg-inner-primary [&_[role=slider]]:border-inner-primary"
          />
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentStep.min}{currentStep.unit ? ` ${currentStep.unit}` : ""}</span>
            <span className="font-orbitron text-inner-primary text-lg">
              {data[currentStep.field as keyof CheckInData]}
              {currentStep.unit ? ` ${currentStep.unit}` : ""}
              {currentStep.labels && (
                <span className="block text-xs text-muted-foreground">
                  {currentStep.labels[(data[currentStep.field as keyof CheckInData] as number) - 1]}
                </span>
              )}
            </span>
            <span>{currentStep.max}{currentStep.unit ? ` ${currentStep.unit}` : ""}</span>
          </div>
        </div>
      </motion.div>

      {/* Gratitude (final) */}
      {step === steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <label className="text-sm text-muted-foreground block mb-2">
            One thing you're grateful for today (optional)
          </label>
          <Textarea
            placeholder="I'm grateful for..."
            value={data.gratitude}
            onChange={(e) => setData({ ...data, gratitude: e.target.value })}
            className="glass-panel border-inner-primary/30 min-h-[80px]"
          />
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={prevStep}
            className="flex-1 border-inner-primary/30 hover:bg-inner-primary/10"
          >
            Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button
            onClick={nextStep}
            className="flex-1 gradient-inner hover:opacity-90 text-background font-orbitron"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={isSaving}
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
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Complete Check-In
          </Button>
        )}
      </div>
    </div>
  );
}
