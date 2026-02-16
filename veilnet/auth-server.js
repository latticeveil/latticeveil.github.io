const express = require('express');
const session = require('express-session');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'veilnet-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Google OAuth Configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.RENDER_EXTERNAL_URL}/auth/google/callback`
);

// In-memory user store (replace with database in production)
const users = new Map();

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// Routes
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email']
  });
  res.redirect(url);
});

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
