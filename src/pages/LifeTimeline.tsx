import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Sparkles, TrendingUp, Edit2, Trash2, Brain, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  category: string | null;
  mood_score: number | null;
  energy_score: number | null;
  is_predicted: boolean;
  ai_insights: string | null;
  created_at: string;
}

const eventTypes = [
  { value: "milestone", label: "Milestone", color: "from-violet-500 to-purple-600" },
  { value: "achievement", label: "Achievement", color: "from-amber-500 to-orange-600" },
  { value: "challenge", label: "Challenge", color: "from-rose-500 to-pink-600" },
  { value: "decision", label: "Decision", color: "from-blue-500 to-cyan-600" },
  { value: "growth", label: "Growth", color: "from-emerald-500 to-green-600" },
];

const categories = ["personal", "career", "health", "relationships", "learning", "financial"];

export default function LifeTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [generating, setGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_type: "milestone",
    category: "personal",
    mood_score: 5,
    energy_score: 5,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load timeline events");
    } finally {
      setLoading(false);
    }
  };

  const saveEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingEvent) {
        const { error } = await supabase
          .from("timeline_events")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("Event updated");
      } else {
        const { error } = await supabase
          .from("timeline_events")
          .insert({
            ...formData,
            user_id: user.id,
            is_predicted: false,
          });

        if (error) throw error;
        toast.success("Event added to timeline");
      }

      setIsDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase.from("timeline_events").delete().eq("id", id);
      if (error) throw error;
      toast.success("Event deleted");
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const generatePredictions = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call AI to analyze patterns and generate predictions
      const { data, error } = await supabase.functions.invoke("lifesync-chat", {
        body: {
          chatId: "prediction",
          message: `Based on my life events: ${events.slice(0, 10).map(e => `${e.title} (${e.event_type}) on ${e.event_date}`).join(", ")}. Predict 2-3 likely future events/milestones in the next 3-6 months. Format: JSON array with title, description, predicted_date, event_type, category.`,
        },
      });

      if (data?.response) {
        // Parse AI response and add predicted events
        try {
          const jsonMatch = data.response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const predictions = JSON.parse(jsonMatch[0]);
            for (const pred of predictions) {
              await supabase.from("timeline_events").insert({
                user_id: user.id,
                title: pred.title,
                description: pred.description,
                event_date: pred.predicted_date || format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
                event_type: pred.event_type || "milestone",
                category: pred.category || "personal",
                is_predicted: true,
                ai_insights: "AI-predicted based on your life patterns",
              });
            }
            toast.success("Future predictions generated!");
            loadEvents();
          }
        } catch (e) {
          console.log("Could not parse predictions, adding sample");
          toast.info("AI generated insights for your timeline");
        }
      }
    } catch (error) {
      console.error("Error generating predictions:", error);
      toast.error("Failed to generate predictions");
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: format(new Date(), "yyyy-MM-dd"),
      event_type: "milestone",
      category: "personal",
      mood_score: 5,
      energy_score: 5,
    });
  };

  const openEditDialog = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      event_type: event.event_type,
      category: event.category || "personal",
      mood_score: event.mood_score || 5,
      energy_score: event.energy_score || 5,
    });
    setIsDialogOpen(true);
  };

  const getEventTypeStyle = (type: string) => {
    return eventTypes.find(t => t.value === type)?.color || "from-gray-500 to-gray-600";
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Life Timeline
            </h1>
            <p className="text-muted-foreground mt-2">
              Your journey through time — past, present, and predicted future
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={generatePredictions}
              disabled={generating}
              variant="outline"
              className="border-violet-500/50 hover:bg-violet-500/20"
            >
              <Brain className="w-4 h-4 mr-2" />
              {generating ? "Analyzing..." : "Predict Future"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingEvent(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                  <DialogTitle>{editingEvent ? "Edit Event" : "Add Timeline Event"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Event title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Mood Score (1-10)</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.mood_score}
                        onChange={(e) => setFormData({ ...formData, mood_score: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Energy Score (1-10)</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.energy_score}
                        onChange={(e) => setFormData({ ...formData, energy_score: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={saveEvent} className="w-full">
                    {editingEvent ? "Update Event" : "Add Event"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 border-violet-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-violet-500/20">
                <Calendar className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/20">
                <Target className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.filter(e => e.event_type === "achievement").length}</p>
                <p className="text-sm text-muted-foreground">Achievements</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.filter(e => e.event_type === "growth").length}</p>
                <p className="text-sm text-muted-foreground">Growth Moments</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/20 border-pink-500/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/20">
                <Sparkles className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.filter(e => e.is_predicted).length}</p>
                <p className="text-sm text-muted-foreground">Predictions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-purple-500 to-pink-500" />

          <AnimatePresence>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
              </div>
            ) : events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No events yet. Start building your life timeline!</p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-20"
                  >
                    {/* Timeline node */}
                    <div className={`absolute left-6 w-5 h-5 rounded-full bg-gradient-to-r ${getEventTypeStyle(event.event_type)} ring-4 ring-background ${event.is_predicted ? "animate-pulse" : ""}`} />

                    <Card className={`bg-card/50 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all ${event.is_predicted ? "border-dashed border-violet-500/50" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs bg-gradient-to-r ${getEventTypeStyle(event.event_type)} text-white`}>
                                {event.event_type}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {event.category}
                              </span>
                              {event.is_predicted && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                  <Sparkles className="w-3 h-3 inline mr-1" />
                                  Predicted
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            {event.description && (
                              <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(event.event_date), "MMM d, yyyy")}
                              </span>
                              {event.mood_score && (
                                <span>Mood: {event.mood_score}/10</span>
                              )}
                              {event.energy_score && (
                                <span>Energy: {event.energy_score}/10</span>
                              )}
                            </div>
                            {event.ai_insights && (
                              <p className="text-sm text-violet-400 mt-2 italic">
                                <Brain className="w-4 h-4 inline mr-1" />
                                {event.ai_insights}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(event)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEvent(event.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
