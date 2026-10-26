# PeerLearn

Peer-tutoring matchmaker with an offline-first PWA.

## Run
```bash
npm install
npm run dev        # API on :3001, web on :5173
```
Open http://localhost:5173 (use Chrome/Edge). The app works with zero setup (in-memory seed data).

## Demo script
1. Pick a topic, tap **Download for offline** (badge appears).
2. DevTools > Network > Offline (or airplane mode on a phone).
3. Choose the downloaded topic, start session, take pre-quiz, read lesson, take post-quiz.
4. See "waiting to sync", go back online, watch it sync, open **Teacher view**.

## Structure
- `shared/types.ts`  types used by server and web (one source of truth)
- `server/src/matching.ts`  hard filters + weighted score + outcome feedback
- `server/src/index.ts`  REST API; `/api/sessions` is idempotent via `client_id`
- `server/schema.sql`  production Postgres schema
- `web/src/db.ts`  IndexedDB cache + outbox sync
- `web/vite.config.ts`  PWA / service worker config

## Next steps (scale path)
1. Swap `data.ts` for Postgres/Supabase using `schema.sql`; add Supabase Auth + row-level security.
2. Add real auth, tutor verification skill-check, teacher endorsement, safe scheduling.
3. Africa's Talking SMS/USSD for non-smartphone users.
4. Move API to NestJS or Fastify with zod validation; add Vitest tests for matching.
5. Content CMS so teachers can author lessons; multi-language strings.
6. Deploy: web on Vercel/Netlify (HTTPS required for service workers), API on Fly.io/Railway.
