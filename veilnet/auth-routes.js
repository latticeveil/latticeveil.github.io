const { OAuth2Client } = require('google-auth-library');
const session = require('express-session');

// Google OAuth Configuration - using environment variables for security
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.RENDER_EXTERNAL_URL}/auth/google/callback`
);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// In-memory user store (replace with database in production)
const users = new Map();

// Routes
function setupAuthRoutes(app) {
  // Google OAuth login
  app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email']
    });
    res.redirect(url);
  });

  // Google OAuth callback
  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { tokens } = await oauth2Client.getToken(req.query.code);
      oauth2Client.setCredentials(tokens);
      
      // Get user info
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      
      // Create or get user
      const userId = payload.sub;
      if (!users.has(userId)) {
        users.set(userId, {
          id: userId,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          createdAt: new Date()
        });
      }
      
      // Set session
      req.session.userId = userId;
      
      // Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL}?login=success&user=${encodeURIComponent(JSON.stringify(users.get(userId)))}`);
      
    } catch (error) {
      console.error('Google auth error:', error);
      res.redirect(`${process.env.FRONTEND_URL}?login=error`);
    }
  });

  // Get current user
  app.get('/api/user', isAuthenticated, (req, res) => {
    const user = users.get(req.session.userId);
    res.json(user);
  });

  // Logout
  app.post('/api/logout', isAuthenticated, (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });
}

module.exports = { setupAuthRoutes, isAuthenticated };
