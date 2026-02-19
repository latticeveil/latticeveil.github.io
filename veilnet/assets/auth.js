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
      if (!user || !user.id) return null;
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id, username, name, picture, aboutme, statusmessage, themecolor, createdat")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("getMyProfile error:", error);
        // Don't throw - profile might be auto-creating
        return null;
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

    async setUsername(newUsername) {
      const user = await this.getUser();
      if (!user || !user.id) throw new Error('Not authenticated or missing user id');
      
      // Validate username format
      if (!/^[a-z0-9_]{3,20}$/.test(newUsername.trim().toLowerCase())) {
        throw new Error('Username must be 3-20 characters, only lowercase letters, numbers, and underscores');
      }
      
      const normalizedUsername = newUsername.trim().toLowerCase();
      const client = init();
      
      // Update profiles table
      const { data: profileData, error: profileError } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ username: normalizedUsername })
        .eq("id", user.id)
        .select("id, username, name, picture, aboutme, statusmessage, themecolor, createdat, updatedat")
        .single();
      
      if (profileError) {
        // Handle unique violation
        if (profileError.code === '23505' || profileError.message.includes('unique constraint')) {
          return { ok: false, reason: "taken" };
        }
        throw profileError;
      }
      
      // Also update legacy users table if needed (safe due to email-based RLS)
      try {
        await client
          .from("users")
          .update({ username: normalizedUsername })
          .eq("email", user.email);
      } catch (e) {
        // Ignore if users table doesn't exist or fails
        console.warn("Failed to update legacy users table:", e);
      }
      
      return { ok: true, data: profileData };
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
      
      const trimmedUsername = username.trim();
      if (!trimmedUsername) return null;
      
      const normalizedUsername = trimmedUsername.toLowerCase();
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id, username, name, picture, aboutme, statusmessage, themecolor, createdat")
        .eq("username", normalizedUsername)
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
