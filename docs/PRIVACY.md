# PeerLearn — Plain-Language Privacy Policy
*Compliant with the Kenya Data Protection Act, 2019 (ODPC Guidelines for Children's Educational Data)*

**Last Updated:** October 2026  
**Applicability:** Kenyan Secondary Schools (Forms 1–4), Teachers, Students, and Legal Guardians.

---

### 1. Who We Are & Our Commitment
PeerLearn is an offline-first peer-tutoring educational matchmaker designed specifically for Kenyan secondary schools. Because our users include children under the age of 18, we adhere strictly to the principle of **data minimization** and treat all student data with the highest statutory safeguards under the **Kenya Data Protection Act, 2019 (Part IV, Section 33 - Processing of Personal Data Relating to Children)**.

---

### 2. What Information We Collect (and What We Do NOT Collect)

#### What We Collect:
- **School Identifier:** School Name, County, and School Code (e.g. `ALLIANCE`).
- **Student Profile:** Admission / Registration Number, Full Name, Form / Grade (1–4), and Stream.
- **Learning & Performance Data:** Diagnostic pre-quiz scores, post-quiz mastery scores, 7-day retention checks, and student feedback ratings.
- **Safeguarding Records:** Teacher approval endorsements, incident reports submitted by students or tutors, and guardian consent confirmation dates.
- **Cryptographic Security Hashes:** One-time student setup codes and 6-digit PIN hashes stored using salted SHA-256 (plain-text PINs are never stored or accessible by anyone).

#### What We NEVER Collect:
- ❌ **No Student Contact Details:** We do not collect student phone numbers, home addresses, or personal email addresses.
- ❌ **No Geolocation Tracking:** No GPS or real-time device location is collected.
- ❌ **No Commercial Profiling:** Data is never sold, shared with advertisers, or used for automated commercial decision-making.

---

### 3. How Student Data Is Stored & Protected
1. **Multi-Tenant Row-Level Security (RLS):** Every database row is strictly tagged with `school_id`. Supabase Row-Level Security ensures that School A's administrators, teachers, and students can never read or access School B's data under any condition.
2. **Offline-First Security:** Offline devices store only cached curriculum lessons and the authenticated student's own outbox in encrypted browser storage (`IndexedDB`). Credentials are validated on-device via zero-knowledge hashed comparisons.
3. **Synthetic Student Identity:** Platform authentication uses synthetic server-controlled credentials (`std_<uuid>@peerlearn.local`) with no external exposure.

---

### 4. Guardian Consent (SAFE-5)
In compliance with Section 33 of the Kenya Data Protection Act, guardian consent must be obtained and recorded by the school administration before a secondary school learner joins peer tutoring cohorts. Consent status and timestamp are permanently auditable in the school tenant.

---

### 5. Your Statutory Rights as a School, Guardian, or Student
Under the Kenya Data Protection Act 2019, you retain the following statutory rights:
1. **Right to Be Informed:** Plain disclosure of all data processing operations (this policy).
2. **Right to Access & Data Portability (Section 9):** Schools and guardians may request a complete JSON or CSV export of all learning records for any enrolled student via `GET /api/students/:id/export`.
3. **Right to Erasure / Right to Be Forgotten:** Upon verified request from a school principal or legal guardian, all personal identifying details (name, admission number, PIN credentials) will be permanently erased and anonymized (`POST /api/students/:id/erase`), retaining only unlinked aggregate pilot statistics for research compliance.
4. **Right to Rectification:** Teachers can update or correct roster entries directly in the Teacher Portal.

---

### 6. Contact & Data Protection Officer (DPO)
For any data protection inquiries, audit requests, or rights enforcement:
- **Email:** dpo@peerlearn.ke
- **Office:** Office of the Data Protection Commissioner (ODPC) Registered Education Pilot, Nairobi, Kenya.
