# Supabase Deployment

## Apply Migrations

```bash
# Get project ref from config.js
SUPABASE_URL=$(grep -o 'https://[^/]*' veilnet/assets/config.js | cut -d'/' -f4)

# Link and push migrations
supabase link --project-ref $SUPABASE_URL
supabase db push
```

## Security Model

- **public.profiles**: Anyone can read, owners can edit (auth.uid() = id)
- **public.users**: Only authenticated users with ownership access
- **Auto-creation**: New users get default profile like "user_12345678"
