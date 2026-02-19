window.VeilnetAuth = (function() {
  try {
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
        VEILNET_CONFIG.SUPABASE_ANON_KEY
      );
      return supa;
    }

    // Decode Google ID token (simple base64 decode)
    function decodeGoogleToken(idToken) {
      try {
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(atob(parts[1]));
        return payload;
      } catch (e) {
        console.error('Failed to decode Google token:', e);
        return null;
      }
    }

    // Function declarations - defined BEFORE export
    async function uploadAvatar(file) {
      const client = init();
      const { data: { user }, error: ue } = await client.auth.getUser();
      if (!user) throw new Error("Not logged in");
      if (ue) throw ue;
      
      // Validate file
      if (!file) throw new Error('No file selected');
      if (!file.type || !file.type.startsWith('image/')) throw new Error('File must be an image');
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large (max 5MB)');

      // Determine extension
      const ext = file.type === 'image/png' ? 'png' : 
                  file.type === 'image/jpeg' ? 'jpg' : 
                  file.type === 'image/webp' ? 'webp' : 'png';

      // Build deterministic path - MUST start with user.id/
      const path = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const { error: upErr } = await client.storage
        .from('avatars')
        .upload(path, file, { 
          upsert: true, 
          contentType: file.type,
          cacheControl: '3600'
        });

      if (upErr) throw upErr;

      // Get public URL with cache-busting
      const { data } = client.storage.from('avatars').getPublicUrl(path);
      return `${data.publicUrl}?v=${Date.now()}`;
    }

    async function uploadBanner(file) {
      const client = init();
      const { data: { user }, error: ue } = await client.auth.getUser();
      if (!user) throw new Error("Not logged in");
      if (ue) throw ue;
      
      // Validate file
      if (!file) throw new Error('No file selected');
      if (!file.type || !file.type.startsWith('image/')) throw new Error('File must be an image');
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large (max 5MB)');

      // Determine extension
      const ext = file.type === 'image/png' ? 'png' : 
                  file.type === 'image/jpeg' ? 'jpg' : 
                  file.type === 'image/webp' ? 'webp' : 'png';

      // Build deterministic path - MUST start with user.id/
      const path = `${user.id}/banner.${ext}`;

      // Debug logging
      console.log('[uploadBanner] uploading to:', path, 'bucket:', 'banners', 'type:', file.type, 'size:', file.size);

      // Upload to Supabase Storage
      const { error: upErr } = await client.storage
        .from('banners')
        .upload(path, file, { 
          upsert: true, 
          contentType: file.type,
          cacheControl: '3600'
        });

      if (upErr) throw upErr;

      // Get public URL with cache-busting
      const { data } = client.storage.from('banners').getPublicUrl(path);
      return `${data.publicUrl}?v=${Date.now()}`;
    }

    async function updateProfilePicture(pictureUrl) {
      const client = init();
      const { data: { user }, error: ue } = await client.auth.getUser();
      if (!user) throw new Error("Not logged in");
      if (ue) throw ue;
      
      // Normalize: allow null/undefined to clear avatar
      const nextUrl = pictureUrl && pictureUrl.trim() ? pictureUrl.trim() : null;
      
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ picture: nextUrl })
        .eq("id", user.id)
        .select("id, username, picture, aboutme, statusmessage, themecolor, createdat, updatedat")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }

    async function updateProfileBanner(bannerUrl) {
      const client = init();
      const { data: { user }, error: ue } = await client.auth.getUser();
      if (!user) throw new Error("Not logged in");
      if (ue) throw ue;
      
      // Normalize: allow null/undefined to clear banner
      const nextUrl = bannerUrl && bannerUrl.trim() ? bannerUrl.trim() : null;
      
      // Debug logging
      console.log('[updateProfileBanner] setting banner to:', nextUrl);
      
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ banner: nextUrl })
        .eq("id", user.id)
        .select("id, username, picture, banner, aboutme, statusmessage, themecolor, createdat, updatedat")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }

    async function signOut() {
      const client = init();
      pendingProfile = null;
      sessionStorage.removeItem('veilnet_pending_profile');
      
      // Clear any local cached profile/session variables
      if (typeof window.clearCachedProfile === 'function') {
        window.clearCachedProfile();
      }
      
      const { error } = await client.auth.signOut();
      return { error };
    }

    // Backward compatibility alias
    async function logout() {
      return await signOut();
    }

    async function getToken() {
      const client = init();
      const { data: { session } } = await client.auth.getSession();
      return session?.access_token || null;
    }

    // Return API object - ALL FUNCTIONS DEFINED ABOVE
    const VeilnetAuth = {
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

      async signInWithGoogle() {
        const client = init();
        
        // Use Google's popup sign-in
        return new Promise((resolve, reject) => {
          google.accounts.id.initialize({
            client_id: VEILNET_CONFIG.GOOGLE_CLIENT_ID,
            callback: async (response) => {
              try {
                const { data, error } = await client.auth.signInWithIdToken({
                  provider: "google",
                  token: response.credential
                });
                resolve({ data, error });
              } catch (err) {
                reject(err);
              }
            }
          });
          
          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              // Fallback to popup if prompt is not displayed
              google.accounts.id.renderButton(
                document.createElement('div'),
                { theme: 'outline', size: 'large' }
              );
            }
          });
        });
      },

      async getMyProfile() {
        const client = init();
        const { data: { user }, error: ue } = await client.auth.getUser();
        if (!user) return null;
        if (ue) return null;
        
        const { data, error } = await client
          .from(VEILNET_CONFIG.PROFILE_TABLE)
          .select("id, username, picture, banner, aboutme, statusmessage, themecolor, createdat")
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
        const client = init();
        const { data: { user }, error: ue } = await client.auth.getUser();
        if (!user || !user.id) throw new Error('Not authenticated or missing user id');
        if (ue) throw ue;
        
        // Validate username format
        if (!/^[a-z0-9_]{3,20}$/.test(newUsername.trim().toLowerCase())) {
          throw new Error('Username must be 3-20 characters, only lowercase letters, numbers, and underscores');
        }
        
        const normalizedUsername = newUsername.trim().toLowerCase();
        
        // Update profiles table
        const { data: profileData, error: profileError } = await client
          .from(VEILNET_CONFIG.PROFILE_TABLE)
          .upsert(
            { id: user.id, username: normalizedUsername },
            { onConflict: "id" }
          )
          .select("id, username, picture, banner, aboutme, statusmessage, themecolor, createdat, updatedat")
          .maybeSingle();
        
        if (profileError) {
          // Handle unique violation
          if (profileError.code === '23505' || profileError.message.includes('unique constraint')) {
            return { ok: false, reason: "taken" };
          }
          throw profileError;
        }
        
        // Clear pending profile cache
        pendingProfile = null;
        sessionStorage.removeItem('veilnet_pending_profile');
        
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
          .select("id, username, picture, banner, aboutme, statusmessage, themecolor, createdat")
          .eq("username", normalizedUsername)
          .maybeSingle();
        
        if (error) {
          console.error("getProfileByUsername error:", error);
          throw error;
        }
        return data;
      },

      async getDisplayIdentity() {
        const client = init();
        const { data: { user }, error: ue } = await client.auth.getUser();
        if (!user) return null;
        if (ue) return null;
        
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
        const displayName = username || email;
        
        return { email, username, picture, displayName };
      },

      // Upload functions - all defined above
      uploadAvatar,
      uploadBanner,
      updateProfilePicture,
      updateProfileBanner,
      signOut,
      logout,    // Backward compatibility alias
      setUsername,
      getToken,
      isUsernameAvailable,
      getPendingProfile,
      getProfileByUsername,
      getDisplayIdentity
    };

    // Set global object
    window.VeilnetAuth = VeilnetAuth;
    console.log("[auth.js] VeilnetAuth ready:", Object.keys(window.VeilnetAuth || {}));

  } catch (e) {
    console.error("[auth.js] Fatal load error:", e);
    // Fallback: ensure VeilnetAuth exists even if helpers fail
    window.VeilnetAuth = window.VeilnetAuth || {};
  }
})();
