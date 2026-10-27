import { describe, it, expect, beforeEach } from "vitest";
import {
  importStudentsCSV,
  studentFirstSetup,
  studentLogin,
  resetStudentPin,
  submitSchoolApplication,
  approveSchoolApplication,
  schoolsStore,
  profilesStore,
  studentCredentialsStore,
  auditLogsStore,
  buildSyntheticEmail,
} from "../server/src/auth";

describe("Phase 2: Registration, Login & Multi-Tenancy (AUTH, CLS, ONB)", () => {
  const schoolA = schoolsStore[0]; // ALLIANCE
  const schoolB = schoolsStore[1]; // MANGU

  it("AUTH-4: Synthetic email format follows {school_code}.{reg_number}@students.peerlearn.invalid", () => {
    const email = buildSyntheticEmail("ALLIANCE", "ADM-999");
    expect(email).toBe("alliance.adm999@students.peerlearn.invalid");
  });

  it("CLS-1: Teacher imports students via CSV and receives one-time setup codes", () => {
    const csvRows = [
      { reg_number: "ADM-200", full_name: "John Kamau", grade: 2, class_stream: "2East" },
      { reg_number: "ADM-201", full_name: "Faith Wambui", grade: 2, class_stream: "2West" },
    ];

    const result = importStudentsCSV(schoolA.id, csvRows);
    expect(result.importedCount).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.results).toHaveLength(2);

    const kamau = result.results.find((r) => r.reg_number === "ADM-200");
    expect(kamau).toBeDefined();
    expect(kamau?.setup_code).toMatch(/^PL-[A-Z0-9]{6}$/);

    // Profile and credentials stored
    const profile = profilesStore.find((p) => p.reg_number === "ADM-200");
    expect(profile).toBeDefined();
    expect(profile?.full_name).toBe("John Kamau");

    const cred = studentCredentialsStore.find((c) => c.userId === profile?.id);
    expect(cred).toBeDefined();
    expect(cred?.setupUsed).toBe(false);
  });

  it("AUTH-3: First login sets 6-digit PIN and invalidates setup code", () => {
    // 1. Import a new student
    const importRes = importStudentsCSV(schoolA.id, [
      { reg_number: "ADM-300", full_name: "David Ochieng", grade: 3, class_stream: "3North" },
    ]);
    const setupCode = importRes.results[0].setup_code;

    // Reject non-6-digit PIN
    const badPinRes = studentFirstSetup({
      school_code: schoolA.school_code,
      reg_number: "ADM-300",
      setup_code: setupCode,
      pin: "123", // too short
    });
    expect(badPinRes.ok).toBe(false);
    expect(badPinRes.error).toContain("6 digits");

    // Successful first setup
    const setupRes = studentFirstSetup({
      school_code: schoolA.school_code,
      reg_number: "ADM-300",
      setup_code: setupCode,
      pin: "654321",
    });
    expect(setupRes.ok).toBe(true);
    expect(setupRes.session?.user.reg_number).toBe("ADM-300");

    // Cannot re-use the setup code
    const reuseRes = studentFirstSetup({
      school_code: schoolA.school_code,
      reg_number: "ADM-300",
      setup_code: setupCode,
      pin: "654321",
    });
    expect(reuseRes.ok).toBe(false);
    expect(reuseRes.error).toContain("already been used");
  });

  it("AUTH-4 & AUTH-5: Student logs in, fails 5 times, gets locked for 15 mins, and is reset by teacher", () => {
    // 1. Import and set up student
    const importRes = importStudentsCSV(schoolA.id, [
      { reg_number: "ADM-400", full_name: "Esther Muthoni", grade: 2 },
    ]);
    const setupCode = importRes.results[0].setup_code;

    studentFirstSetup({
      school_code: schoolA.school_code,
      reg_number: "ADM-400",
      setup_code: setupCode,
      pin: "112233",
    });

    // 2. Successful login on device 2
    const loginOk = studentLogin({
      school_code: schoolA.school_code,
      reg_number: "ADM-400",
      pin: "112233",
    });
    expect(loginOk.ok).toBe(true);
    expect(loginOk.session?.user.full_name).toBe("Esther Muthoni");

    // 3. Enter wrong PIN 4 times -> warnings with remaining attempts
    for (let i = 1; i <= 4; i++) {
      const fail = studentLogin({
        school_code: schoolA.school_code,
        reg_number: "ADM-400",
        pin: "999999",
      });
      expect(fail.ok).toBe(false);
      expect(fail.locked).toBeUndefined();
      expect(fail.error).toContain(`${5 - i} attempt`);
    }

    // 4. 5th failure -> Account locked!
    const lockFail = studentLogin({
      school_code: schoolA.school_code,
      reg_number: "ADM-400",
      pin: "999999",
    });
    expect(lockFail.ok).toBe(false);
    expect(lockFail.locked).toBe(true);
    expect(lockFail.error).toContain("Account locked for 15 minutes");

    // 5. Subsequent attempt during lockout is immediately blocked
    const blocked = studentLogin({
      school_code: schoolA.school_code,
      reg_number: "ADM-400",
      pin: "112233", // even with correct PIN
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.locked).toBe(true);

    // 6. Teacher resets student PIN (AUTH-6)
    const resetRes = resetStudentPin("teacher1", schoolA.id, "ADM-400");
    expect(resetRes.ok).toBe(true);
    expect(resetRes.setupCode).toBeDefined();

    // Audit log was recorded
    const lastAudit = auditLogsStore[auditLogsStore.length - 1];
    expect(lastAudit.action).toBe("pin_reset");
    expect(lastAudit.detail.reg_number).toBe("ADM-400");

    // 7. Student uses new setup code to set new PIN and successfully logs in again!
    const reSetup = studentFirstSetup({
      school_code: schoolA.school_code,
      reg_number: "ADM-400",
      setup_code: resetRes.setupCode!,
      pin: "998877",
    });
    expect(reSetup.ok).toBe(true);

    const reLogin = studentLogin({
      school_code: schoolA.school_code,
      reg_number: "ADM-400",
      pin: "998877",
    });
    expect(reLogin.ok).toBe(true);
  });

  it("Cross-School Isolation: School A student cannot log in using School B code", () => {
    const crossSchool = studentLogin({
      school_code: schoolB.school_code, // MANGU code
      reg_number: "ADM-400",           // ALLIANCE student
      pin: "998877",
    });
    expect(crossSchool.ok).toBe(false);
    expect(crossSchool.error).toContain("Registration number not found in this school");
  });

  it("ONB-1 to ONB-4: Public school application & approval creates sandbox tenant", () => {
    // 1. Submit public application
    const appRes = submitSchoolApplication({
      school_name: "Starehe Boys Centre",
      county: "Nairobi",
      school_type: "public",
      contact_name: "Mrs. Kariuki",
      contact_phone: "0712345678",
      contact_email: "kariuki@starehe.ac.ke",
      student_count: 850,
      grades: [1, 2, 3, 4],
      subjects: ["Math", "Science"],
      consent_given: true,
    });
    expect(appRes.ok).toBe(true);
    expect(appRes.application.status).toBe("pending");

    // 2. Approve application
    const approveRes = approveSchoolApplication(appRes.application.id!);
    expect(approveRes.ok).toBe(true);
    expect(approveRes.school?.status).toBe("sandbox");
    expect(approveRes.school?.school_code).toMatch(/^STAR-\d{4}$/);

    // School is now active in schools store
    const registered = schoolsStore.find((s) => s.id === approveRes.school?.id);
    expect(registered).toBeDefined();
  });
});
