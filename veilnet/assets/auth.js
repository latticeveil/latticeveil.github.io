// Veilnet Authentication Helper
// Requires supabase-js v2 to be loaded first (window.supabase must exist)

window.VeilnetAuth = (function() {
  // Initialize Supabase client singleton
  const supa = supabase.createClient(
    VEILNET_CONFIG.SUPABASE_URL, 
    VEILNET_CONFIG.SUPABASE_ANON_KEY, 
    {
      auth: { 
        persistSession: true, 
        autoRefreshToken: true, 
        detectSessionInUrl: false 
      }
    }
  );

  // Helper functions
  function setReturnTo(url) {
    localStorage.setItem('veilnet.returnTo', url);
  }

  function getReturnTo(defaultUrl) {
    const returnTo = localStorage.getItem('veilnet.returnTo');
    localStorage.removeItem('veilnet.returnTo');
    return returnTo || defaultUrl;
  }

  // Public API
  return {
    async getUser() {
      const { data: { user } } = await supa.auth.getUser();
      return user;
    },

    async getSession() {
      const { data: { session } } = await supa.auth.getSession();
      return session;
    },

    async logout() {
      await supa.auth.signOut();
    },

    async signInWithGoogleIdToken(idToken) {
      const { data, error } = await supa.auth.signInWithIdToken({ 
        provider: "google", 
        token: idToken 
      });
      return { data, error };
    },

    setReturnTo,
    getReturnTo,

    // Profile helpers (assumes public.profiles table)
    async getMyProfile() {
      const user = await this.getUser();
      if (!user) return null;
      
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // Fallback for legacy "users" table
        if (error.code === 'PGRST116') {
          console.warn('Profile table "users" not found. Please create a "profiles" table with columns: username, display_name, avatar_url, status_message, about_me, theme_color');
          return null;
        }
        throw error;
      }
      
      return data;
    },

    async getProfileByUsername(username) {
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile table "users" not found. Please create a "profiles" table with columns: username, display_name, avatar_url, status_message, about_me, theme_color');
          return null;
        }
        throw error;
      }
      
      return data;
    },

    async updateMyProfile(patch) {
      const user = await this.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update(patch)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile table "users" not found. Please create a "profiles" table with columns: username, display_name, avatar_url, status_message, about_me, theme_color');
          return null;
        }
        throw error;
      }
      
      return data;
    },

    async checkUsernameAvailable(username) {
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select('id')
        .eq('username', username)
        .single();
      
      if (error && error.code === 'PGRST116') {
        console.warn('Profile table "users" not found. Please create a "profiles" table with columns: username, display_name, avatar_url, status_message, about_me, theme_color');
        return false;
      }
      
      return !data; // available if no data found
    },

    async requireAuth() {
      const user = await this.getUser();
      if (user) return true;
      
      this.setReturnTo(window.location.href);
      window.location.href = VEILNET_CONFIG.LOGIN_PATH;
      return false;
    }
  };
})();
