# PeerLearn (Kenya Secondary School Peer-Tutoring Platform)

An offline-first, privacy-compliant peer-tutoring matchmaker and progressive web application (PWA) built specifically for Kenyan secondary schools (Forms 1–4).

---

## 🚀 Key Highlights & Spec Capabilities

- **Offline-First PWA (OFF-1..4):** One-tap curriculum packs, local 20-minute guided peer sessions, and IndexedDB background sync queues (`outbox` and `events_outbox`) for zero-connectivity environments.
- **Explainable Tutor Matching (MATCH-1..5):** Deterministic matching algorithm scoring mastery, same-school proximity, language overlap, tutor load balance, past student ratings, and empirical learning gain.
- **Multi-Tenant Row-Level Security (AUTH-1..8, ONB-1..4):** Complete school isolation via Supabase RLS. Cross-school logins are mathematically impossible.
- **Safe & Anonymous Student Authentication (CLS-1..4, AUTH-1..6):** Students authenticate using School Code + Admission Number + 6-digit PIN. No phone numbers, personal emails, or device trackers are collected. One-time printable setup slips (`CLS-3`) allow frictionless onboarding without email requirements.
- **Rigorous Safeguarding (SAFE-1..6):** Peer tutors must achieve $\ge 80\%$ diagnostic mastery AND explicit teacher approval per topic. Incident problem reporting (`SAFE-4`), tutor suspensions (`SAFE-2`), guardian consent logs (`SAFE-5`), and tamper-evident audit logs (`SAFE-6`).
- **Empirical Learning Evidence (PROOF-1..5):** Guaranteed disjoint pre-quiz and post-quiz question banks, automated 7-day retention scheduling, and comparison control group lift metrics for education researchers and donors.
- **Sandbox Demo Mode (DEMO-1..4):** Sub-second demo wipe and re-seed, 2-device role switcher (Learner vs Tutor), and 4-hour guest demo access tokens.
- **Live Event Telemetry (LIVE-1..3):** Real-time session event streaming via Server-Sent Events (SSE) and Supabase Realtime without browser refreshing.
- **Teacher Dashboards & Content Authoring (DASH-1, CONT-1..3):** Topic struggle heatmaps, no-improvement session alerts, teacher lesson draft editor, version bump publishing, and donor impact reports strictly excluding demo data (R5).
- **Localization & Accessibility (I18N-1, A11Y-1):** Complete bilingual support for English (`en`) and Kiswahili (`sw`), High-Contrast mode, Low-Data mode for 2G/3G connectivity, storage management with cache clearing (`OFF-1`), and printable Peer Tutor Certificates.
- **Data Protection Act (Kenya DPA 2019):** Full compliance with children's data provisions, plain-language privacy policy ([`docs/PRIVACY.md`](docs/PRIVACY.md)), school data processing agreement ([`docs/SCHOOL_DATA_AGREEMENT.md`](docs/SCHOOL_DATA_AGREEMENT.md)), and student data export & erasure endpoints (`GET /api/students/:id/export`, `POST /api/students/:id/erase`).
- **Phase 8 LATER Extensions:**
  - **Tutor Pedagogical Training & Certification:** 4 interactive micro-modules (Socratic questioning, growth mindset, pacing, safeguarding), scenario assessment, and verified Certified Peer Tutor badge granting +10 pts in matching.
  - **Adaptive Knowledge Graph:** Form 1–4 prerequisite graph with automated remediation (<50%), reinforcement (50–79%), and progression (≥80%) routing.
  - **Small-Group Peer Tutoring:** 1 tutor to 2–4 struggling peers with multi-learner quiz tracking and collective gain analytics.
  - **Africa's Talking USSD & SMS Gateway:** Kenya telco integration (`*384*500#`) with interactive feature phone simulator and automated SMS schedule/progress alerts.
  - **Zero-Data Offline QR Transfer Engine:** Peer-to-peer lesson pack and offline session synchronization via high-density SVG QR code with tamper-evident checksum verification.
- **Phase 9 E2E Offline Testing & Network Emulation:** Playwright browser offline test, 10x repeated flaky network retry simulation, and idempotent single-row server deduplication tests.
- **Phase 10 Production Cloud & Local Appliance Deployment:**
  - **Vercel Edge & PWA Hosting:** Zero-config SPA rewrite, Content-Security-Policy, immutable asset caching, and offline Service Worker routing ([`vercel.json`](vercel.json), [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md)).
  - **Supabase Cloud Migration:** Multi-tenant RLS schema for all core and Phase 8 tables (`supabase/migrations/`).
  - **Offline School Server Appliance:** Turnkey Docker & Docker Compose setup with local SQLite/Postgres fallback for zero-connectivity school computer labs ([`docs/OFFLINE_SCHOOL_SERVER.md`](docs/OFFLINE_SCHOOL_SERVER.md)).
  - **Automated CI/CD:** GitHub Actions workflow executing type checking, unit tests, and production PWA building on every push.
- **Phase 11 Curriculum Expansion, Dual Guardian Consent & Pilot Operations:**
  - **Kenyan Secondary Curriculum Bank (8-4-4 & CBC):** 8 comprehensive topic packs across Mathematics, Biology, Physics, Chemistry, and CBC Junior Secondary Integrated Science with 100% disjoint pre/post/retention quizzes.
  - **Dual-Track Guardian Consent (SPEC_V2 10.5):** Official Ministry of Education & Kenya DPA 2019 printable paper consent slip with tamper-evident serials + in-app digital consent verification.
  - **School Pilot Tier Management (SPEC_V2 10.2/10.4):** Tier structure for Standard Pilot (KES 15,000/term), Sponsor-Subsidized Partner (Safaricom / Equity Foundation), and Free Sandbox.
- **Phase 12 Field Pilot Launch & School Operations Pack:**
  - **Teacher Field Operations Guide:** Practical 8-week school pilot implementation timeline, lab provisioning, and 20-minute session management ([`docs/TEACHER_PILOT_GUIDE.md`](docs/TEACHER_PILOT_GUIDE.md)).
  - **Ministry of Education & Board Pack:** Formal County Director of Education (CDE) submission templates, Board of Management (BOM) adoption resolutions, and DPA 2019 minor protection compliance schedule ([`docs/MOE_PILOT_AUTHORIZATION.md`](docs/MOE_PILOT_AUTHORIZATION.md)).
  - **Automated Cloud Database Seeder:** CLI script to populate remote Supabase Postgres with curriculum, schools, and adaptive graph edges (`npm run seed:cloud`, `npm run seed:dry-run`).

---

## 🛠️ Tech Stack

- **Frontend (Web PWA):** React 18, TypeScript, Vite, `vite-plugin-pwa` (Workbox Service Worker), IndexedDB (`idb`).
- **Backend API:** Node.js, Express, TypeScript, Server-Sent Events (SSE).
- **Database & Cloud:** Supabase (Postgres with Multi-School Row-Level Security, Auth, Edge Functions, Realtime).
- **Testing:** Vitest (41 unit & integration tests passing).

---

## 💻 Quick Start & Local Run

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/organization/peerlearn.git
cd peerlearn

# Install dependencies for all workspaces
npm install
```

### Running Locally
```bash
# Starts both Express API (:3001) and Vite Web App (:5173) concurrently
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

```bash
# Run the complete test suite (76/76 passing)
npm test

# Run Playwright end-to-end browser offline test
npm run test:e2e

# Check TypeScript types across both server and web workspaces
npm run typecheck

# Execute cloud database seeder in dry-run mode
npm run seed:dry-run
```

### Test Suites Included:
- `test/phase12-pilot-readiness.test.ts`: Phase 12 Automated cloud database seeder integrity (72 disjoint questions, 31 graph edges), teacher field guide, and MoE authorization templates.
- `test/phase11-curriculum-consent.test.ts`: Phase 11 8-4-4 & CBC secondary curriculum packs, strictly disjoint pre/post/retention questions, dual paper/in-app consent slips, and pilot school pricing tiers.
- `test/e2e-offline.test.ts`: Phase 9 End-to-end offline student session, flaky network 10x repeated sync, and idempotent single-row server deduplication.
- `test/playwright/offline-session.spec.ts`: Phase 9 Playwright headless browser offline mode test (SPEC_V2 Section 7).
- `test/phase8-later.test.ts`: Tutor training micro-lessons, certified badges, adaptive knowledge graph, group sessions, Africa's Talking USSD/SMS, and zero-data QR handoff checksums.
- `test/matching.test.ts`: Explainable matching weights, hard filters, and top-3 limits.
- `test/auth-onb-cls.test.ts`: Multi-tenant isolation, 5-attempt PIN lockout, teacher reset, CSV import, and DPA export/erase.
- `test/safeguarding.test.ts`: Tutor approval requirement, suspensions, problem reports, guardian consent, audit logs.
- `test/proof.test.ts`: Tagged questions, disjoint pre/post quizzes, 7-day retention checks, comparison group lift.
- `test/demo-live.test.ts`: Demo re-seed, guest access tokens, SSE real-time events, offline outbox queues.
- `test/dashboards-content.test.ts`: Topic struggle heatmap, lesson publishing version bumps, student pack draft exclusions, donor impact reports.
- `test/i18n-a11y.test.ts`: English/Kiswahili dictionary key parity, fallback behavior, storage calculation, certificate eligibility.

---

## 📁 Repository Structure

```
peerlearn/
├── shared/
│   ├── types.ts           # Central single source of truth types
│   └── i18n.ts            # Bilingual English & Kiswahili translations (I18N-1)
├── server/
│   ├── src/
│   │   ├── index.ts       # Express API routes & SSE streaming
│   │   ├── auth.ts        # Tenant credentials, PIN lockout, CSV import, DPA export/erase
│   │   ├── safeguarding.ts# Tutor approvals, suspensions, problem reports, audit logs
│   │   ├── matching.ts    # Explainable peer tutor matching algorithm
│   │   ├── proof.ts       # Disjoint quizzes, 7-day retention checks, cohort proof
│   │   ├── demo.ts        # Sub-second demo wipe & guest session tokens
│   │   ├── live.ts        # Real-time SSE broadcasting & offline event batch upload
│   │   ├── content.ts     # Lesson authoring & publishing version bumps
│   │   ├── dashboards.ts  # Struggle heatmaps, no-improvement alerts, donor impact reports
│   │   └── scripts/
│   │       └── seed-cloud-db.ts # Automated remote Supabase seeder (Phase 12)
├── web/
│   ├── src/
│   │   ├── App.tsx        # Single-page application (Learner, Tutor, Teacher, Platform views)
│   │   ├── db.ts          # IndexedDB offline store (lessons, outbox, events, storage cache)
│   │   ├── styles.css     # Clean design tokens, high-contrast & low-data styles
│   │   └── main.tsx       # App entrypoint
│   ├── index.html         # PWA HTML shell
│   └── vite.config.ts     # PWA manifest & service worker configuration
├── supabase/
│   ├── migrations/        # Multi-school RLS schema migrations
│   └── functions/         # Supabase Deno Edge Functions
│       ├── approve-school/
│       ├── approve-tutor/
│       ├── generate-report/
│       ├── import-students/
│       ├── report-problem/
│       ├── reset-demo/
│       ├── reset-pin/
│       ├── schedule-retention/
│       ├── seed-demo/
│       ├── student-first-setup/
│       └── student-login/
├── docs/
│   ├── PRIVACY.md         # Plain-language privacy policy (Kenya DPA 2019)
│   ├── SCHOOL_DATA_AGREEMENT.md # School Data Processing Agreement template
│   ├── PRODUCTION_DEPLOYMENT.md # Vercel & Supabase Cloud deploy runbook
│   ├── OFFLINE_SCHOOL_SERVER.md # Turnkey Docker setup for zero-internet school labs
│   ├── TEACHER_PILOT_GUIDE.md   # Practical 8-week school pilot implementation timeline
│   └── MOE_PILOT_AUTHORIZATION.md # County Director of Education submission & BOM resolutions
├── .github/workflows/ci.yml # Automated CI pipeline (lint, test, build)
├── Dockerfile             # Multi-stage production container
├── docker-compose.yml     # Standalone offline school appliance bundle
├── vercel.json            # Vercel Edge routing, PWA headers & SPA rewrites
├── SPEC_V2.md             # Complete specification & definition of done
└── package.json           # Monorepo scripts & dependencies
```

---

## 🛡️ Data Protection & Legal Compliance

PeerLearn is engineered in accordance with the **Kenya Data Protection Act, 2019**:
- **Data Minimization:** No personal phone numbers or home addresses are collected from learners.
- **Parental/Guardian Consent:** Mandatory consent timestamps tracked before cohort matching.
- **Right to Portability & Erasure:** Standardized endpoints (`/api/students/:id/export` and `/api/students/:id/erase`) allow complete export or permanent anonymization of student records upon institutional request.
- Review [`docs/PRIVACY.md`](docs/PRIVACY.md) and [`docs/SCHOOL_DATA_AGREEMENT.md`](docs/SCHOOL_DATA_AGREEMENT.md) for complete details.

---

## 📜 License

Licensed under the MIT License. Developed for secondary school educational equity in Kenya.
