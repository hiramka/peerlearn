# PeerLearn Teacher Field Operations Guide

## Kenyan Secondary School Peer-Tutoring Pilot Implementation Handbook

This field guide provides teachers and school administrators with a practical, step-by-step roadmap for launching and managing an 8-week peer-tutoring pilot using PeerLearn in secondary schools (Forms 1–4 and CBC Junior Secondary Grade 8).

---

## 📅 8-Week Term Pilot Timeline

```
Week 1: Onboarding & Consent
  └── Distribute one-time setup slips (CLS-3) & physical parental consent slips (SAFE-5)
  └── Import student roster via CSV (reg_number, full_name, grade, class_stream)

Week 2: Diagnostic Benchmark & Tutor Certification
  └── Students complete topic diagnostic assessments (≥ 80% threshold)
  └── Candidate tutors complete 4 pedagogical micro-modules & scenario quizzes (Phase 8)
  └── Teacher reviews & approves qualified tutors in the dashboard

Weeks 3–6: Core Peer-Tutoring Sessions
  └── 20-minute structured sessions run 2× per week (e.g. 16:00–17:00 prep period)
  └── 1-on-1 pairs or 1-to-3 small-group sessions for common struggle topics
  └── Outbox queues all session results locally on the device

Week 7: Retention Persistence & Post-Pilot Diagnostics
  └── Automated 7-day retention checks administered to verify knowledge persistence (PROOF-3)
  └── Comparison control group benchmarks evaluated for empirical lift calculation (PROOF-5)

Week 8: Board of Management & Donor Impact Reporting
  └── Teacher generates end-of-term struggle heatmap & pilot summary CSV (DASH-1)
  └── Export anonymized impact report for school board and sponsor partners (R5)
```

---

## 🖥️ Computer Lab & Device Provisioning (Offline-First)

### 1. Supported Hardware
- **School Computer Lab Desktops / Laptops:** Chrome, Edge, Firefox (Windows, Linux, Ubuntu).
- **Shared Tablets:** Low-cost Android tablets (Android 8.0+ with Chrome browser).
- **Teacher Laptop / Mobile:** Used for real-time monitoring and PIN resets.

### 2. Zero-Internet Initial Setup (One-Tap Preloading)
1. Connect the lab devices to internet once (via school Wi-Fi or mobile hotspot).
2. Open the PeerLearn PWA URL (e.g. `https://peerlearn.ke` or local school appliance `http://192.168.1.100:3000`).
3. Click the browser prompt **"Install PeerLearn App"** or **"Add to Home Screen"**.
4. In the top navigation, click **"⬇ Bulk Download"**.
5. Once complete, all 8 STEM lesson packs, questions, and guides are stored locally in IndexedDB (`idb`).
6. Disconnect internet: The platform is now **100% operational offline**.

---

## ⏱️ The 20-Minute Guided Session Structure

Every peer-tutoring session is capped at 20 minutes to fit neatly within secondary school afternoon prep periods (16:00–17:00):

| Timeframe | Activity | Screen Flow | Role Responsibility |
|---|---|---|---|
| **00:00 – 03:00** | **Baseline Diagnostic Pre-Quiz** | 3 multiple-choice questions tagged with difficulty & sub-skills | Learner answers independently on the screen. Tutor observes without prompting. |
| **03:00 – 15:00** | **Guided Concept Study & Worked Practice** | 4-step pedagogical guide + worked examples + interactive timer | Tutor uses Socratic questioning ("What does the '=' sign mean?"). Learner works through practice problems. |
| **15:00 – 18:00** | **Evaluation Post-Quiz** | 3 disjoint evaluation questions (PROOF-2) | Learner answers independently to evaluate immediate mastery gain. |
| **18:00 – 20:00** | **Mastery Gain & Mutual Feedback** | Results summary card with $+X\%$ gain badge | Both rate session quality (1 to 5 stars + feedback tags: *Clear Explanation*, *Patient*, *Helpful*). |

---

## 🛡️ Safeguarding & Student Protection Protocol

In accordance with the **Kenya Data Protection Act (2019)** and **Ministry of Education Child Safety Directives**:

1. **Venue Supervision:** All sessions must occur physically in the designated school classroom or library under the supervision of a teacher on duty.
2. **Contact Privacy:** Student phone numbers and personal emails are never displayed to peers.
3. **Teacher Sign-off (SAFE-1):** Tutors must attain $\ge 80\%$ diagnostic score AND have explicit teacher approval before appearing in match recommendations.
4. **Instant Problem Reporting (SAFE-4):**
   - If either learner or tutor encounters inappropriate behavior or distraction, they click **"🚩 Report a Problem"**.
   - The report immediately alerts the teacher dashboard and school admin.
5. **Tutor Suspension (SAFE-2):**
   - Teachers can instantly suspend any tutor with 1 click in the Teacher Safeguarding panel.

---

## 📋 Dual Guardian Consent Procedures

Under Kenya DPA Section 32, processing minors' educational telemetry requires guardian consent:

- **Option A: Physical Signed Paper Slip (Recommended for boarding/rural schools):**
  1. Open the Teacher Dashboard $\to$ click **"📋 Consent Slip"**.
  2. Print the official Republic of Kenya / DPA 2019 Parental Consent Slip with unique serial number (e.g. `PL-KE-G2-...`).
  3. Send home with students or distribute on school opening / visiting day.
  4. When returned with parent/guardian signature, teacher enters the serial number in **"Verify Returned Signed Slip"** to activate learner clearance.
- **Option B: Digital In-App Consent:**
  - Parents visiting the school can review the plain-language privacy notice on the teacher's device and tap digital consent.

---

## 🔄 Offline Synchronization & Power Outage Recovery

If your school experiences a power blackout or network disruption:
1. **Never close or clear browser history:** All session results are stored in the local IndexedDB `outbox`.
2. **Tamper-Evident QR Transfer (Phase 8):**
   - If the student tablet has no internet, tap **"📱 QR Transfer"** to generate a high-density SVG code.
   - Teacher scans the QR code with their mobile phone: all results transfer with zero internet data.
3. **Automatic Cloud Sync:**
   - As soon as connectivity restores, PeerLearn automatically synchronizes all queued sessions idempotently using the unique `client_id` (first-write-wins).
