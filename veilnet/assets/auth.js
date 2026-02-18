window.VeilnetAuth = (function() {
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

    async requireAuth() {
      const user = await this.getUser();
      if (user) return true;
      
      window.location.href = VEILNET_CONFIG.LOGIN_PATH;
      return false;
    },

    async getMyProfile() {
      const user = await this.getUser();
      if (!user) return null;
      
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
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
      
      if (error) throw error;
      return data;
    }
  };
})();
