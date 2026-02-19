window.VeilnetAuth = (function() {
  let supa = null;
  let pendingProfile = null;

  // Image processing helpers
  const ImageProcessor = {
    async processAvatar(file) {
      if (file.type === 'image/svg+xml') {
        throw new Error('SVG files are not supported for avatars');
      }

      const maxSizeKB = 300;
      const targetWidth = 512;
      const targetHeight = 512;

      try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        
        // Calculate crop and resize
        const size = Math.min(width, height);
        const sx = (width - size) / 2;
        const sy = (height - size) / 2;

        // Create canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Draw cropped and resized image
        ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, targetWidth, targetHeight);

        // Encode to WebP with size enforcement
        return await this.encodeWithSizeLimit(canvas, 'image/webp', maxSizeKB, targetWidth, targetHeight);
      } catch (error) {
        throw new Error(`Failed to process avatar: ${error.message}`);
      }
    },

    async processBanner(file) {
      if (file.type === 'image/svg+xml') {
        throw new Error('SVG files are not supported for banners');
      }

      const maxSizeKB = 800;
      const targetWidth = 1600;
      const targetHeight = 400;

      try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        
        // Calculate crop for 4:1 aspect ratio
        const targetAspect = targetWidth / targetHeight;
        const currentAspect = width / height;
        
        let cropWidth, cropHeight, sx, sy;
        
        if (currentAspect > targetAspect) {
          // Image is wider than target - crop sides
          cropHeight = height;
          cropWidth = height * targetAspect;
          sx = (width - cropWidth) / 2;
          sy = 0;
        } else {
          // Image is taller than target - crop top/bottom
          cropWidth = width;
          cropHeight = width / targetAspect;
          sx = 0;
          sy = (height - cropHeight) / 2;
        }

        // Create canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Draw cropped and resized image
        ctx.drawImage(bitmap, sx, sy, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

        // Encode to WebP with size enforcement
        return await this.encodeWithSizeLimit(canvas, 'image/webp', maxSizeKB, targetWidth, targetHeight);
      } catch (error) {
        throw new Error(`Failed to process banner: ${error.message}`);
      }
    },

    async encodeWithSizeLimit(canvas, mimeType, maxSizeKB, fallbackWidth, fallbackHeight) {
      let quality = 0.85;
      let blob;

      // Try to encode at target quality
      do {
        blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, mimeType, quality);
        });

        if (!blob) {
          throw new Error('Failed to encode image');
        }

        if (blob.size <= maxSizeKB * 1024) {
          break;
        }

        quality -= 0.08;
      } while (quality > 0.35);

      // If still too large, try smaller dimensions
      if (blob.size > maxSizeKB * 1024) {
        const smallerCanvas = document.createElement('canvas');
        smallerCanvas.width = fallbackWidth * 0.75;
        smallerCanvas.height = fallbackHeight * 0.75;
        const ctx = smallerCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);

        quality = 0.85;
        do {
          blob = await new Promise((resolve) => {
            smallerCanvas.toBlob(resolve, mimeType, quality);
          });

          if (!blob) {
            throw new Error('Failed to encode image');
          }

          if (blob.size <= maxSizeKB * 1024) {
            break;
          }

          quality -= 0.08;
        } while (quality > 0.35);
      }

      if (blob.size > maxSizeKB * 1024) {
        throw new Error(`Image is too large even after compression. Maximum size is ${maxSizeKB}KB`);
      }

      return {
        blob,
        mime: mimeType,
        ext: 'webp'
      };
    }
  };

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
        .select("id, username, picture, aboutme, statusmessage, themecolor, createdat")
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
        .upsert(
          { id: user.id, username: normalizedUsername },
          { onConflict: "id" }
        )
        .select("id, username, picture, aboutme, statusmessage, themecolor, createdat, updatedat")
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

    async updateProfilePicture(pictureUrl) {
      const user = await this.getUser();
      if (!user || !user.id) throw new Error('Not logged in');
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ picture: pictureUrl })
        .eq("id", user.id)
        .select("id, username, picture, aboutme, statusmessage, themecolor, createdat, updatedat")
        .single();
      
      if (error) throw error;
      return data;
    },

    async updateProfileBanner(bannerUrl) {
      const user = await this.getUser();
      if (!user || !user.id) throw new Error('Not logged in');
      
      const client = init();
      const { data, error } = await client
        .from(VEILNET_CONFIG.PROFILE_TABLE)
        .update({ banner: bannerUrl })
        .eq("id", user.id)
        .select("id, username, picture, banner, aboutme, statusmessage, themecolor, createdat, updatedat")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },

    async uploadAvatar(file) {
      const user = await this.getUser();
      if (!user || !user.id) throw new Error('Not logged in');

      try {
        // Process image
        const processed = await ImageProcessor.processAvatar(file);
        
        // Upload to Supabase Storage
        const client = init();
        const avatarPath = `${user.id}/avatar.${processed.ext}`;
        
        const { error: uploadError } = await client.storage
          .from('avatars')
          .upload(avatarPath, processed.blob, { 
            upsert: true, 
            contentType: processed.mime 
          });

        if (uploadError) throw uploadError;

        // Get public URL with cache-busting
        const { data: { publicUrl } } = client.storage
          .from('avatars')
          .getPublicUrl(avatarPath);

        return `${publicUrl}?v=${Date.now()}`;
      } catch (error) {
        throw new Error(`Avatar upload failed: ${error.message}`);
      }
    },

    async uploadBanner(file) {
      const user = await this.getUser();
      if (!user || !user.id) throw new Error('Not logged in');

      try {
        // Process image
        const processed = await ImageProcessor.processBanner(file);
        
        // Upload to Supabase Storage
        const client = init();
        const bannerPath = `${user.id}/banner.${processed.ext}`;
        
        const { error: uploadError } = await client.storage
          .from('banners')
          .upload(bannerPath, processed.blob, { 
            upsert: true, 
            contentType: processed.mime 
          });

        if (uploadError) throw uploadError;

        // Get public URL with cache-busting
        const { data: { publicUrl } } = client.storage
          .from('banners')
          .getPublicUrl(bannerPath);

        return `${publicUrl}?v=${Date.now()}`;
      } catch (error) {
        throw new Error(`Banner upload failed: ${error.message}`);
      }
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
        .select("id, username, picture, aboutme, statusmessage, themecolor, createdat")
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
      const displayName = username || email;
      
      return { email, username, picture, displayName };
    }
  };
})();
