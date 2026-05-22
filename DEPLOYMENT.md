# 📚 BookCAT Deployment Guide

Complete guide to deploying BookCAT to Netlify with Supabase backend integration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Netlify Configuration](#netlify-configuration)
6. [Environment Variables](#environment-variables)
7. [Deployment Steps](#deployment-steps)
8. [Supabase Production Setup](#supabase-production-setup)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Performance Optimization](#performance-optimization)
13. [Rollback Procedures](#rollback-procedures)

---

## Project Overview

**BookCAT** is a modern reading tracking application with the following core capabilities:

- 📚 Personal library management with ISBN barcode scanning
- ⏱️ Reading session tracking and analytics
- 📊 Advanced stats and insights with real-time progress
- 🔍 AI-powered mood-based book discovery
- 🧠 Daily quizzes and book facts
- 👥 Community features with real-time chat
- 🔄 Book exchange marketplace
- 📱 Progressive Web App (PWA) support

### Architecture

```
Frontend (React 18 + Vite)
       ↓
Netlify (Static hosting)
       ↓
Supabase (Backend + Database)
       ├── PostgreSQL database
       ├── Authentication
       ├── Real-time subscriptions
       ├── Edge Functions
       └── Storage (images)
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.2.0 |
| **Build Tool** | Vite | 5.1.4 |
| **Styling** | Tailwind CSS | 4.0.0 |
| **Package Manager** | npm (monorepo) | 10.0.0+ |
| **Hosting** | Netlify | Latest |
| **Backend** | Supabase | Latest |
| **Database** | PostgreSQL | 15+ |
| **Authentication** | Supabase Auth | Built-in |
| **PWA** | Vite PWA Plugin | 1.2.0 |

---

## Prerequisites

### System Requirements

- **Node.js**: `18.17.0+` or `20.x LTS`
- **npm**: `10.0.0+`
- **Git**: `2.38+`
- **Operating System**: macOS, Linux, or Windows (with WSL2 recommended)

### Accounts & Services

1. **Netlify Account** - [https://netlify.com](https://netlify.com)
2. **GitHub/GitLab Account** - for version control
3. **Supabase Project** - production database
4. **External APIs**:
   - Google Books API key (free tier available)
   - NYT Books API key (free with registration)
   - Google Gemini API key (for mood search)
   - Potentially RSS feed aggregation sources

### Verify Prerequisites

```bash
# Check Node version
node --version
# Expected: v18.17.0 or higher

# Check npm version
npm --version
# Expected: 10.0.0 or higher

# Check git
git --version
# Expected: 2.38+
```

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bookcat.git
cd bookcat
```

### 2. Install Dependencies

Since this is a monorepo using npm workspaces:

```bash
# Install all dependencies for both root and apps
npm install

# Verify installation
npm list
```

### 3. Environment Variables (Local)

Create an `.env.local` file in `apps/web/`:

```bash
cd apps/web
```

Create `.env.local`:

```env
# Supabase (local development)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# External APIs (optional for development)
VITE_GOOGLE_BOOKS_API_KEY=your-key
VITE_NYT_API_KEY=your-key
VITE_GEMINI_API_KEY=your-key
```

### 4. Start Development Environment

**Terminal 1 - Supabase (local)**:

```bash
supabase start
# This will output connection details including VITE_SUPABASE_ANON_KEY
```

**Terminal 2 - Frontend**:

```bash
npm run dev
# Runs React dev server at http://localhost:5173
```

### 5. Verify Local Setup

- Navigate to [http://localhost:5173](http://localhost:5173)
- You should see the BookCAT splash screen
- Try signing up with a test account
- Verify the database connection in Supabase Studio

---

## Netlify Configuration

### 1. Connect Repository to Netlify

#### Option A: Using Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"New site from Git"**
3. Select your Git provider (GitHub/GitLab)
4. Authorize Netlify
5. Choose the repository: `bookcat`
6. Click **"Deploy site"**

#### Option B: Using Netlify CLI

```bash
# Install Netlify CLI globally (optional)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to production site
netlify link

# Deploy
netlify deploy --prod
```

### 2. Build Configuration in Netlify UI

In **Netlify Dashboard → Site settings → Build & deploy**:

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Publish directory** | `apps/web/dist` |
| **Package directory** | `apps/web` |
| **Node version** | `18.17.0` (or 20.x) |

> **Note**: The root `netlify.toml` has a comment explaining why build settings are in the UI instead — this avoids conflicts with the monorepo structure.

### 3. Important netlify.toml Configuration

The project includes two `netlify.toml` files:

**Root** (`netlify.toml`):
- Contains SPA redirect rules (catch-all for React Router)
- Manifest file headers

**App** (`apps/web/netlify.toml`):
- Additional app-specific headers
- Redirects configuration

Both files work together to:
- Enable client-side routing (React Router)
- Serve manifest.json with correct MIME type
- Handle PWA service worker registration

---

## Environment Variables

### Frontend Environment Variables

Set these in **Netlify Dashboard → Site settings → Build & deploy → Environment**

```env
# === Supabase (REQUIRED) ===
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5... (full key)

# === External APIs ===
VITE_GOOGLE_BOOKS_API_KEY=AIza... (optional)
VITE_NYT_API_KEY=your-nyt-key (optional)
VITE_GEMINI_API_KEY=your-gemini-key (optional)

# === App Config (optional) ===
VITE_APP_URL=https://book-cat-web.vercel.app
```

### Server Environment Variables (Supabase Edge Functions)

Set these in **Supabase Dashboard → Settings → Edge Functions**:

```env
# For fetch-nyt-bestsellers function
NYT_API_KEY=your-nyt-key

# For generate-book-fact function
GEMINI_API_KEY=your-gemini-key

# For generate-hot-takes function
GEMINI_API_KEY=your-gemini-key
```

### How to Get API Keys

#### Google Books API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Books API**
4. Create an **API key**
5. Copy the key to `VITE_GOOGLE_BOOKS_API_KEY`

#### NYT Books API
1. Go to [NYT Developer Portal](https://developer.nytimes.com)
2. Sign up / login
3. Create a new app
4. Request **Books API** access
5. Copy the key to `VITE_NYT_API_KEY`

#### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Create API key"**
3. Copy the key to `VITE_GEMINI_API_KEY`

---

## Deployment Steps

### Step 1: Prepare for Deployment

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run lint checks (optional but recommended)
npm run lint

# Test build locally
npm run build

# The dist folder should be created at apps/web/dist
ls -la apps/web/dist/
```

### Step 2: Push to Git (Triggers Auto-Deploy)

```bash
# Stage changes
git add .

# Commit
git commit -m "chore: prepare for deployment"

# Push to main branch
git push origin main

# Netlify will automatically detect this and start deployment
```

### Step 3: Monitor Deployment

1. Go to **Netlify Dashboard → Deploys**
2. Click on the latest deploy
3. Watch the build logs:
   - `npm install` completes
   - `npm run build` runs (takes ~30-60 seconds)
   - Build succeeds with `✓ Deploy complete`
4. View the live site at the generated URL

### Step 4: Verify Deployment

- Check that the site loads: [https://book-cat-web.vercel.app/](https://book-cat-web.vercel.app/)
- Test sign up and authentication
- Check browser console for errors
- Verify PWA service worker is registered

### Step 5: Custom Domain (Optional)

1. Go to **Netlify Dashboard → Site settings → Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `bookcat.com`)
4. Follow DNS configuration steps
5. Wait for DNS propagation (up to 48 hours)

---

## Supabase Production Setup

### 1. Create Production Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New project"**
3. **Project name**: `BookCAT Production`
4. **Database password**: Generate strong password (save securely)
5. **Region**: Choose closest to your users
6. Click **"Create new project"** (takes 2-3 minutes)

### 2. Apply Database Migrations

After project is ready:

```bash
# Connect to production Supabase
supabase link --project-ref your-production-ref

# Run all migrations
supabase db push

# Verify migrations applied successfully
supabase db pull
```

Alternatively, manually apply migrations in **Supabase Dashboard → SQL Editor**:

1. Navigate to `supabase/migrations/`
2. Copy each `.sql` file in order
3. Paste into SQL Editor and execute
4. Should see all tables created successfully

### 3. Deploy Edge Functions

```bash
# Deploy all Edge Functions to production
supabase functions deploy fetch-nyt-bestsellers
supabase functions deploy fetch-publisher-feeds
supabase functions deploy generate-book-fact
supabase functions deploy generate-daily-quiz
supabase functions deploy generate-hot-takes
```

Or deploy all at once:

```bash
supabase functions deploy
```

### 4. Configure Cron Jobs

In **Supabase Dashboard → Cron Jobs**:

1. **NYT Bestsellers** - Daily at 2 AM UTC
   ```
   Function: fetch-nyt-bestsellers
   Cron: 0 2 * * *
   ```

2. **Daily Quiz** - Daily at 6 AM UTC
   ```
   Function: generate-daily-quiz
   Cron: 0 6 * * *
   ```

3. **Weekly Trending** - Every Monday at 3 AM UTC
   ```
   Function: update-trending
   Cron: 0 3 * * MON
   ```

### 5. Configure RLS (Row-Level Security)

Ensure RLS policies are in place. Check in **Supabase Dashboard → SQL Editor**:

```sql
-- Example: Users can only see their own books
SELECT * FROM books WHERE user_id = auth.uid();

-- Example: Anyone can read public profiles
SELECT * FROM profiles;
```

### 6. Backup Strategy

**Automated Backups**:
- Go to **Supabase Dashboard → Settings → Backups**
- Enable **"Point in Time Recovery"** (PITR)
- Set backup frequency to **Daily**

**Manual Backups**:
```bash
# Export database dump
pg_dump -h db.xxxxx.supabase.co -U postgres > backup_$(date +%Y%m%d).sql
```

---

## Post-Deployment Verification

### 1. Frontend Checks

- [ ] Page loads without errors
- [ ] Logo and styling render correctly
- [ ] Can sign up successfully
- [ ] Authentication redirects work
- [ ] Navigation links function
- [ ] Can add a book via ISBN
- [ ] Dashboard displays correctly

### 2. Performance Checks

```bash
# Check Core Web Vitals
# Use: Lighthouse, PageSpeed Insights, Web Vitals Chrome Extension

# Expected Metrics:
# - LCP (Largest Contentful Paint): < 2.5s
# - FID (First Input Delay): < 100ms
# - CLS (Cumulative Layout Shift): < 0.1
```

### 3. Backend Connectivity

- [ ] Sign up creates user in Supabase Auth
- [ ] User profile appears in `profiles` table
- [ ] Adding book creates record in `books` table
- [ ] Real-time updates work (community chat)
- [ ] API calls return expected data

### 4. PWA Verification

- [ ] Service worker registered in DevTools > Application
- [ ] Can install as PWA (browser prompt appears on mobile)
- [ ] Works offline (reads from cache)
- [ ] Manifest.json loads correctly

### 5. External Services

- [ ] NYT Bestsellers API responds
- [ ] Google Books API returns book data
- [ ] Gemini API works (mood search powered)
- [ ] Edge Functions execute successfully

---

## Monitoring & Maintenance

### 1. Netlify Monitoring

**Dashboard Features**:

| Feature | Purpose |
|---------|---------|
| **Deploy status** | Real-time build results |
| **Build logs** | Debug failed deployments |
| **Analytics** | Visit count, bandwidth, error rates |
| **Alerts** | Email on failed deploys |

**Access**: [Netlify Dashboard](https://app.netlify.com)

### 2. Supabase Monitoring

**Database Health**:
1. Go to **Supabase Dashboard → Monitoring**
2. Track:
   - Database connections
   - Query performance
   - Realtime subscriptions
   - Edge Function execution times

**Logs**:
```bash
# View Edge Function logs
supabase functions list
supabase functions download generate-daily-quiz
supabase edge-runtime logs
```

### 3. Error Tracking

Set up error tracking service (optional):

```javascript
// Add to main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### 4. Uptime Monitoring

Use tools like:
- **UptimeRobot** - Free tier available
- **StatusCake** - Monitor API endpoints
- **Monitoring.dev** - Lightweight monitoring

### 5. Regular Maintenance Tasks

| Task | Frequency | Purpose |
|------|-----------|---------|
| Check dependency updates | Weekly | Security patches |
| Review Netlify analytics | Weekly | Traffic patterns |
| Database backups | Daily | Data protection |
| Error log review | Daily | Bug detection |
| Performance audit | Monthly | Optimization |

---

## Troubleshooting

### Common Deployment Issues

#### 1. Build Fails with "Cannot find module"

**Cause**: Dependency not installed or mismatched versions

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

#### 2. Blank Page After Deploy

**Cause**: React Router redirect not working

**Solution**: Verify `netlify.toml` has:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 3. Environment Variables Not Loaded

**Cause**: Variables prefixed with `VITE_` are required for frontend

**Solution**:
1. Verify variable name starts with `VITE_`
2. Redeploy after adding variables (variables set during deploy don't apply retroactively)
3. Check in DevTools > Application > Manifest for correct values

#### 4. Supabase Connection Fails

**Error**: "Invalid API key" or "Project reference not found"

**Solution**:
```bash
# Verify environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Test connection
curl $VITE_SUPABASE_URL/rest/v1/
```

#### 5. PWA Service Worker Not Registering

**Cause**: Manifest.json has wrong MIME type

**Solution**: Verify headers in `netlify.toml`:
```toml
[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
```

#### 6. Slow Page Load

**Cause**: Large bundle size or slow API calls

**Solution**:
```bash
# Check bundle size
npm run build
# Look at dist folder size

# View chunk breakdown
# Use source-map-explorer or webpack-bundle-analyzer
```

### Debug Checklist

```bash
# 1. Check build output
npm run build
ls -la apps/web/dist/

# 2. Preview local build
npm run preview

# 3. Check environment variables are set
grep VITE .env.local

# 4. Verify database connection
supabase link --linked
supabase db pull

# 5. Test Supabase client
node -e "import('./supabase.ts')"
```

---

## Performance Optimization

### 1. Bundle Optimization

**Manual Chunk Splitting** (already configured in `vite.config.js`):

```javascript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-motion': ['framer-motion'],
  'vendor-supabase': ['@supabase/supabase-js'],
}
```

This creates separate files that can be cached independently.

### 2. Code Splitting

```javascript
// Use dynamic imports for route-based code splitting
const Community = lazy(() => import('./pages/Community'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Community />
</Suspense>
```

### 3. Image Optimization

- Use modern formats (WebP)
- Compress images before uploading
- Use responsive images with `srcset`

### 4. Caching Strategy

**Static Assets** (Netlify automatic):
- CSS, JS, images cached for 1 year
- index.html cached for 0 minutes (must-revalidate)

**API Responses** (Supabase):
- Use SWR or React Query for request deduplication
- Implement client-side caching for frequently accessed data

### 5. Monitoring Tools

```bash
# Lighthouse CI
npm install -g @lhci/cli@latest

# Run audit
lhci autorun

# Bundle analysis
npm install webpack-bundle-analyzer
```

---

## Rollback Procedures

### Quick Rollback (Last Deploy)

1. Go to **Netlify Dashboard → Deploys**
2. Find the previous successful deploy
3. Click → **"Publish deploy"**
4. Confirm — live site will be reverted

### Full Rollback to Previous Commit

```bash
# View recent commits
git log --oneline -10

# Revert last commit
git revert HEAD

# Or reset to specific commit (use carefully!)
git reset --hard abc123def

# Push to trigger redeploy
git push origin main
```

### Database Rollback (Supabase)

**Using Point-in-Time Recovery**:

1. Go to **Supabase Dashboard → Settings → Backups**
2. Click **"Restore"** under desired backup date/time
3. New project will be created with recovered data
4. Test before switching traffic

**Manual Migration Rollback**:

```bash
# View migration history
supabase db remote set <version>

# Reset to specific migration
supabase migration repair <version> --status reverted
```

### Hotfix Process

For urgent fixes:

```bash
# Create hotfix branch
git checkout -b hotfix/urgent-fix

# Make changes
# ...

# Commit
git commit -m "fix: urgent issue"

# Push immediately (triggers deploy)
git push origin hotfix/urgent-fix

# Create PR and merge to main
# Once merged, automatic deployment happens
```

---

## Deployment Checklist

Use this checklist before pushing to production:

### Pre-Deployment

- [ ] Run `npm run lint` — no errors
- [ ] Run `npm run build` — builds successfully
- [ ] Test locally: `npm run dev`
- [ ] Database migrations tested locally
- [ ] Environment variables configured in Netlify
- [ ] Supabase project created and configured
- [ ] External API keys obtained
- [ ] Git history is clean

### Deployment

- [ ] Push to `main` branch
- [ ] Monitor Netlify build logs
- [ ] Build completes without errors
- [ ] Site deploys successfully

### Post-Deployment

- [ ] Visit live site and verify it loads
- [ ] Test authentication (sign up new account)
- [ ] Test core features (add book, dashboard)
- [ ] Check console for errors
- [ ] Verify PWA install prompt appears
- [ ] Run Lighthouse audit
- [ ] Monitor error tracking for issues
- [ ] Notify team of successful deployment

---

## Additional Resources

### Documentation

- [Netlify Docs](https://docs.netlify.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)
- [React PWA Guide](https://create-react-app.dev/docs/making-a-progressive-web-app/)

### Useful Commands

```bash
# Build
npm run build

# Development
npm run dev

# Lint
npm run lint

# Format code
npm run format

# Supabase
supabase status
supabase db push
supabase functions deploy
supabase links

# Netlify CLI
netlify deploy --prod
netlify logs
netlify link
```

### Project Structure Reference

```
bookcat/
├── apps/web/          # Frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API service layer
│   │   ├── lib/        # Utilities & Supabase client
│   │   └── contexts/   # React contexts
│   ├── netlify.toml    # Netlify config
│   └── vite.config.js  # Vite config
├── supabase/           # Backend configuration
│   ├── migrations/     # Database migrations
│   └── functions/      # Edge Functions
├── netlify.toml        # Root Netlify config
└── package.json        # Monorepo dependencies
```

---

## Support & Contact

- **Issues**: Report in [GitHub Issues](https://github.com/yourusername/bookcat/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/yourusername/bookcat/discussions)
- **Email**: support@bookcat.com (if applicable)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-05-21 | 1.0.0 | Initial deployment guide |

---

**Last Updated**: May 21, 2026

**Maintained by**: BookCAT Development Team
