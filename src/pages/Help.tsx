import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, HelpCircle, BookOpen, MessageSquare, 
  ChevronDown, Send, CheckCircle, Sparkles, Zap, Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is GodwithYou?",
    answer: "GodwithYou is an all-in-one AI super-app that combines productivity tools (Astra), emotional wellbeing (LifeSync), and knowledge search (QueryNet) to help you grow, learn, and stay balanced."
  },
  {
    question: "How does the AI work?",
    answer: "Our AI uses advanced language models to understand your needs and provide personalized responses. Whether you're asking questions, analyzing emotions, or generating tasks, the AI adapts to help you effectively."
  },
  {
    question: "Is my data private?",
    answer: "Yes! Your data is encrypted and stored securely. We never share your personal information with third parties. Your emotional logs, tasks, and conversations are private to your account."
  },
  {
    question: "How do I use the Focus Timer?",
    answer: "Go to Astra → Focus tab. Select your preferred duration (15, 25, 45, or 60 minutes), then click Start. The timer will notify you when your focus session is complete."
  },
  {
    question: "Can I export my data?",
    answer: "Yes! You can export your chat history, emotional reports, and task lists. Look for the download/export buttons in each section."
  },
  {
    question: "How do I track my mood?",
    answer: "Go to LifeSync and use the Daily Check-In feature. Rate your mood, energy, sleep, and focus daily to build insights over time."
  }
];

const guides = [
  {
    title: "Getting Started",
    icon: Sparkles,
    steps: [
      "Create your account or sign in",
      "Explore the Dashboard for a quick overview",
      "Try the AI Chat to ask any question",
      "Set up your first task in Astra",
      "Do a mood check-in with LifeSync"
    ]
  },
  {
    title: "Boost Productivity",
    icon: Zap,
    steps: [
      "Generate AI-powered microtasks",
      "Use the Focus Timer for deep work",
      "Create projects with AI roadmaps",
      "Track your daily progress",
      "Review weekly insights"
    ]
  },
  {
    title: "Emotional Wellness",
    icon: Heart,
    steps: [
      "Daily mood check-ins",
      "Use the Breath Coach for calm",
      "Try guided reflections",
      "Analyze emotions with AI",
      "Track patterns over time"
    ]
  }
];

const Help = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState("general");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submitFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("feedback")
        .insert({
          user_id: user?.id || null,
          type: feedbackType,
          subject: feedbackSubject,
          message: feedbackMessage
        });

      if (error) throw error;

      toast({ title: "Feedback submitted! Thank you! 💜" });
      setFeedbackSubject("");
      setFeedbackMessage("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({ title: "Error submitting feedback", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen nebula-bg relative overflow-hidden">
      <CosmicBackground />

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-b border-violet-500/20 glass-intense"
      >
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-violet-500/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-violet-400" />
            <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-inner">
              Help Center
            </h1>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-8">
          {/* Quick Guides */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-orbitron font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Quick Guides
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {guides.map((guide, i) => (
                <motion.div
                  key={guide.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="glass-intense p-6 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <guide.icon className="w-6 h-6 text-violet-400" />
                      <h3 className="font-semibold">{guide.title}</h3>
                    </div>
                    <ol className="space-y-2">
                      {guide.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          {step}
                        </li>
                      ))}
                    </ol>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-orbitron font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Frequently Asked Questions
            </h2>
            <Card className="glass-intense p-6">
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-violet-500/20">
                    <AccordionTrigger className="text-left hover:text-violet-400">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </motion.div>

          {/* Contact / Feedback */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-orbitron font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Send Feedback
            </h2>
            <Card className="glass-intense p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Type</label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-full mt-1 p-2 rounded-md bg-background/50 border border-violet-500/30 text-foreground"
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Subject</label>
                  <Input
                    value={feedbackSubject}
                    onChange={(e) => setFeedbackSubject(e.target.value)}
                    placeholder="Brief subject"
                    className="glass-panel border-violet-500/30 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Message</label>
                  <Textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Tell us more..."
                    className="glass-panel border-violet-500/30 mt-1"
                    rows={4}
                  />
                </div>
                <Button
                  onClick={submitFeedback}
                  disabled={sending}
                  className="w-full gradient-inner"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Submit Feedback"}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Help;
