window.VeilnetAuth = (function() {
  let supa = null;
  let pendingProfile = null;

  // Initialize Supabase client
  function init() {
    if (supa) return supa;
    
    // Defensive check: ensure Supabase JS is loaded
    if (typeof window.supabase === "undefined") {
      throw new Error("Supabase JS not loaded. Ensure <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script> is included BEFORE auth.js");
    }
    
    const { createClient } = window.supabase;
    supa = createClient(
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
    supa.auth.onAuthStateChange((event, session) => {
      // Refresh header UI immediately
      if (typeof window.refreshHeaderUI === 'function') {
        window.refreshHeaderUI();
      }
      // Update unread indicators if available
      if (typeof window.updateUnreadIndicator === 'function') {
        window.updateUnreadIndicator();
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
      
      // Clear any local cached profile/session variables
      if (typeof window.clearCachedProfile === 'function') {
        window.clearCachedProfile();
      }
      
      await client.auth.signOut();
      
      // Force immediate UI refresh
      if (typeof window.refreshHeaderUI === 'function') {
        await window.refreshHeaderUI();
      }
      
      // Re-wire the dropdown to ensure it works after logout
      if (typeof window.wireProfileMenuToggle === 'function') {
        window.wireProfileMenuToggle();
      }
      
      // Close dropdown if open (do not permanently hide it)
      const dropdown = document.querySelector('[data-veil-dropdown]');
      if (dropdown) {
        dropdown.classList.remove('open');
        // ensure we never leave it permanently hidden
        if (dropdown.style && dropdown.style.display === 'none') dropdown.style.display = '';
      }
    },

    // Backwards compatibility alias
    async logout() {
      return await this.signOut();
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
      
      const client = init();
      
      // Get user ID in priority order
      let userId;
      if (user.identities && user.identities.length > 0) {
        const googleIdentity = user.identities.find(id => id.provider === 'google');
        if (googleIdentity) {
          userId = googleIdentity.id;
        }
      }
      if (!userId && user.user_metadata && user.user_metadata.sub) {
        userId = user.user_metadata.sub;
      }
      if (!userId) {
        userId = user.id; // fallback to Supabase auth UUID
      }
      
      // Check if username taken by another user (case-insensitive)
      const { data: existing, error: exErr } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id, username")
        .ilike("username", username)
        .limit(1);
      
      if (exErr) throw exErr;
      
      if (existing && existing.length > 0 && existing[0].id !== userId) {
        throw new Error("Username is already taken");
      }
      
      // Upsert by primary key id (prevents null id insert bug)
      const profileData = {
        id: userId,
        email: user.email,
        name: pendingProfile?.name || user.user_metadata?.name || user.email,
        picture: pendingProfile?.picture || user.user_metadata?.picture || null,
        username: username,
        createdat: new Date().toISOString()
      };
      
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single();
      
      if (error) throw error;
      
      // Clear pending profile
      pendingProfile = null;
      sessionStorage.removeItem('veilnet_pending_profile');
      
      return data;
    },

    async isUsernameAvailable(username) {
      if (!username) return false;
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id")
        .ilike("username", username)
        .limit(1);
      
      if (error) {
        console.error("isUsernameAvailable error:", error);
        throw error;
      }
      return !data || data.length === 0; // available if no data found
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

    async getProfileByUsername(username) {
      if (!username) return null;
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id, username, name, picture, aboutme, statusmessage, themecolor, createdat")
        .eq("username", username)
        .maybeSingle();
      
      if (error) {
        console.error("getProfileByUsername error:", error);
        throw error;
      }
      return data;
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
