
-- Create decision_logs table for Quantum Decision Assistant
CREATE TABLE public.decision_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis JSONB,
  chosen_option TEXT,
  outcome_notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own decisions" ON public.decision_logs
FOR ALL USING (auth.uid() = user_id);

-- Create timeline_events table for Life Timeline Engine
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'milestone',
  category TEXT DEFAULT 'personal',
  mood_score INTEGER,
  energy_score INTEGER,
  is_predicted BOOLEAN DEFAULT false,
  ai_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timeline events" ON public.timeline_events
FOR ALL USING (auth.uid() = user_id);

-- Create sense_readings table for Sense-Based Productivity
CREATE TABLE public.sense_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 10),
  focus_level INTEGER NOT NULL CHECK (focus_level >= 1 AND focus_level <= 10),
  mood_level INTEGER NOT NULL CHECK (mood_level >= 1 AND mood_level <= 10),
  ai_recommendations JSONB,
  generated_tasks JSONB,
  reading_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sense_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sense readings" ON public.sense_readings
FOR ALL USING (auth.uid() = user_id);

-- Create activity_history table for unified history
CREATE TABLE public.activity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity history" ON public.activity_history
FOR ALL USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_decision_logs_updated_at
BEFORE UPDATE ON public.decision_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timeline_events_updated_at
BEFORE UPDATE ON public.timeline_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
