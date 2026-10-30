import React, { useState } from "react";

interface PrintableConsentSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudent?: {
    id: string;
    fullName: string;
    regNumber: string;
    grade: number;
    schoolName: string;
    schoolId: string;
  };
  onConsentRecorded?: (studentId: string) => void;
}

export const PrintableConsentSlipModal: React.FC<PrintableConsentSlipModalProps> = ({
  isOpen,
  onClose,
  defaultStudent = {
    id: "l1",
    fullName: "Amani R. (Learner)",
    regNumber: "ADM-101",
    grade: 2,
    schoolName: "Alliance High School",
    schoolId: "11111111-1111-1111-1111-111111111111",
  },
  onConsentRecorded,
}) => {
  const [lang, setLang] = useState<"en" | "sw">("en");
  const [activeTab, setActiveTab] = useState<"slip" | "verify">("slip");
  const [studentId, setStudentId] = useState(defaultStudent.id);
  const [studentName, setStudentName] = useState(defaultStudent.fullName);
  const [regNumber, setRegNumber] = useState(defaultStudent.regNumber);
  const [grade, setGrade] = useState(defaultStudent.grade);
  const [schoolName] = useState(defaultStudent.schoolName);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianNationalId, setGuardianNationalId] = useState("");
  const [slipSerial, setSlipSerial] = useState(
    `PL-KE-G${defaultStudent.grade}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  );
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleVerifySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/guardian-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: defaultStudent.schoolId,
          studentId,
          guardianName: guardianName || "Parent / Legal Guardian",
          guardianPhone,
          guardianNationalId,
          consentType: "paper_slip",
          slipSerialNumber: slipSerial,
          verifiedBy: "Teacher In-Charge",
        }),
      });
      if (res.ok) {
        setVerifiedSuccess(true);
        if (onConsentRecorded) onConsentRecorded(studentId);
      }
    } catch (err) {
      console.error("Verification failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          color: "#0f172a",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold", color: "#1e293b" }}>
              📋 {lang === "en" ? "Ministry & DPA 2019 Parental Consent Slip" : "Fomu ya Idhini ya Mzazi / Mlezi"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              {lang === "en"
                ? "Physical paper consent workflow for secondary school peer tutoring (Kenya DPA Sec. 32)"
                : "Utaratibu wa idhini ya karatasi kwa masomo rika ya shule za upili"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setLang(lang === "en" ? "sw" : "en")}
              style={{
                padding: "4px 10px",
                fontSize: "0.8rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f1f5f9",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              🌐 {lang === "en" ? "Kiswahili" : "English"}
            </button>
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#64748b",
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <button
            onClick={() => setActiveTab("slip")}
            style={{
              flex: 1,
              padding: "12px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "slip" ? "3px solid #0284c7" : "none",
              backgroundColor: activeTab === "slip" ? "#ffffff" : "transparent",
              color: activeTab === "slip" ? "#0284c7" : "#64748b",
              cursor: "pointer",
            }}
          >
            🖨️ {lang === "en" ? "Print Official Slip" : "Chapisha Fomu"}
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            style={{
              flex: 1,
              padding: "12px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "verify" ? "3px solid #0284c7" : "none",
              backgroundColor: activeTab === "verify" ? "#ffffff" : "transparent",
              color: activeTab === "verify" ? "#0284c7" : "#64748b",
              cursor: "pointer",
            }}
          >
            ✍️ {lang === "en" ? "Verify Returned Signed Slip" : "Thibitisha Fomu Iliyorudishwa"}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", flex: 1 }}>
          {activeTab === "slip" ? (
            <div>
              {/* Printable Area with border styled like official Kenya Education document */}
              <div
                id="printable-slip"
                style={{
                  border: "2px solid #1e293b",
                  padding: "24px",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  fontFamily: "serif",
                  lineHeight: 1.6,
                }}
              >
                {/* Header Republic of Kenya Coat of Arms / Header */}
                <div style={{ textAlign: "center", borderBottom: "2px solid #1e293b", paddingBottom: "12px" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", textTransform: "uppercase" }}>
                    REPUBLIC OF KENYA • MINISTRY OF EDUCATION
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155" }}>
                    COUNTY EDUCATION BOARD • {schoolName.toUpperCase()}
                  </div>
                  <div
                    style={{
                      margin: "8px auto 0",
                      padding: "4px 12px",
                      backgroundColor: "#0284c7",
                      color: "#ffffff",
                      display: "inline-block",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {lang === "en"
                      ? "OFFICIAL PEER-TUTORING PILOT GUARDIAN CONSENT SLIP"
                      : "FOMU RASMI YA IDHINI YA MZAZI KWA MASOMO RIKA"}
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#64748b" }}>
                    Serial No: <strong>{slipSerial}</strong> | Legal Reference: Kenya Data Protection Act (2019) Sec. 32
                  </div>
                </div>

                {/* Student Details Table */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    margin: "16px 0",
                    padding: "12px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                  }}
                >
                  <div>
                    <strong>{lang === "en" ? "Learner Name:" : "Jina la Mwanafunzi:"}</strong> {studentName}
                  </div>
                  <div>
                    <strong>{lang === "en" ? "Admission / Reg No:" : "Nambari ya Usajili:"}</strong> {regNumber}
                  </div>
                  <div>
                    <strong>{lang === "en" ? "Form / Grade:" : "Kidato / Darasa:"}</strong> Form {grade}
                  </div>
                  <div>
                    <strong>{lang === "en" ? "School Name:" : "Jina la Shule:"}</strong> {schoolName}
                  </div>
                </div>

                {/* Consent Legal Notice */}
                <div style={{ fontSize: "0.85rem", color: "#1e293b", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 8px" }}>
                    {lang === "en"
                      ? "Dear Parent / Legal Guardian,"
                      : "Mpendwa Mzazi / Mlezi wa Kisheria,"}
                  </p>
                  <p style={{ margin: "0 0 8px" }}>
                    {lang === "en"
                      ? `Your child has been recommended to participate in the PeerLearn offline peer-tutoring programme at ${schoolName}. Senior student tutors will provide structured 20-minute guided academic sessions in STEM subjects (Math, Biology, Physics, Chemistry).`
                      : `Mwanao amependekezwa kushiriki katika mpango wa masomo rika wa PeerLearn katika ${schoolName}. Wanafunzi wa madarasa ya juu watatoa mwongozo wa masomo kwa dakika 20 katika masomo ya Sayansi na Hesabu.`}
                  </p>
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f0fdf4",
                      borderLeft: "4px solid #16a34a",
                      fontSize: "0.8rem",
                      color: "#166534",
                      marginBottom: "12px",
                    }}
                  >
                    <strong>✓ {lang === "en" ? "Data Protection & Privacy Guarantee:" : "Ulinzi wa Data na Faragha:"}</strong>{" "}
                    {lang === "en"
                      ? "Under the Kenya Data Protection Act 2019, PeerLearn operates strictly offline-first. No telephone numbers, biometric data, or private residential addresses of learners are collected. Sessions occur on school premises under teacher supervision."
                      : "Chini ya Sheria ya Kulinda Data ya Kenya ya 2019, PeerLearn inafanya kazi bila intaneti. Hakuna nambari za simu za wanafunzi au maeneo wanayoishi yanayokusanywa. Vipindi hufanyika shuleni chini ya ulinzi wa mwalimu."}
                  </div>
                </div>

                {/* Guardian Declaration & Signature Area */}
                <div
                  style={{
                    border: "1px dashed #94a3b8",
                    padding: "16px",
                    borderRadius: "6px",
                    marginTop: "16px",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.9rem", marginBottom: "8px" }}>
                    {lang === "en" ? "PARENT / GUARDIAN DECLARATION:" : "TAMKO LA MZAZI / MLEZI:"}
                  </div>
                  <p style={{ fontSize: "0.85rem", margin: "0 0 12px" }}>
                    {lang === "en"
                      ? "I, the undersigned Parent/Guardian, hereby give consent for my child to participate in the peer-tutoring academic programme. I understand I may withdraw consent at any time via written notice to the school."
                      : "Mimi, niliyetia saini hapa chini kama Mzazi/Mlezi, ninatoa idhini kwa mwanangu kushiriki katika mpango wa masomo rika. Naelewa ninaweza kubatilisha idhini wakati wowote kwa barua kwa shule."}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.85rem" }}>
                    <div>
                      <div>{lang === "en" ? "Guardian Full Name:" : "Jina Kamili la Mzazi:"} _______________________________</div>
                      <div style={{ marginTop: "12px" }}>{lang === "en" ? "National ID No:" : "Nambari ya Kitambulisho:"} _______________________________</div>
                    </div>
                    <div>
                      <div>{lang === "en" ? "Signature:" : "Saini:"} _______________________________</div>
                      <div style={{ marginTop: "12px" }}>{lang === "en" ? "Date:" : "Tarehe:"} _______________________________</div>
                    </div>
                  </div>
                </div>

                {/* School Stamp Box */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "20px",
                    paddingTop: "12px",
                    borderTop: "1px solid #cbd5e1",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    <div>{lang === "en" ? "Teacher In-Charge Signature:" : "Saini ya Mwalimu Msimamizi:"} ________________________</div>
                    <div style={{ marginTop: "6px" }}>{lang === "en" ? "Date Received:" : "Tarehe ya Kupokea:"} ________________________</div>
                  </div>
                  <div
                    style={{
                      border: "2px dashed #94a3b8",
                      width: "160px",
                      height: "70px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      textAlign: "center",
                    }}
                  >
                    {lang === "en" ? "OFFICIAL SCHOOL RUBBER STAMP" : "MHURI WA SHULE"}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {lang === "en" ? "Close" : "Funga"}
                </button>
                <button
                  onClick={handlePrint}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  🖨️ {lang === "en" ? "Print Consent Slip" : "Chapisha Fomu"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {verifiedSuccess ? (
                <div
                  style={{
                    padding: "24px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>✅</div>
                  <h3 style={{ margin: "0 0 8px", color: "#166534" }}>
                    {lang === "en" ? "Paper Consent Slip Verified & Logged!" : "Idhini ya Karatasi Imethibitishwa!"}
                  </h3>
                  <p style={{ margin: "0 0 16px", color: "#15803d", fontSize: "0.9rem" }}>
                    Student <strong>{studentName}</strong> ({regNumber}) has been marked as having valid guardian
                    consent. They are now cleared for peer tutoring matching and sessions.
                  </p>
                  <button
                    onClick={() => {
                      setVerifiedSuccess(false);
                      onClose();
                    }}
                    style={{
                      padding: "8px 20px",
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifySlip}>
                  <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#64748b" }}>
                    {lang === "en"
                      ? "When a student returns the physically signed paper slip, record the verification here to activate their safeguarding clearance."
                      : "Mwanafunzi anaporudisha fomu ya karatasi iliyotiwa saini na mzazi, thibitisha hapa kumpatia kibali."}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                        Student ID / Reg Number
                      </label>
                      <input
                        type="text"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                        Slip Serial Number
                      </label>
                      <input
                        type="text"
                        value={slipSerial}
                        onChange={(e) => setSlipSerial(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                        Parent / Guardian Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Mwangi"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                        Parent Phone or National ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0712345678 or ID 28475910"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#16a34a",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSubmitting ? "Verifying..." : "✓ Confirm Signed Slip & Clear Learner"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
