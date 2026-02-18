# Veilnet

A modern web application built with vanilla JavaScript and CSS.

## Features

- **Demo Mode**: Interactive demonstration of Veilnet functionality
- **Responsive Design**: Works across desktop and mobile devices
- **Modern UI**: Clean, minimalist interface with Veilnet branding

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Deployment**: GitHub Pages
- **Authentication**: Google OAuth + Supabase Auth via `signInWithIdToken()`
- **Database**: Supabase (PostgreSQL)

## Project Structure

```
veilnet/
├── index.html          # Main landing page
├── assets/
│   ├── veilnet.js     # Core JavaScript functionality
│   ├── veilnet.css    # Styling and theming
│   └── images/         # UI assets and icons
├── community/         # Community features
├── messages/          # Messaging system
├── profile/           # User profiles
├── settings/          # Application settings
└── device.html        # Device authorization
```

## Getting Started

### 1. Configure Authentication

Edit `veilnet/assets/config.js` and add your credentials:

```javascript
window.VEILNET_CONFIG = {
  SUPABASE_URL: "https://<your-project-ref>.supabase.co",
  SUPABASE_ANON_KEY: "<your public anon key>",
  GOOGLE_CLIENT_ID: "<your google client id ...apps.googleusercontent.com>",
  // ... other settings
};
```

### 2. Database Setup

Create a `profiles` table in Supabase with:
- `id` (uuid, primary key)
- `username` (text, unique) 
- `display_name` (text)
- `avatar_url` (text)
- `status_message` (text)
- `about_me` (text)
- `theme_color` (text)

### 3. Deploy and Test

1. Clone this repository
2. Configure your credentials in `config.js`
3. Deploy to GitHub Pages
4. Visit `https://<username>.github.io/veilnet/`

## Current Status

✅ **Working**: Demo mode with clean UI
✅ **Deployed**: GitHub Pages integration
✅ **Stable**: No authentication issues

---

*Built with modern web standards and deployed via GitHub Pages.*
