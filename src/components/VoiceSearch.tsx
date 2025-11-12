import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface VoiceSearchProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
}

export default function VoiceSearch({ onTranscript, isDisabled }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([0, 0, 0, 0, 0]);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Voice input error",
          description: "Could not process voice input. Please try again.",
          variant: "destructive",
        });
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setWaveform(Array(5).fill(0).map(() => Math.random() * 100));
      }, 100);
    } else {
      setWaveform([0, 0, 0, 0, 0]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={isListening ? "default" : "outline"}
        size="icon"
        onClick={toggleListening}
        disabled={isDisabled}
        className={`relative ${
          isListening 
            ? "bg-outer-primary hover:bg-outer-primary-light text-background" 
            : "border-outer-primary/30 hover:bg-outer-primary/10"
        }`}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-md border-2 border-outer-primary"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </Button>
      
      {isListening && (
        <div className="flex items-center gap-1 h-8">
          {waveform.map((height, i) => (
            <motion.div
              key={i}
              className="w-1 bg-outer-primary rounded-full"
              style={{ height: `${Math.max(height / 3, 10)}%` }}
              animate={{ height: [`${Math.max(height / 3, 10)}%`] }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
