import { motion } from "framer-motion";
import { Heart, Smile, Focus, Frown, Sparkles, Minus } from "lucide-react";

export type EmotionType = "calm" | "joy" | "focus" | "sad" | "grateful" | "neutral";

interface EmotionSelectorProps {
  selected?: EmotionType;
  onSelect: (emotion: EmotionType) => void;
}

const emotions = [
  { 
    type: "calm" as EmotionType, 
    icon: Heart, 
    label: "Calm", 
    color: "text-emotion-calm",
    bgColor: "bg-emotion-calm/20",
    borderColor: "border-emotion-calm"
  },
  { 
    type: "joy" as EmotionType, 
    icon: Smile, 
    label: "Joy", 
    color: "text-emotion-joy",
    bgColor: "bg-emotion-joy/20",
    borderColor: "border-emotion-joy"
  },
  { 
    type: "focus" as EmotionType, 
    icon: Focus, 
    label: "Focus", 
    color: "text-emotion-focus",
    bgColor: "bg-emotion-focus/20",
    borderColor: "border-emotion-focus"
  },
  { 
    type: "sad" as EmotionType, 
    icon: Frown, 
    label: "Sad", 
    color: "text-emotion-sad",
    bgColor: "bg-emotion-sad/20",
    borderColor: "border-emotion-sad"
  },
  { 
    type: "grateful" as EmotionType, 
    icon: Sparkles, 
    label: "Grateful", 
    color: "text-emotion-grateful",
    bgColor: "bg-emotion-grateful/20",
    borderColor: "border-emotion-grateful"
  },
  { 
    type: "neutral" as EmotionType, 
    icon: Minus, 
    label: "Neutral", 
    color: "text-emotion-neutral",
    bgColor: "bg-emotion-neutral/20",
    borderColor: "border-emotion-neutral"
  },
];

export default function EmotionSelector({ selected, onSelect }: EmotionSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {emotions.map((emotion, index) => {
        const Icon = emotion.icon;
        const isSelected = selected === emotion.type;
        
        return (
          <motion.button
            key={emotion.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(emotion.type)}
            className={`
              relative p-4 rounded-xl glass-panel transition-all duration-300
              ${isSelected ? `${emotion.bgColor} border-2 ${emotion.borderColor}` : 'hover:bg-white/5'}
              group overflow-hidden
            `}
          >
            {isSelected && (
              <motion.div
                layoutId="emotion-selected"
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
            <div className="relative flex flex-col items-center gap-2">
              <Icon 
                className={`
                  w-6 h-6 transition-all duration-300
                  ${isSelected ? `${emotion.color} glow-emotion` : 'text-muted-foreground'}
                  ${isSelected ? 'scale-110' : 'group-hover:scale-110'}
                `} 
              />
              <span className={`
                text-xs font-medium transition-colors
                ${isSelected ? emotion.color : 'text-muted-foreground'}
              `}>
                {emotion.label}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
