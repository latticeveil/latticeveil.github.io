window.VeilnetAuth = (function() {
  let supa = null;
  let pendingProfile = null;

  // Initialize Supabase client
  function init() {
    if (supa) return supa;
    
    supa = supabase.createClient(
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
    supa.auth.onAuthStateChange((event) => {
      if (typeof window.refreshHeaderUI === 'function') {
        window.refreshHeaderUI();
      }
    });

    return supa;
  }

  // Decode Google ID token without verification (client-side only)
  function decodeGoogleToken(token) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      console.error('Failed to decode Google token:', e);
      return null;
    }
  }

  return {
    init() {
      return init();
    },

    async getSession() {
      const client = init();
      const { data: { session } } = await client.auth.getSession();
      return session;
    },

    async getUser() {
      const client = init();
      const { data: { user } } = await client.auth.getUser();
      return user;
    },

    async signOut() {
      const client = init();
      pendingProfile = null;
      sessionStorage.removeItem('veilnet_pending_profile');
      await client.auth.signOut();
    },

    async signInWithGoogleIdToken(idToken) {
      const client = init();
      const { data, error } = await client.auth.signInWithIdToken({
        provider: "google",
        token: idToken
      });
      return { data, error };
    },

    async getMyProfile() {
      const user = await this.getUser();
      if (!user || !user.email) return null;
      
      const client = init();
      const { data, error } = await client
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

    async ensureUserRowFromGoogleToken(idToken) {
      // Decode token to get user info
      const tokenData = decodeGoogleToken(idToken);
      if (!tokenData) throw new Error('Invalid Google ID token');

      const { sub, email, name, picture } = tokenData;
      
      // Store pending profile info in memory and sessionStorage
      pendingProfile = { id: sub, email, name, picture };
      sessionStorage.setItem('veilnet_pending_profile', JSON.stringify(pendingProfile));
      
      return pendingProfile;
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

      const client = init();
      const profileData = {
        id: pendingProfile?.id || user.id,
        email: user.email,
        name: pendingProfile?.name || user.user_metadata?.name || user.email,
        picture: pendingProfile?.picture || user.user_metadata?.picture || null,
        username: username,
        createdat: new Date().toISOString()
      };

      // Check if row exists
      const existing = await this.getMyProfile();
      let result;
      
      if (existing) {
        // Update existing row
        const { data, error } = await client
          .from(VEILNET_CONFIG.PROFILE_TABLE)
          .update({ username })
          .eq("email", user.email)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new row
        const { data, error } = await client
          .from(VEILNET_CONFIG.PROFILE_TABLE)
          .insert(profileData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Clear pending profile
      pendingProfile = null;
      sessionStorage.removeItem('veilnet_pending_profile');
      
      return result;
    },

    async isUsernameAvailable(username) {
      if (!username) return false;
      
      const client = init();
      const { data, error } = await client
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

    getPendingProfile() {
      if (pendingProfile) return pendingProfile;
      
      try {
        const stored = sessionStorage.getItem('veilnet_pending_profile');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    },

    async getDisplayIdentity() {
      const user = await this.getUser();
      if (!user) return null;
      
      // Check for pending profile first
      const pending = this.getPendingProfile();
      if (pending) {
        return {
          email: pending.email,
          username: null,
          picture: pending.picture,
          displayName: pending.name || pending.email
        };
      }
      
      const profile = await this.getMyProfile();
      const email = user.email;
      const username = profile?.username;
      const picture = profile?.picture || user.user_metadata?.picture;
      const displayName = username || profile?.name || user.user_metadata?.name || email;
      
      return { email, username, picture, displayName };
    }
  };
})();
