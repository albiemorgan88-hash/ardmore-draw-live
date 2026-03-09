-- Add assigned_names column to number_selections
-- This stores the name associated with each number (e.g. buying on behalf of someone)
-- Mirrors the assigned_names column already on draw_subscriptions
ALTER TABLE public.number_selections
ADD COLUMN IF NOT EXISTS assigned_names JSONB DEFAULT '{}';
