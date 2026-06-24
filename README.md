# NovaSosh

Hey! Welcome to **NovaSosh** 👋

This is a full-stack social media platform I've been building. The goal was to create a modern, lightning-fast, and feature-rich social experience from the ground up. It's got pretty much everything you'd expect from a production-grade app—from real-time messaging and notifications to a full creator dashboard, ephemeral stories (Moments), and community hubs.

## What's inside?

It's set up as a monorepo containing both the frontend and the backend:

- **Frontend (`apps/web`)**: Built with Next.js, TailwindCSS, and Zustand for state management. It's fully responsive, highly interactive, and designed with a really sleek, modern UI.
- **Backend (`apps/api`)**: A robust Node.js/Express server using Prisma as the ORM with PostgreSQL. It handles everything from JWT auth to complex graph relationships (following, friends) and media handling.
- **Shared Types (`packages/shared-types`)**: TypeScript interfaces shared across the frontend and backend to keep the entire stack type-safe.

## Key Features

- **The Feed & Explore**: Dynamic content delivery, post interactions (likes, comments, shares, reporting), and an explore page to discover new creators.
- **Moments**: A stories-like feature where you can upload temporary content.
- **Real-time Messaging**: Full real-time chat system with read receipts.
- **Notifications**: In-app notifications for likes, comments, follows, and system alerts.
- **Creator Dashboard**: For power users wanting to track their engagement and content metrics.
- **Communities**: Dedicated spaces for niche discussions and groups.
- **Settings & Privacy**: Full control over your profile, visibility, and dark/light modes.

## Tech Stack

- **Web**: Next.js, React, Tailwind CSS, Zustand
- **API**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL (primary DB), Redis (for caching, sessions, and rate limiting)
- **Infra/Other**: JWT Auth, Docker support

## Running it locally

If you want to spin this up yourself, here's how:

1. **Clone it**
   ```bash
   git clone https://github.com/SoumaCh03/NovaSosh.git
   cd NovaSosh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your environment vars**
   - Create a `.env` file in the `apps/api` folder based on `.env.example` and fill in your PostgreSQL and Redis URIs.
   - Do the same for `apps/web` if you need specific frontend keys.

4. **Run the database migrations**
   ```bash
   cd apps/api
   npx prisma migrate dev
   ```

5. **Start it up**
   From the root folder, fire up both the frontend and backend:
   ```bash
   npm run dev
   ```

---

Feel free to poke around the code! I'm constantly tweaking things and adding new features.
