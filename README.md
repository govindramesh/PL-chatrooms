# PL Rooms

Premier League fixture chat app where each match has temporary chat rooms:

- one general room for everyone
- one team room per club (restricted to users who selected that team at signup)
- chat rooms expire 24 hours after kickoff
- fixture tiles are removed 24 hours after the final kickoff in that gameweek

## Stack

- Next.js App Router + TypeScript
- Prisma + SQLite (local dev)
- Tailwind CSS
- Cookie session auth

## Features implemented

- Signup with required favorite team selection
- Login/logout
- Explore page with fixtures and follow/unfollow
- Home page that always includes favorite-team fixtures plus followed fixtures
- Match page with:
  - General room
  - Team-only room access based on signup team
  - Live event system messages inside feeds
- Cleanup endpoint to remove expired rooms/messages

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Initialize database and seed sample data:

```bash
npm run db:reset
```

3. Sync real Premier League fixtures from the Fantasy Premier League API:

```bash
npm run sync:fixtures
```

4. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

- `npm run db:push` - apply Prisma schema
- `npm run db:seed` - seed teams, fixtures, rooms, and sample event
- `npm run db:reset` - reset and reseed local DB
- `npm run sync:fixtures` - fetch and store real EPL fixtures by gameweek
- `npm run lint` - lint the codebase

## API endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/rooms/:roomId/messages`
- `POST /api/rooms/:roomId/messages`
- `POST /api/fixtures/:fixtureId/events/simulate`
- `POST /api/jobs/cleanup`

`/api/jobs/cleanup` optionally supports `CLEANUP_TOKEN` via `x-cleanup-token` header.
