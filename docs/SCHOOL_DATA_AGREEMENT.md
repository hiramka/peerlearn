# PeerLearn — School Data Processing Agreement (DPA) Template
*Standard Contractual Clauses for Secondary School Institutional Onboarding*

**Between:**
1. **The School:** [School Name], represented by the Principal / Head of Institution (hereinafter "Data Controller").
2. **PeerLearn Pilot Platform:** PeerLearn Education Technologies (hereinafter "Data Processor").

---

### 1. Purpose & Scope of Processing
The Data Processor provides offline-first digital infrastructure for peer-tutoring diagnostics, matches, and learning analytics for secondary school students in Forms 1 through 4. The Data Processor shall only process student data strictly on the instructions of the School and for educational evaluation purposes.

---

### 2. Obligations of the Data Processor
1. **Multi-School Isolation:** Enforce rigorous multi-tenant Row-Level Security (RLS) guaranteeing that no unauthorized users, partner schools, or third parties can access the School's student roster or session events.
2. **Children's Privacy Protection:** Comply with Section 33 of the Kenya Data Protection Act, 2019. Student credentials, PINs, and personal records shall remain encrypted.
3. **Audit Trail Logging:** Maintain tamper-evident logs (`audit_log`) of all tutor approvals, suspensions, student roster imports, and PIN resets initiated by school staff.
4. **Data Portability & Deletion:** Provide automated tooling for bulk CSV export and individualized data erasure upon school request.
5. **No Commercial Use or Sale:** The Data Processor shall never monetize, sell, or disclose student records or institutional telemetry to commercial advertising networks.

---

### 3. Obligations of the School (Data Controller)
1. **Parental & Guardian Consent:** The School certifies that written or institutional guardian consent has been collected and verified prior to activating student accounts on PeerLearn.
2. **Credential Safeguarding:** The School shall ensure that teacher admin credentials and printable student setup slips (`CLS-3`) are stored securely and distributed solely to authorized learners.
3. **Safeguarding Escalation:** Teachers and school administrators agree to review confidential incident reports (`SAFE-4`) filed through the platform promptly.

---

### 4. Incident Response & Breach Notification
In the event of any security incident affecting the confidentiality or integrity of student data, the Data Processor shall notify the School's Data Representative within **24 hours** of discovery and provide full cooperation with the Office of the Data Protection Commissioner (ODPC).

---

### 5. Term & Termination
This agreement takes effect upon school application approval and remains active throughout the pilot period. Upon termination or conclusion of the school pilot, the School may request complete export of institutional records, after which all school tenant database rows will be securely purged.

**Authorized Signatory for the School:**  
Name: ________________________________  
Title: Principal / Head of Institution  
Date: ________________________________  

**Authorized Signatory for PeerLearn:**  
Name: ________________________________  
Title: Pilot Director, PeerLearn Kenya  
Date: ________________________________  
