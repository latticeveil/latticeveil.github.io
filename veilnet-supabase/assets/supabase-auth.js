// Supabase Authentication Module
class VeilnetAuth {
  constructor() {
    this.user = null;
    this.initialized = false;
  }

  // Initialize auth system
  async init() {
    if (this.initialized) return;
    
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      this.user = session?.user || null;
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        this.user = session?.user || null;
        this.onAuthChange(this.user);
      });
      
      this.initialized = true;
      console.log('Supabase auth initialized');
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  // Sign in with Google OAuth
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/veilnet-supabase/auth/callback`
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      await supabase.auth.signOut();
      this.user = null;
      this.onAuthChange(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.user;
  }

  // Get user profile data
  async getUserProfile() {
    if (!this.user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.user.id)
        .single();
      
      return error ? null : data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateProfile(updates) {
    if (!this.user) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', this.user.id)
        .select()
        .single();
      
      return error ? null : data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return null;
    }
  }

  // Auth change callback (to be overridden)
  onAuthChange(user) {
    // This will be overridden by main app
    console.log('Auth state changed:', user);
  }
}

// Export singleton instance
const veilnetAuth = new VeilnetAuth();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { veilnetAuth };
} else {
  window.veilnetAuth = veilnetAuth;
}
