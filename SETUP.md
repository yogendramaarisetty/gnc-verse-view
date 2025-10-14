# GNC Verse View - Backend Integration Setup Guide

This guide will help you set up the complete backend integration for the GNC Verse View application using Supabase.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available)
- Git installed

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `gnc-verse-view`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Configure Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY)

3. Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: For production
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql` and paste it into the SQL editor
3. Click **Run** to execute the schema
4. Verify the tables were created in **Table Editor**

## Step 4: Configure Storage

1. In your Supabase dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name: `song-thumbnails`
4. Make it **Public**: Yes
5. Click **Create bucket**

## Step 5: Set Up Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure **Site URL**: `http://localhost:3000` (for development)
3. Add **Redirect URLs**: `http://localhost:3000/auth/callback`
4. Go to **Authentication** → **Providers**
5. Enable **Email** provider
6. Enable **Google** provider (optional):
   - Get OAuth credentials from Google Cloud Console
   - Add Client ID and Client Secret

## Step 6: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Step 7: Run Migration Scripts

1. **Migrate Artists**:
```bash
npx tsx scripts/migrate-artists.ts
```

2. **Migrate Songs**:
```bash
npx tsx scripts/migrate-songs.ts
```

Or run both at once:
```bash
npx tsx scripts/migrate-all.ts
```

## Step 8: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application!

## Step 9: Test the Integration

1. **Test Authentication**:
   - Click "Sign In" button
   - Try creating an account with email/password
   - Test Google OAuth (if configured)

2. **Test Song Features**:
   - Browse songs by language
   - Add songs to favorites
   - Create playlists
   - Search for songs

3. **Test User Data**:
   - Check that favorites persist after refresh
   - Verify recently viewed songs are tracked
   - Test playlist creation and management

## Production Deployment

### Vercel Deployment

1. **Push to GitHub**:
```bash
git add .
git commit -m "Add Supabase backend integration"
git push origin main
```

2. **Deploy to Vercel**:
   - Connect your GitHub repo to Vercel
   - Add environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Deploy

3. **Update Supabase Settings**:
   - Update **Site URL** to your Vercel domain
   - Add **Redirect URLs** for your production domain

### Environment Variables for Production

In Vercel dashboard, add:
```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**:
   - Check that your environment variables are correct
   - Ensure `.env.local` is in the project root
   - Restart your development server

2. **Database connection issues**:
   - Verify your Supabase project is active
   - Check that the schema was created correctly
   - Ensure RLS policies are set up

3. **Authentication not working**:
   - Check redirect URLs in Supabase settings
   - Verify OAuth provider configuration
   - Check browser console for errors

4. **Migration script errors**:
   - Ensure environment variables are set
   - Check that Supabase project is accessible
   - Verify the schema was created first

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the [Next.js Documentation](https://nextjs.org/docs)
- Check the application logs in browser console
- Verify all environment variables are set correctly

## Cost Considerations

### Supabase Free Tier Limits
- **Database**: 500MB
- **File Storage**: 1GB
- **Monthly Active Users**: 50,000
- **Bandwidth**: 2GB

### When to Upgrade
- Database size > 500MB
- Storage needs > 1GB
- More than 50,000 monthly users
- Need advanced features (backups, monitoring)

### Estimated Costs
- **Supabase Pro**: $25/month
- **Vercel Pro**: $20/month
- **Total**: ~$45/month for production scale

## Next Steps

1. **Add More Songs**: Use the admin interface or API to add more songs
2. **Customize UI**: Modify components to match your brand
3. **Add Features**: Implement audio playback, social sharing, etc.
4. **Monitor Usage**: Set up analytics and monitoring
5. **Scale**: Consider AWS migration for high-traffic applications

## Support

For issues with this setup:
1. Check the troubleshooting section above
2. Review Supabase and Next.js documentation
3. Check the application logs
4. Verify all configuration steps were completed

---

**Congratulations!** You now have a fully functional Christian songbook application with user authentication, favorites, playlists, and more! 🎉
