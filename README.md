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
# Run the complete test suite (41/41 passing)
npm test

# Check TypeScript types across both server and web workspaces
npm run typecheck
```

### Test Suites Included:
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
│   │   └── dashboards.ts  # Struggle heatmaps, no-improvement alerts, donor impact reports
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
│   └── SCHOOL_DATA_AGREEMENT.md # School Data Processing Agreement template
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
