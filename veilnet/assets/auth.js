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

  // Listen for auth state changes
  supa.auth.onAuthStateChange(() => {
    if (typeof window.refreshHeaderUI === 'function') {
      window.refreshHeaderUI();
    }
  });

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
        .select("id, email, username, picture, name, aboutme, statusmessage, themecolor, createdat")
        .eq("email", user.email)
        .maybeSingle();
      
      if (error) {
        console.error("getMyProfile error:", error);
        throw error;
      }
      return data;
    },

    async ensureMyProfile() {
      const user = await this.getUser();
      if (!user || !user.email) return null;
      
      let profile = await this.getMyProfile();
      
      if (!profile) {
        const profileData = {
          id: user.id, // Required non-null field
          email: user.email,
          name: user.user_metadata?.name ?? user.email,
          picture: user.user_metadata?.picture ?? null,
          createdat: new Date().toISOString(),
          username: null,
          aboutme: null,
          statusmessage: null,
          themecolor: null
        };
        
        const { data, error } = await supa
          .from(VEILNET_CONFIG.PROFILE_TABLE)
          .insert(profileData)
          .select()
          .single();
        
        if (error) {
          console.error("ensureMyProfile insert error:", error);
          throw new Error(`Failed to create profile: ${error.message}`);
        }
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

    async isUsernameAvailable(username) {
      if (!username) return false;
      
      // Check case-insensitive availability
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("username")
        .ilike("username", username)
        .maybeSingle();
      
      if (error) {
        console.error("isUsernameAvailable error:", error);
        throw error;
      }
      return !data; // available if no data found
    },

    async setUsername(username) {
      const user = await this.getUser();
      if (!user || !user.email) throw new Error('Not authenticated or missing email');
      
      // Validate username format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]{2,15}$/.test(username)) {
        throw new Error('Username must be 3-16 characters, start with letter or underscore, and contain only letters, numbers, and underscores');
      }
      
      // Check availability
      const available = await this.isUsernameAvailable(username);
      if (!available) {
        throw new Error('Username is already taken');
      }
      
      return await this.updateMyProfile({ username });
    },

    async updateMyProfile(patch) {
      const user = await this.getUser();
      if (!user || !user.email) throw new Error('Not authenticated or missing email');
      
      const { data, error } = await supa
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update(patch)
        .eq("email", user.email)
        .select("id, email, username, picture, name, aboutme, statusmessage, themecolor, createdat")
        .single();
      
      if (error) {
        console.error("updateMyProfile error:", error);
        throw error;
      }
      return data;
    },

    async needsUsername() {
      const profile = await this.getMyProfile();
      return !profile || !profile.username;
    }
  };
})();
