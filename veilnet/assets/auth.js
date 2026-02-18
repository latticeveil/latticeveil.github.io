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
      if (!user || !user.email) return null;
      
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("email, username, picture, name, aboutme, statusmessage, themecolor, createdat")
        .eq("email", user.email)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },

    async ensureMyProfile() {
      const user = await this.getUser();
      if (!user || !user.email) return null;
      
      let profile = await this.getMyProfile();
      
      if (!profile) {
        const { data, error } = await supa
          .from(VEILNET_CONFIG.PROFILE_TABLE)
          .insert({
            email: user.email,
            name: user.user_metadata?.name ?? user.email,
            picture: user.user_metadata?.picture ?? null,
            createdat: new Date().toISOString(),
            username: null,
            aboutme: null,
            statusmessage: null,
            themecolor: null
          })
          .select()
          .single();
        
        if (error) throw error;
        profile = data;
      }
      
      return profile;
    },

    async getDisplayIdentity() {
      const user = await this.getUser();
      if (!user) return null;
      
      const profile = await this.ensureMyProfile();
      const email = user.email;
      const username = profile?.username;
      const picture = profile?.picture || user.user_metadata?.picture;
      const displayName = username || profile?.name || user.user_metadata?.name || email;
      
      return { email, username, picture, displayName };
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
