<div align="center">
  <img src="apps/web/src/assets/bookcat-logo.png" alt="BookCat Logo" width="100" />
  <h1>BookCat</h1>
  <p><strong>Your personal reading companion — track books, read with friends, and discover your next favourite.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Deployed-Netlify-00C7B7?logo=netlify&logoColor=white" alt="Netlify" />
  </p>

  <p>
    <a href="#-features">Features</a> ·
    <a href="#-tech-stack">Tech Stack</a> ·
    <a href="#-getting-started">Getting Started</a> ·
    <a href="#-supabase-setup">Supabase Setup</a> ·
    <a href="#-deploy-to-netlify">Deploy to Netlify</a> ·
    <a href="#-environment-variables">Environment Variables</a>
  </p>
</div>

---

## 📸 Screenshots

> _Replace the placeholders below with actual screenshots from your deployed app._

| Dashboard | Library |
|-----------|---------|
| ![Dashboard](https://via.placeholder.com/600x360/1a1a2e/6366f1?text=Dashboard) | ![Library](https://via.placeholder.com/600x360/1a1a2e/6366f1?text=Library) |

| Reading Mode | Stats |
|--------------|-------|
| ![Reading Mode](https://via.placeholder.com/600x360/1a1a2e/6366f1?text=Reading+Mode) | ![Stats](https://via.placeholder.com/600x360/1a1a2e/6366f1?text=Stats) |

| Community | Discover |
|-----------|----------|
| ![Community](https://via.placeholder.com/600x360/1a1a2e/6366f1?text=Community) | ![Discover](https://via.placeholder.com/600x360/1a1a2e/6366f1?text=Discover) |

---

## ✨ Features

### 📚 Library Management
- Add books manually or by **ISBN barcode scan**
- Track reading status: **Reading**, **Want to Read**, **Completed**
- Log current page and total pages with auto-calculated progress
- Custom tags per book (e.g. `favourites`, `re-reading`, `abandoned`)
- Full-text book details with cover art via Google Books API

### ⏱️ Reading Sessions
- Timed reading sessions with intent selection (Deep Focus, Casual, etc.)
- Manual page updates auto-log sessions
- Session history with per-book stats (time read, sessions count)

### 📊 Stats & Analytics
- Total reading time, pages read, books completed
- Daily / weekly / monthly / all-time filters
- Reading streak tracker
- Milestone achievements (100 pages, 10 books, yearly goals, etc.)

### 🎯 Reading Goal
- Set a yearly reading goal in your Profile
- **Real-time progress bar** in the sidebar updates as you complete books
- Goal celebration state when target is reached

### 🔍 Discover
- AI-powered **mood-based book search** (Gemini API)
- NYT Bestsellers via Supabase Edge Functions
- Weekly trending books
- Publisher RSS feed aggregation
- Daily book facts

### 🧠 Daily Quiz
- AI-generated daily quiz about books and reading culture
- Score tracking per user

### 🔥 Hot Takes
- Community debate cards on reading habits and book culture
- Agree / Disagree voting per user

### 🤝 Community
- Send / accept friend requests
- Browse a friend's full reading library
- **Request a book** from a friend's library (creates Exchange offer)
- Real-time chat with friends
- Activity feed (completed books, reading sessions)

### 🔄 Book Exchange
- Propose a book swap with any friend
- Optional message and delivery method (Meet up / Mail / Digital)
- Counter-offer and negotiation flow
- Exchange status tracking

### 🔔 Notifications
- Real-time bell icon in Navbar
- Notifies you of: pending friend requests, incoming exchange offers, unread messages
- Supabase Realtime subscriptions for instant updates

### 👤 Profile
- Avatar upload to Supabase Storage
- Username, bio, yearly reading goal
- Public profile page

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | [React 18](https://react.dev) + [Vite 5](https://vitejs.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Routing | [React Router v6](https://reactrouter.com) |
| Backend / DB | [Supabase](https://supabase.com) (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Realtime | Supabase Realtime Channels |
| Storage | Supabase Storage (avatars) |
| Edge Functions | Supabase Edge Functions (Deno) |
| AI | Google Gemini API (mood search, quiz, hot takes, book facts) |
| Book Data | Google Books API, NYT Books API |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev) |
| Barcode Scan | [@zxing/browser](https://github.com/zxing-js/library) |
| Monorepo | [Turborepo](https://turbo.build) |
| Deployment | [Netlify](https://netlify.com) |

---

## 📁 Project Structure

```
BookCAT/                          # Monorepo root
├── apps/
│   └── web/                      # Main React application
│       ├── src/
│       │   ├── assets/           # Static assets (logo, images)
│       │   ├── components/       # Reusable UI components
│       │   │   ├── layout/       # Navbar, Sidebar, BottomNav, Layout
│       │   │   ├── AddBookModal.jsx
│       │   │   ├── ISBNScanner.jsx
│       │   │   ├── Readingsessionmodal.jsx
│       │   │   ├── Realtimestatswidget.jsx
│       │   │   └── ...
│       │   ├── contexts/         # React contexts (AuthContext)
│       │   ├── hooks/            # Custom hooks (useAuth)
│       │   ├── lib/              # Supabase client, utilities
│       │   ├── pages/            # Route-level page components
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Library.jsx
│       │   │   ├── Stats.jsx
│       │   │   ├── Community.jsx
│       │   │   ├── Exchange.jsx
│       │   │   ├── Discover.jsx
│       │   │   ├── Quiz.jsx
│       │   │   ├── ReadingMode.jsx
│       │   │   └── Profile.jsx
│       │   ├── services/         # Supabase query functions
│       │   └── utils/            # EventBus, StatsCache
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
├── packages/                     # Shared packages (lib, types, ui)
├── supabase/
│   ├── config.toml
│   ├── functions/                # Edge Functions
│   │   ├── fetch-nyt-bestsellers/
│   │   ├── fetch-publisher-feeds/
│   │   ├── generate-book-fact/
│   │   ├── generate-daily-quiz/
│   │   └── generate-hot-takes/
│   └── migrations/               # SQL migrations (001 → 016)
├── turbo.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 10
- A [Supabase](https://supabase.com) project
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for running migrations

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/BookCAT.git
cd BookCAT
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp apps/web/.env.example apps/web/.env
```

Fill in the values (see [Environment Variables](#-environment-variables)).

### 4. Run database migrations

In your **Supabase Dashboard → SQL Editor**, run each file in order:

```
supabase/migrations/001_auth_setup.sql
supabase/migrations/002_books_table.sql
...through...
supabase/migrations/016_community_tables.sql
```

Or with the Supabase CLI:

```bash
supabase db push
```

### 5. Start the development server

```bash
npm run dev
# or for just the web app:
cd apps/web && npm run dev
```

App runs at **http://localhost:5173**

---

## 🗄️ Supabase Setup

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (username, avatar, bio, yearly reading goal) |
| `books` | User book library with status, progress, tags |
| `reading_sessions` | Timed reading session logs |
| `activities` | Community activity feed events |
| `friendships` | Friend connections with pending/accepted state |
| `messages` | Direct messages between friends |
| `exchange_offers` | Book exchange proposals |
| `daily_quiz` | AI-generated daily quiz questions |
| `quiz_responses` | Per-user quiz answers |
| `book_facts` | AI-generated daily book facts |
| `daily_hot_takes` | AI-generated hot takes for community voting |
| `hot_take_votes` | Per-user vote on hot takes |
| `weekly_trending` | Trending books (refreshed weekly via cron) |

### Row Level Security

All tables have **RLS enabled**. Policies ensure users can only read/write their own data. Profiles and trending data are publicly readable.

### Edge Functions

| Function | Schedule | Purpose |
|----------|----------|---------|
| `generate-daily-quiz` | Daily cron | Generates quiz via Gemini AI |
| `generate-hot-takes` | Daily cron | Generates hot takes via Gemini AI |
| `generate-book-fact` | Daily cron | Generates book fact via Gemini AI |
| `fetch-nyt-bestsellers` | Weekly cron | Fetches NYT Bestseller lists |
| `fetch-publisher-feeds` | Weekly cron | Aggregates publisher RSS feeds |

### Realtime

Enable Realtime on these tables in **Supabase Dashboard → Database → Replication**:

- `messages`
- `friendships`
- `exchange_offers`

---

## 🌐 Deploy to Netlify

### Option A — Deploy via Netlify UI (Recommended)

1. Push your code to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
3. Connect your GitHub repository
4. Configure build settings as below:

---

### ⚙️ Netlify Build Settings

| Setting | Value |
|---------|-------|
| **Runtime** | _(leave as default — Node.js auto-detected)_ |
| **Base directory** | _(leave empty — monorepo root)_ |
| **Package directory** | _(leave empty)_ |
| **Build command** | `cd apps/web && npm ci && npm run build` |
| **Publish directory** | `apps/web/dist` |
| **Functions directory** | `netlify/functions` _(only if using Netlify Functions)_ |

> ⚠️ **Important:** The publish directory must be `apps/web/dist`, **not** just `dist`. The default `dist` path will cause a deploy to publish an empty site.

---

### 🔐 Environment Variables (Netlify)

In **Netlify Dashboard → Site → Environment Variables**, add:

| Variable | Where to get it |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key |
| `VITE_GOOGLE_BOOKS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → APIs → Books API |
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) → Get API Key |

---

### Option B — Deploy via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --build --prod
```

---

### Continuous Deployment

- Set **Deploy context** to `main` branch for production
- **Build status** should be **Active builds** so Netlify auto-deploys on every push
- **Deploy log visibility**: Set to **Private logs** for production

---

## 🔧 Environment Variables

Create `apps/web/.env` (copy from `.env.example`):

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Books API
VITE_GOOGLE_BOOKS_API_KEY=your-google-books-api-key

# Gemini AI (for mood search, quiz, hot takes, book facts)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

## 🧰 Available Scripts

Run from the **monorepo root**:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in dev mode (Turborepo) |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all apps |

Run from **`apps/web/`**:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on :5173 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview production build locally |

---

## 🗃️ Database Migrations Reference

| Migration | Description |
|-----------|-------------|
| `001_auth_setup.sql` | Profiles table, RLS, avatar storage bucket |
| `002_books_table.sql` | Books table with RLS and indexes |
| `003_library_features.sql` | Reading sessions table |
| `004_book_tags.sql` | Tags array column on books |
| `006_publisher_feeds_cron.sql` | Publisher RSS cron schedule |
| `007_daily_quiz.sql` | Daily quiz + responses tables |
| `008_daily_quiz_cron.sql` | Quiz generation cron schedule |
| `009_book_facts.sql` | Daily book facts table |
| `010_weekly_trending.sql` | Weekly trending books table |
| `011–012_trending_cron.sql` | Trending refresh cron |
| `013_fix_books_updated_at.sql` | Restore `updated_at` column + trigger |
| `014_hot_takes_and_active_readers.sql` | Hot takes, votes, active readers view |
| `015_fix_duration_minutes_default.sql` | Default value for `duration_minutes` |
| `016_community_tables.sql` | Friendships, messages, Realtime setup |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE) © BookCat Contributors

---

<div align="center">
  <img src="apps/web/src/assets/bookcat-logo.png" alt="BookCat" width="40" />
  <p><em>Happy reading 🐱📖</em></p>
</div>