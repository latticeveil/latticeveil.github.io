# Veilnet Supabase Integration

This is a modern authentication and messaging system built with Supabase.

## Setup Instructions

1. **Configure Supabase**
   - Update `supabase-config.js` with your project URL and keys
   - Set up Google OAuth in Supabase dashboard
   - Run the SQL schema in Supabase SQL Editor

2. **Deploy**
   - Upload files to your hosting
   - Update OAuth redirect URL in Supabase settings

## Features

- ✅ Google OAuth 2.0 authentication
- ✅ Real-time messaging with Supabase subscriptions
- ✅ User profiles with avatars
- ✅ Row Level Security (RLS) for data protection
- ✅ Cross-tab synchronization
- ✅ Mobile responsive design
- ✅ PostgreSQL database with proper indexing

## Security Notes

- Row Level Security ensures users can only access their own data
- API keys are client-side only (publishable key)
- Server-side operations use service role keys
- OAuth tokens are handled securely by Supabase

## File Structure

```
veilnet-supabase/
├── assets/
│   ├── supabase-config.js      # Supabase client configuration
│   ├── supabase-auth.js        # Authentication system
│   ├── supabase-messaging.js   # Real-time messaging
│   └── veilnet.css          # Styling (shared)
├── supabase-schema.sql          # Database schema
├── supabase-index.html         # Main landing page
├── messages/
│   └── index.html             # Messages interface
├── profile/
│   └── index.html             # User profile
└── README.md                   # This file
```

## Configuration

Replace the placeholder values in `supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://lqghurvonrvrxfwjgkuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZ2h1cnZvbnJ2cnhmd2pna3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODA1OTMsImV4cCI6MjA4Njg1NjU5M30.TUulKqgdUdoaYn9O5SKOJfh61DLprLTvf2fU_9CNF_U';
```

**Important:** The anon key is safe for client-side use. Never expose service role keys.
