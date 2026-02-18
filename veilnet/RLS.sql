-- Supabase RLS policies for public.users table
-- Run this in Supabase SQL Editor

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add unique constraints if they don't exist
-- Note: If these already exist, statements will error - that's fine
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON public.users (lower(username)) WHERE username IS NOT NULL;

-- Drop existing policies if they exist (for clean re-creation)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Policy: Users can SELECT their own row (by email)
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Policy: Users can INSERT their own row (email must match auth email)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

-- Policy: Users can UPDATE their own row (email must match auth email)
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
