import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const feedbackTypes = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-rose-400" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-amber-400" },
  { value: "feedback", label: "General Feedback", icon: MessageSquare, color: "text-blue-400" },
  { value: "question", label: "Question", icon: HelpCircle, color: "text-violet-400" },
];

export default function Feedback() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    type: "feedback",
    subject: "",
    message: "",
  });

  const submitFeedback = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("feedback").insert({
        type: formData.type,
        subject: formData.subject,
        message: formData.message,
        user_id: user?.id || null,
        status: "pending",
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "feedback",
      subject: "",
      message: "",
    });
    setSubmitted(false);
  };

  const selectedType = feedbackTypes.find(t => t.value === formData.type);
  const TypeIcon = selectedType?.icon || MessageSquare;

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Feedback & Support
          </h1>
          <p className="text-muted-foreground mt-2">
            We'd love to hear from you. Help us make GodwithYou better!
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                <p className="text-muted-foreground mb-6">
                  Your feedback has been submitted successfully. We'll review it and get back to you if needed.
                </p>
                <Button onClick={resetForm} variant="outline" className="border-emerald-500/50 hover:bg-emerald-500/20">
                  Submit Another
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TypeIcon className={`w-5 h-5 ${selectedType?.color}`} />
                Submit Feedback
              </CardTitle>
              <CardDescription>
                Choose a category and tell us what's on your mind
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feedback Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {feedbackTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Button
                        key={type.value}
                        variant="outline"
                        onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                        className={`h-auto p-4 flex-col gap-2 border-white/10 ${
                          formData.type === type.value 
                            ? `border-2 ${type.color.replace("text-", "border-")} bg-white/5` 
                            : "hover:border-white/20"
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${type.color}`} />
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="Brief description of your feedback"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder={
                    formData.type === "bug"
                      ? "Please describe the bug, steps to reproduce, and what you expected to happen..."
                      : formData.type === "feature"
                      ? "Describe the feature you'd like to see and how it would help you..."
                      : formData.type === "question"
                      ? "What would you like to know?"
                      : "Share your thoughts with us..."
                  }
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[150px]"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={submitFeedback}
                disabled={loading || !formData.subject.trim() || !formData.message.trim()}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-violet-500/20">
                <MessageSquare className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold">Need direct support?</h3>
                <p className="text-sm text-muted-foreground">
                  Email us at <a href="mailto:support@godwithyou.app" className="text-violet-400 hover:underline">support@godwithyou.app</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
