<div align="center">
  <img src="apps/web/src/assets/bookcat-logo.png" alt="BookCat Logo" width="120" />
  <h1>📚 BookCat</h1>
  <p><strong>Your personal reading companion — track books, read with friends, and discover your next favourite.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Deployed-Netlify-00C7B7?logo=netlify&logoColor=white" alt="Netlify" />
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License MIT" />
  </p>

  <p>
    <a href="#-demo">Demo</a> ·
    <a href="#-features">Features</a> ·
    <a href="#-tech-stack">Tech Stack</a> ·
    <a href="#-getting-started">Getting Started</a> ·
    <a href="#-deployment">Deployment</a> ·
    <a href="#-contributing">Contributing</a> ·
    <a href="#-license">License</a>
  </p>

  <p>
    <em>A modern, full-featured reading tracker with AI-powered discovery, community features, and real-time social interactions.</em>
  </p>
</div>

---

## 🎥 Demo

> **Live Demo:** [https://your-bookcat-app.netlify.app](https://your-bookcat-app.netlify.app) _(Replace with your actual deployed URL)_

<!-- 
Uncomment and add a demo GIF or video:
<div align="center">
  <img src="demo.gif" alt="BookCat Demo" width="800" />
</div>
-->

**Quick Start:** Create an account, add your first book via ISBN scan or manual entry, and start tracking your reading journey!

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

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 18.x ([Download](https://nodejs.org))
- **npm** ≥ 10.x (comes with Node.js)
- **Git** ([Download](https://git-scm.com))
- A [Supabase](https://supabase.com) account (free tier available)
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for local development

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/BookCAT.git
cd BookCAT
```

### 2. Install dependencies

This project uses npm workspaces and Turborepo:

```bash
npm install
```

### 3. Configure environment variables

Create environment files for the web app:

```bash
# Create env file
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and fill in your credentials (see [Environment Variables](#-environment-variables) section).

### 4. Set up Supabase

#### Option A: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Navigate to **SQL Editor**
4. Run each migration file in order from `supabase/migrations/`:
   - `001_auth_setup.sql`
   - `002_books_table.sql`
   - ... through `016_community_tables.sql`

#### Option B: Using Supabase CLI (Recommended)

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### 5. Enable Realtime

In your Supabase Dashboard:

1. Go to **Database → Replication**
2. Enable realtime for these tables:
   - `messages`
   - `friendships`
   - `exchange_offers`

### 6. Set up Edge Functions (Optional)

For AI features and automated tasks:

```bash
# Deploy edge functions
supabase functions deploy generate-daily-quiz
supabase functions deploy generate-hot-takes
supabase functions deploy generate-book-fact
supabase functions deploy fetch-nyt-bestsellers
supabase functions deploy fetch-publisher-feeds
```

Set secrets for edge functions:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set NYT_API_KEY=your_nyt_api_key
```

### 7. Start the development server

```bash
# Start all apps (from root)
npm run dev

# Or start just the web app
cd apps/web && npm run dev
```

🚀 App runs at **http://localhost:5173**

---

## 🔧 Environment Variables

Create `apps/web/.env` with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# Google Books API (for book search and metadata)
VITE_GOOGLE_BOOKS_API_KEY=your-google-books-api-key

# Gemini AI (for mood search, quiz, hot takes, book facts)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Where to Get API Keys

| Service | Instructions |
|---------|-------------|
| **Supabase** | Dashboard → Project Settings → API → Copy URL & anon key |
| **Google Books** | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Enable Books API → Credentials |
| **Gemini AI** | [Google AI Studio](https://aistudio.google.com) → Get API Key |
| **NYT Books** | [NYT Developer Portal](https://developer.nytimes.com) → Create App → Get Books API Key _(for edge functions)_ |

> ⚠️ **Security Note:** Never commit `.env` files to version control. They are automatically ignored via `.gitignore`.

---

## 🌐 Deployment

### Deploy to Netlify

<details>
<summary><strong>📦 Option A — Deploy via Netlify UI (Recommended)</strong></summary>

1. Push your code to GitHub
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click **Add new site → Import an existing project**
4. Connect your GitHub repository
5. Configure build settings:

**Build Settings:**

| Setting | Value |
|---------|-------|
| Base directory | _(leave empty)_ |
| Build command | `cd apps/web && npm ci && npm run build` |
| Publish directory | `apps/web/dist` |
| Node version | 18 or higher |

6. Add environment variables (see [Environment Variables](#-environment-variables))
7. Click **Deploy site**

</details>

<details>
<summary><strong>💻 Option B — Deploy via Netlify CLI</strong></summary>

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --build --prod
```

</details>

### Deploy Supabase Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy generate-daily-quiz
supabase functions deploy generate-hot-takes
# ... etc
```

### Set Up Cron Jobs

In your Supabase Dashboard → Database → Extensions, enable `pg_cron`, then configure cron schedules in your migrations (already included in migrations 006, 008, 011, 012).

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

We welcome contributions from the community! Whether it's bug reports, feature requests, or code contributions, all are appreciated.

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/BookCAT.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feat/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Write clear, concise commit messages
   - Add tests if applicable
   - Update documentation as needed

4. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feat/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Wait for review and address feedback

### Development Guidelines

- **Code Style**: Follow the existing patterns in the codebase
- **Components**: Keep components small and focused
- **State Management**: Use React Context for global state
- **Styling**: Use Tailwind CSS utility classes
- **Database**: Always use Row Level Security policies
- **Testing**: Test your changes locally before submitting

### Reporting Issues

Found a bug or have a feature request?

1. Check if the issue already exists
2. If not, [create a new issue](https://github.com/YOUR_USERNAME/BookCAT/issues/new)
3. Provide as much context as possible
4. Include steps to reproduce (for bugs)
5. Add screenshots or screen recordings if applicable

---

## 🗺️ Roadmap

Future features and improvements we're considering:

- [ ] Mobile app (React Native)
- [ ] Book annotations and highlights
- [ ] Audio book integration
- [ ] Reading challenges and badges
- [ ] Book club features
- [ ] Advanced statistics and visualizations
- [ ] Import from Goodreads/LibraryThing
- [ ] Offline support with PWA
- [ ] Multi-language support
- [ ] Dark mode improvements
- [ ] Export reading data
- [ ] Integration with library catalogs

Have an idea? [Open an issue](https://github.com/YOUR_USERNAME/BookCAT/issues) with the `enhancement` label!

---

## 💬 Support

Need help? Have questions? We're here for you!

- 📖 **Documentation**: Check this README and inline code comments
- 🐛 **Bug Reports**: [Open an issue](https://github.com/YOUR_USERNAME/BookCAT/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/YOUR_USERNAME/BookCAT/discussions)
- 💬 **Community**: Join our [Discord server](#) _(add link if available)_
- 📧 **Email**: contact@bookcat.app _(update with your email)_

---

## ⚖️ License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

BookCat is built with amazing open-source technologies:

- [React](https://react.dev) - UI library
- [Vite](https://vitejs.dev) - Build tool
- [Supabase](https://supabase.com) - Backend platform
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide Icons](https://lucide.dev) - Icon library
- [Google Books API](https://developers.google.com/books) - Book data
- [Google Gemini](https://ai.google.dev) - AI features
- [ZXing](https://github.com/zxing-js/library) - Barcode scanning

---

## 📊 Project Stats

<div align="center">
  
  ![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/BookCAT?style=social)
  ![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/BookCAT?style=social)
  ![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/BookCAT)
  ![GitHub pull requests](https://img.shields.io/github/issues-pr/YOUR_USERNAME/BookCAT)
  ![GitHub last commit](https://img.shields.io/github/last-commit/YOUR_USERNAME/BookCAT)
  
</div>

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes. _(Create this file if needed)_

---

<div align="center">
  <img src="apps/web/src/assets/bookcat-logo.png" alt="BookCat" width="50" />
  
  <p><strong>Happy Reading! 🐱📖</strong></p>
  
  <p>Made with ❤️ by the BookCat community</p>
  
  <p>
    <a href="#-demo">Back to Top ↑</a>
  </p>
</div>