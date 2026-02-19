window.VeilnetAuth = (function() {
  try {
    let supa = null;
    let pendingProfile = null;

    // Initialize Supabase client - hardened with proper error checking
    function init() {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error("Supabase JS not loaded. Check script order and CDN URL.");
      }
      if (!window.VEILNET_CONFIG?.SUPABASE_URL || !window.VEILNET_CONFIG?.SUPABASE_ANON_KEY) {
        throw new Error("Missing VEILNET_CONFIG Supabase URL/anon key.");
      }
      if (!window.__veilnet_supabase) {
        window.__veilnet_supabase = window.supabase.createClient(
          window.VEILNET_CONFIG.SUPABASE_URL,
          window.VEILNET_CONFIG.SUPABASE_ANON_KEY
        );
      }
      return window.__veilnet_supabase;
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

    // Safe stub helper for functions that might not be ready
    function _notReady(name) {
      return async function () { throw new Error(name + " not ready"); };
    }

    // Safe wrapper for exports - ensures method always exists
    const safe = (fnName, fn) => (typeof fn === 'function' ? fn : async () => { throw new Error(fnName + " not implemented"); });
    const ABOUT_ME_MAX = 280;
    const THEME_IDS = Object.freeze([
      "default",
      "ember",
      "neon",
      "ocean",
      "rose",
      "mint",
      "slate",
      "gold"
    ]);

    function sanitizeAboutMe(input) {
      let s = (input ?? "").toString();
      s = s.replace(/\r\n/g, "\n");
      // Remove control chars except newlines and tabs
      s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
      s = s.trim();
      if (!s) return null;
      if (s.length > ABOUT_ME_MAX) s = s.slice(0, ABOUT_ME_MAX);
      return s;
    }

    function sanitizeThemeId(themeId) {
      const normalized = String(themeId || "").trim().toLowerCase();
      return THEME_IDS.includes(normalized) ? normalized : "default";
    }

    function normalizeAboutMeWriteError(error) {
      const code = String(error?.code || "");
      const message = String(error?.message || "");

      if (code === "42703" || /column\s+["']?aboutme["']?\s+does not exist/i.test(message)) {
        return new Error('Database schema missing "public.profiles.aboutme". Run the Supabase SQL migration, then retry.');
      }

      if (code === "42501" || /row-level security|permission denied/i.test(message)) {
        return new Error('Update blocked by RLS policy. Ensure owner update policy exists on public.profiles (auth.uid() = id).');
      }

      return error;
    }

    function normalizeThemeWriteError(error) {
      const code = String(error?.code || "");
      const message = String(error?.message || "");

      if (code === "42703" || /column\s+["']?theme["']?\s+does not exist/i.test(message)) {
        return new Error('Database schema missing "public.profiles.theme". Run the Supabase SQL migration, then retry.');
      }

      if (code === "42501" || /row-level security|permission denied/i.test(message)) {
        return new Error('Theme update blocked by RLS policy. Ensure owner update policy exists on public.profiles (auth.uid() = id).');
      }

      return error;
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
        .select("id, username, picture, aboutme, statusmessage, theme, themecolor, createdat, updatedat")
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
        .select("id, username, picture, banner, aboutme, statusmessage, theme, themecolor, createdat, updatedat")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }

    async function updateAboutMe(aboutMeText) {
      const client = init();
      const { data: userData, error: userErr } = await client.auth.getUser();
      if (userErr) throw userErr;

      const user = userData?.user;
      if (!user) throw new Error("Not logged in");

      const value = sanitizeAboutMe(aboutMeText);
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ aboutme: value })
        .eq("id", user.id)
        .select("aboutme")
        .maybeSingle();

      if (error) throw normalizeAboutMeWriteError(error);
      return data?.aboutme ?? null;
    }

    async function updateTheme(themeId) {
      const safeId = sanitizeThemeId(themeId);
      const client = init();
      const { data: userData, error: userErr } = await client.auth.getUser();
      if (userErr) throw userErr;

      const user = userData?.user;
      if (!user) throw new Error("Not logged in");

      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ theme: safeId })
        .eq("id", user.id)
        .select("theme")
        .maybeSingle();

      if (error) throw normalizeThemeWriteError(error);
      return data?.theme || safeId;
    }

    async function getMyTheme() {
      const client = init();
      const { data: { user }, error: userErr } = await client.auth.getUser();
      if (userErr) throw userErr;
      if (!user) return null;

      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("theme")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        const code = String(error?.code || "");
        const message = String(error?.message || "");
        if (code === "42703" || /column\s+["']?theme["']?\s+does not exist/i.test(message)) {
          return null;
        }
        throw error;
      }

      if (!data?.theme) return null;
      return sanitizeThemeId(data.theme);
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

    // Wrapper for compatibility - uses correct Supabase v2 API internally
    async function signInWithGoogleIdToken(idToken) {
      const client = init();
      if (!idToken) throw new Error("Missing Google ID token");
      
      console.log("[google login] supabase loaded:", !!window.supabase, "client auth:", !!client.auth);
      
      const { data, error } = await client.auth.signInWithIdToken({
        provider: "google",
        token: idToken
      });
      if (error) throw error;
      return data;
    }

    async function getSession() {
      const client = init();
      const { data: { session } } = await client.auth.getSession();
      return session;
    }

    async function getUser() {
      const client = init();
      const { data: { user } } = await client.auth.getUser();
      return user;
    }

    async function signInWithGoogle() {
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
    }

    async function getMyProfile() {
      const client = init();
      const { data: { user }, error: ue } = await client.auth.getUser();
      if (!user) return null;
      if (ue) return null;
      
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id, username, picture, banner, aboutme, statusmessage, theme, themecolor, createdat")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("getMyProfile error:", error);
        // Don't throw - profile might be auto-creating
        return null;
      }
      return data;
    }

    async function ensureUserRowFromGoogleToken(idToken) {
      // Decode token to get user info
      const tokenData = decodeGoogleToken(idToken);
      if (!tokenData) throw new Error('Invalid Google ID token');

      const { sub, email, name, picture } = tokenData;
      
      // Store pending profile info in memory and sessionStorage
      pendingProfile = { id: sub, email, name, picture };
      sessionStorage.setItem('veilnet_pending_profile', JSON.stringify(pendingProfile));
      
      return pendingProfile;
    }

    async function setUsername(newUsername) {
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
        .select("id, username, picture, banner, aboutme, statusmessage, theme, themecolor, createdat, updatedat")
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
    }

    async function isUsernameAvailable(username) {
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
    }

    function getPendingProfile() {
      if (pendingProfile) return pendingProfile;
      
      try {
        const stored = sessionStorage.getItem('veilnet_pending_profile');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }

    async function getProfileByUsername(username) {
      if (!username) return null;
      
      const trimmedUsername = username.trim();
      if (!trimmedUsername) return null;
      
      const normalizedUsername = trimmedUsername.toLowerCase();
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .select("id, username, picture, banner, aboutme, statusmessage, theme, themecolor, createdat")
        .eq("username", normalizedUsername)
        .maybeSingle();
      
      if (error) {
        console.error("getProfileByUsername error:", error);
        throw error;
      }
      return data;
    }

    async function getDisplayIdentity() {
      const client = init();
      const { data: { user }, error: ue } = await client.auth.getUser();
      if (!user) return null;
      if (ue) return null;
      
      // Check for pending profile first
      const pending = getPendingProfile();
      if (pending) {
        return {
          email: pending.email,
          username: null,
          picture: pending.picture,
          displayName: pending.name || pending.email
        };
      }
      
      const profile = await getMyProfile();
      const email = user.email;
      const username = profile?.username;
      const picture = profile?.picture || user.user_metadata?.picture;
      const displayName = username || email;
      
      return { email, username, picture, displayName };
    }

    // Set global object - build using ONLY valid identifiers with safe stubs
    const VeilnetAuth = {
      init: safe("init", init),
      getSession: safe("getSession", getSession),
      getUser: safe("getUser", getUser),
      signInWithGoogle: safe("signInWithGoogle", signInWithGoogle),
      signInWithGoogleIdToken: safe("signInWithGoogleIdToken", signInWithGoogleIdToken),
      signOut: safe("signOut", signOut),
      logout: safe("logout", logout),
      setUsername: safe("setUsername", setUsername),
      getToken: safe("getToken", getToken),
      uploadAvatar: safe("uploadAvatar", uploadAvatar),
      uploadBanner: safe("uploadBanner", uploadBanner),
      updateProfilePicture: safe("updateProfilePicture", updateProfilePicture),
      updateProfileBanner: safe("updateProfileBanner", updateProfileBanner),
      updateAboutMe: safe("updateAboutMe", updateAboutMe),
      updateTheme: safe("updateTheme", updateTheme),
      isUsernameAvailable: safe("isUsernameAvailable", isUsernameAvailable),
      getPendingProfile: safe("getPendingProfile", getPendingProfile),
      getProfileByUsername: safe("getProfileByUsername", getProfileByUsername),
      getDisplayIdentity: safe("getDisplayIdentity", getDisplayIdentity),
      getMyProfile: safe("getMyProfile", getMyProfile),
      getMyTheme: safe("getMyTheme", getMyTheme)
    };

    console.log("[auth.js] VeilnetAuth ready:", Object.keys(VeilnetAuth));
    return VeilnetAuth;   // <<< CRITICAL

  } catch (e) {
    console.error("[auth.js] Fatal load error:", e);
    // return a minimal safe API so site doesn't implode
    return {
      init: function(){ throw e; },
      getSession: async function(){ return null; },
      getUser: async function(){ return null; },
      signInWithGoogleIdToken: async function(){ throw e; },
      signOut: async function(){},
      logout: async function(){},
      setUsername: async function(){ throw e; },
      updateAboutMe: async function(){ throw e; },
      updateTheme: async function(){ throw e; },
      getMyTheme: async function(){ return null; }
    };
  }
})();
