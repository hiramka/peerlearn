# Ministry of Education Pilot Authorization & School Board Pack

## Institutional Framework for Secondary School Peer-Tutoring Deployment in Kenya

This document provides formal administrative templates and legal compliance schedules for presenting the PeerLearn peer-tutoring pilot to the **County Director of Education (CDE)**, **Sub-County Education Officers (SCDE)**, and the **School Board of Management (BOM)**.

---

## 🏛️ 1. Formal Submission Letter to County Director of Education

```
THE COUNTY DIRECTOR OF EDUCATION,
COUNTY EDUCATION BOARD,
MINISTRY OF EDUCATION, REPUBLIC OF KENYA.

RE: NOTICE OF INTENTION TO IMPLEMENT AN OFFLINE-FIRST STEM PEER-TUTORING PILOT PROGRAMME

Dear Sir/Madam,

We respectfully submit this notice of implementation of an academic peer-tutoring pilot project at [NAME OF SCHOOL] for secondary school students in Forms 1 to 4 and Junior Secondary Grade 8.

1. OBJECTIVES:
   The pilot utilizes "PeerLearn", an offline-first educational platform developed to raise mean grades in core STEM subjects (Mathematics, Biology, Chemistry, Physics, and Integrated Science) by pairing junior students struggling with specific sub-skills with trained, teacher-approved senior student peer tutors.

2. STRUCTURE & SUPERVISION:
   - All tutoring sessions are strictly 20 minutes in duration, occurring on school premises during supervised afternoon study periods (16:00 – 17:00).
   - Tutors are verified through a dual safeguard: attaining ≥ 80% on diagnostic assessments and explicit teacher approval.
   - Teachers retain complete visibility through a live telemetry dashboard and weekly struggle heatmaps.

3. LEGAL & CHILD SAFETY COMPLIANCE:
   - Fully compliant with the Kenya Data Protection Act (2019) regarding minors' data (Sec. 32).
   - No telephone numbers, biometric data, or residential addresses of learners are collected.
   - Dual-track parental consent is obtained prior to student participation.
   - No commercial advertisements, tracking cookies, or third-party data sharing.

We welcome your inspection and will furnish your office with an anonymized end-of-term learning gain evaluation report.

Yours faithfully,

_____________________________               _____________________________
[NAME OF PRINCIPAL / HEAD TEACHER]          [NAME OF BOM CHAIRPERSON]
Principal, [NAME OF SCHOOL]                 Chairperson, Board of Management
```

---

## 📜 2. School Board of Management (BOM) Minute Resolution Template

```
EXTRACT OF THE MINUTES OF THE BOARD OF MANAGEMENT MEETING HELD AT [NAME OF SCHOOL]
ON [DATE] IN THE BOARDROOM

MINUTE NO. BOM/2026/[NUMBER]: ADOPTION OF PEERLEARN PEER-TUTORING PILOT

Following a comprehensive briefing by the Principal and the Head of Department (Science & Mathematics) regarding the proposed offline-first peer tutoring intervention:

RESOLVED THAT:
1. The Board formally approves the rollout of the 8-week PeerLearn academic peer-tutoring pilot across Forms 1–4 and Grade 8 for Term [X], 2026.
2. The Principal shall ensure strict adherence to Ministry of Education safety directives and the Kenya Data Protection Act 2019, including ensuring that parental consent slips are signed and stored securely.
3. The pilot shall operate under the [CHOOSE ONE: Standard Pilot Tier at KES 15,000 per term / Sponsored Partner Tier subsidized by the Foundation partner].
4. A post-pilot impact report showing cohort learning lift and 7-day retention persistence shall be presented to the Academic Committee of the Board at the conclusion of the term.

Signed as a true record:

_____________________________               _____________________________
BOM Chairperson                             Secretary to the BOM / Principal
Date: _______________________               Date: _______________________
```

---

## 🛡️ 3. Kenya Data Protection Act (2019) Minor Protection Schedule

| Statutory Provision (DPA 2019) | PeerLearn Technical & Operational Implementation |
|---|---|
| **Section 3 (Principles of Data Protection)** | **Data Minimization:** Only school admission number, student first name, and grade level are stored. Zero phone numbers, emails, or GPS locations are stored for minors. |
| **Section 32 (Processing of Children's Data)** | **Mandatory Guardian Consent:** Physical signed paper slips with serial tracking or in-app verified consent must precede match proposals. |
| **Section 35 (Right to Portability & Erasure)** | **Standardized Erasure Endpoint:** Schools can trigger complete anonymization of any learner record (`POST /api/students/:id/erase`), scrubbing personal identifiers while retaining anonymized scientific gain statistics. |
| **Section 41 (Data Security Measures)** | **Multi-Tenant Row-Level Security:** Database tables are isolated strictly by `school_id`. Cross-tenant data inspection is cryptographically prevented via Postgres RLS. |

---

## 💼 4. Pilot Pricing & Telco / Foundation Subsidy Framework

Under Section 10 of the PeerLearn specification, school pilot deployment can be funded via three transparent pathways:

1. **Standard School Pilot (KES 15,000 / school / term):**
   - Direct payment by the School Board of Management.
   - Covers up to 500 active learners, unlimited tutor matching, offline PWA access, teacher dashboards, and term impact reporting.
2. **Sponsor / Donor Subsidized (KES 0 to School):**
   - Fully subsidized through corporate social responsibility (CSR) foundations (e.g. Safaricom Foundation, Equity Group Foundation, UNICEF Kenya, KCB Foundation).
   - Platform provides the sponsor with quarterly aggregated empirical learning gain proof (demo data strictly excluded under Rule R5).
3. **Free Sandbox Tier (KES 0):**
   - Evaluation demo tier for prospective schools, limited to one demo stream to evaluate software usability before board approval.
