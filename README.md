# CODEIT (React Version)

This is the React version of the CODEIT project, migrated from vanilla HTML/JS/CSS to a modern React app using Vite.

## Structure

- `public/` — Static assets (avatars, fonts, logo, manifest, etc.)
- `src/`
  - `components/` — React components (Navbar, Welcome, Auth, Game, Leaderboard, Shop, Toast)
  - `hooks/` — Custom React hooks (e.g., useSupabase)
  - `supabaseClient.js` — Supabase client setup
  - `App.jsx` — Main app with routing
  - `main.jsx` — Entry point
  - `styles/` — CSS files

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features
- Modern responsive UI
- Supabase integration for authentication, leaderboard, shop, etc.
- Mobile-friendly navigation with hamburger menu
- Modular React components

---

> For any issues or questions, please contact the project maintainer. 