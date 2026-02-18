window.VEILNET_CONFIG = {
  // Supabase configuration
  SUPABASE_URL: "https://<your-project-ref>.supabase.co",
  SUPABASE_ANON_KEY: "<your public anon key OR sb_publishable key>",
  
  // Google OAuth configuration
  GOOGLE_CLIENT_ID: "<your google client id ...apps.googleusercontent.com>",
  
  // Database configuration
  PROFILE_TABLE: "profiles",  // assumes user created public.profiles table
  
  // URL configuration
  BASE_PATH: "/veilnet",
  LOGIN_PATH: "/veilnet/login.html"
};
