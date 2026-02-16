// Supabase Configuration
const SUPABASE_URL = 'https://lqghurvonrvrxfwjgkuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZ2h1cnZvbnJ2cnhmd2pna3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODA1OTMsImV4cCI6MjA4Njg1NjU5M30.TUulKqgdUdoaYn9O5SKOJfh61DLprLTvf2fU_9CNF_U';

// Initialize Supabase client
const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
} else {
  window.supabase = supabase;
  window.SUPABASE_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY };
}
