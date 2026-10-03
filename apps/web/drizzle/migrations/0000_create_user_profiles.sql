CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT CHECK (char_length(display_name) <= 100),
  avatar_url TEXT CHECK (char_length(avatar_url) <= 2048),
  paypal_sandbox_connected BOOLEAN NOT NULL DEFAULT false,
  agent_persona TEXT CHECK (agent_persona IN ('careful', 'balanced', 'autonomous')),
  first_mandate TEXT CHECK (char_length(first_mandate) <= 500),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);