import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wind, Play, Pause, RotateCcw } from "lucide-react";

type BreathPhase = "inhale" | "hold" | "exhale" | "rest";

interface BreathPattern {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
  description: string;
}

const breathPatterns: BreathPattern[] = [
  { name: "Calm", inhale: 4, hold: 4, exhale: 4, rest: 2, description: "Box breathing for relaxation" },
  { name: "Focus", inhale: 4, hold: 7, exhale: 8, rest: 2, description: "4-7-8 technique for concentration" },
  { name: "Energy", inhale: 2, hold: 0, exhale: 2, rest: 0, description: "Quick breath for alertness" },
  { name: "Sleep", inhale: 4, hold: 7, exhale: 8, rest: 4, description: "Deep relaxation for rest" },
];

export default function BreathCoach() {
  const [isActive, setIsActive] = useState(false);
  const [currentPattern, setCurrentPattern] = useState(breathPatterns[0]);
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [timeLeft, setTimeLeft] = useState(0);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      startBreathing();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, currentPattern]);

  const startBreathing = () => {
    setPhase("inhale");
    setTimeLeft(currentPattern.inhale);
    
    let currentPhase: BreathPhase = "inhale";
    let remaining = currentPattern.inhale;

    intervalRef.current = setInterval(() => {
      remaining -= 0.1;
      
      if (remaining <= 0) {
        const nextPhase = getNextPhase(currentPhase);
        const nextDuration = getPhaseTime(nextPhase);
        
        if (currentPhase === "rest" || (currentPhase === "exhale" && currentPattern.rest === 0)) {
          setCycles(c => c + 1);
        }
        
        if (nextDuration === 0) {
          const skipPhase = getNextPhase(nextPhase);
          currentPhase = skipPhase;
          remaining = getPhaseTime(skipPhase);
        } else {
          currentPhase = nextPhase;
          remaining = nextDuration;
        }
        
        setPhase(currentPhase);
      }
      
      setTimeLeft(Math.max(0, remaining));
    }, 100);
  };

  const getNextPhase = (current: BreathPhase): BreathPhase => {
    switch (current) {
      case "inhale": return "hold";
      case "hold": return "exhale";
      case "exhale": return "rest";
      case "rest": return "inhale";
    }
  };

  const getPhaseTime = (p: BreathPhase): number => {
    switch (p) {
      case "inhale": return currentPattern.inhale;
      case "hold": return currentPattern.hold;
      case "exhale": return currentPattern.exhale;
      case "rest": return currentPattern.rest;
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "inhale": return "Breathe In";
      case "hold": return "Hold";
      case "exhale": return "Breathe Out";
      case "rest": return "Rest";
    }
  };

  const getScale = () => {
    const maxTime = getPhaseTime(phase);
    const progress = maxTime > 0 ? 1 - (timeLeft / maxTime) : 0;
    
    switch (phase) {
      case "inhale": return 1 + (progress * 0.3);
      case "hold": return 1.3;
      case "exhale": return 1.3 - (progress * 0.3);
      case "rest": return 1;
    }
  };

  const reset = () => {
    setIsActive(false);
    setPhase("inhale");
    setTimeLeft(0);
    setCycles(0);
  };

  return (
    <div className="space-y-6">
      {/* Pattern Selection */}
      <div className="grid grid-cols-2 gap-2">
        {breathPatterns.map((pattern) => (
          <button
            key={pattern.name}
            onClick={() => {
              setCurrentPattern(pattern);
              if (isActive) {
                setIsActive(false);
                setTimeout(() => setIsActive(true), 100);
              }
            }}
            className={`p-3 rounded-xl text-left transition-all ${
              currentPattern.name === pattern.name
                ? "glass-intense border-inner-primary/50 border"
                : "glass-panel hover:bg-inner-primary/10"
            }`}
          >
            <p className="font-orbitron text-sm text-inner-primary">{pattern.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{pattern.description}</p>
          </button>
        ))}
      </div>

      {/* Breathing Circle */}
      <div className="flex flex-col items-center py-8">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-inner-primary/30"
            animate={{ 
              scale: isActive ? getScale() : 1,
              borderColor: isActive 
                ? phase === "hold" ? "hsl(var(--inner-accent))" : "hsl(var(--inner-primary))"
                : "hsl(var(--inner-primary) / 0.3)"
            }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
          
          {/* Inner glow */}
          <motion.div
            className="absolute inset-4 rounded-full bg-gradient-to-br from-inner-primary/20 to-inner-secondary/20"
            animate={{ 
              scale: isActive ? getScale() : 1,
              opacity: isActive ? (phase === "hold" ? 0.8 : 0.5) : 0.3
            }}
            transition={{ duration: 0.1, ease: "linear" }}
            style={{ 
              boxShadow: isActive 
                ? "0 0 60px hsl(var(--inner-primary) / 0.4), inset 0 0 40px hsl(var(--inner-primary) / 0.2)" 
                : "none" 
            }}
          />

          {/* Center content */}
          <div className="relative z-10 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Wind className="w-8 h-8 mx-auto mb-2 text-inner-primary" />
                <p className="font-orbitron text-lg text-inner-primary">
                  {isActive ? getPhaseLabel() : "Ready"}
                </p>
                {isActive && (
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {Math.ceil(timeLeft)}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Cycles counter */}
        {cycles > 0 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground mt-4"
          >
            {cycles} cycle{cycles !== 1 ? "s" : ""} completed
          </motion.p>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => setIsActive(!isActive)}
          className="gradient-inner hover:opacity-90 text-background font-orbitron"
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 mr-2" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" /> Start
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={reset}
          className="border-inner-primary/30 hover:bg-inner-primary/10"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
