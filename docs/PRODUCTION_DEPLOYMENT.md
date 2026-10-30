# PeerLearn: Production Deployment Guide

This guide covers deploying PeerLearn to production across **Vercel** (Frontend PWA) and **Supabase Cloud** (Database, Auth, Row-Level Security, and Edge Functions).

---

## 1. Architecture Overview

- **Frontend:** Progressive Web Application (PWA) built with React 18, Vite, and Workbox Service Worker. Hosted on **Vercel** with global CDN caching and HTTPS.
- **Backend API:** Node.js Express service for real-time SSE telemetry, explainable matching, and USSD/SMS webhooks. Can be deployed on Vercel Serverless Functions, Railway, Render, or a dedicated VPS.
- **Database:** Supabase Postgres with multi-tenant Row-Level Security (`school_id`).
- **Edge Functions:** Deno runtime functions for privileged auth operations (`student-login`, `import-students`, `reset-pin`, `seed-demo`).

---

## 2. Supabase Cloud Setup

1. **Create Supabase Project:**
   - Sign up at [supabase.com](https://supabase.com).
   - Create a new project (e.g. `peerlearn-production`). Choose Region: `af-south-1` (Cape Town) or `eu-central-1` (Frankfurt) for lowest latency to Kenya.

2. **Apply Database Migrations:**
   ```bash
   # Link Supabase project
   npx supabase link --project-ref your-project-ref

   # Push all migrations
   npx supabase db push
   ```
   This automatically applies:
   - `20261026000000_foundation_schema_and_rls.sql`: Full multi-tenant schema and RLS policies.
   - `20261030000000_phase8_extensions_schema.sql`: Tutor training, adaptive knowledge graph, group sessions, and telecom logs.

3. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy student-login
   npx supabase functions deploy student-first-setup
   npx supabase functions deploy import-students
   npx supabase functions deploy reset-pin
   npx supabase functions deploy approve-school
   npx supabase functions deploy approve-tutor
   npx supabase functions deploy seed-demo
   npx supabase functions deploy reset-demo
   npx supabase functions deploy generate-report
   npx supabase functions deploy schedule-retention
   ```

4. **Configure Secrets in Supabase:**
   ```bash
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_secret_key
   ```

---

## 3. Vercel Frontend Deployment

1. **Connect GitHub Repository:**
   - Go to [vercel.com](https://vercel.com).
   - Import the `hiramka/peerlearn` repository.

2. **Configure Project Settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build --workspace web`
   - **Output Directory:** `web/dist`
   - **Install Command:** `npm install`

3. **Set Environment Variables in Vercel:**
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOi...`
   - `VITE_API_BASE_URL`: `https://api.peerlearn.ac.ke`

4. **Deploy:**
   - Click **Deploy**. Vercel will automatically provision HTTPS, register the Workbox service worker (`sw.js`), and cache static assets.

---

## 4. Africa's Talking Telecom Integration (SMS / USSD)

1. Sign up on [africastalking.com](https://africastalking.com).
2. Create a USSD channel (e.g. Service Code `*384*500#`).
3. Set the Callback URL to:
   `https://api.peerlearn.ac.ke/api/ussd`
4. Create an SMS shortcode or alphanumeric Sender ID (`PeerLearn`).
5. Configure server environment variables:
   ```env
   AFRICAS_TALKING_USERNAME=your_username
   AFRICAS_TALKING_API_KEY=your_api_key
   AFRICAS_TALKING_SHORT_CODE=384500
   ```

---

## 5. Security & Verification Checklist

- [x] All Supabase tables have RLS enabled (Rule R3).
- [x] Service role key is never bundled in client code (Rule R7).
- [x] Offline IndexedDB outbox deduplicates on `client_id` (Rule R2).
- [x] Kenya Data Protection Act 2019 compliance enabled (parental consent timestamps, student erasure/export).
- [x] All 58 unit, integration, and E2E tests passing.
