# Supabase Deployment

## Apply Migrations to Hosted Project

```bash
# Login to Supabase
supabase login

# Link to project (from config.js)
supabase link --project-ref lqghurvonrvrxfwjgkuu

# Push migrations
supabase db push
```

## Security Model

- **public.profiles**: Anyone can read, owners can edit (auth.uid() = id)
- **public.users**: No public access, locked down
- **Auto-creation**: New users get default profile like "user_12345678"
