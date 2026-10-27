import crypto from "crypto";
import type {
  School,
  StudentProfile,
  AuthSession,
  StudentSetupInput,
  StudentLoginInput,
  CSVImportStudentRow,
  SchoolApplication,
} from "../../shared/types";

// In-memory tenant and auth store (mirrors Supabase tables for zero-dependency local dev/testing)
export interface StoredStudentCredential {
  userId: string;
  schoolId: string;
  setupCodeHash: string;
  setupUsed: boolean;
  pinHash?: string;
  failedAttempts: number;
  lockedUntil?: Date | null;
}

export interface StoredAuditLog {
  id: number;
  schoolId: string;
  actorId: string;
  action: string;
  detail: any;
  createdAt: string;
}

// Initial seed tenants
export const schoolsStore: School[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Alliance High School",
    county: "Kiambu",
    school_code: "ALLIANCE",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Mangu High School",
    county: "Kiambu",
    school_code: "MANGU",
    status: "active",
    created_at: new Date().toISOString(),
  },
];

export const applicationsStore: SchoolApplication[] = [];

export const profilesStore: StudentProfile[] = [
  {
    id: "l1",
    school_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Amani R. (Learner)",
    reg_number: "ADM-101",
    grade: 2,
    class_stream: "2A",
    language: "en",
    is_demo: false,
    availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
  },
  {
    id: "t1",
    school_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Wanjiru (Tutor)",
    reg_number: "ADM-102",
    grade: 3,
    class_stream: "3B",
    language: "en",
    is_demo: false,
    availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
  },
  {
    id: "teacher1",
    school_id: "11111111-1111-1111-1111-111111111111",
    full_name: "Mr. Mwangi (Teacher)",
    reg_number: "STAFF-01",
    grade: 0,
    class_stream: "Staff",
    language: "en",
  },
];

export const studentCredentialsStore: StoredStudentCredential[] = [
  {
    userId: "l1",
    schoolId: "11111111-1111-1111-1111-111111111111",
    setupCodeHash: hashString("SETUP-1234"),
    setupUsed: true,
    pinHash: hashString("123456"),
    failedAttempts: 0,
  },
];

export const auditLogsStore: StoredAuditLog[] = [];

// Helper functions
export function hashString(str: string): string {
  return crypto.createHash("sha256").update(str.trim()).digest("hex");
}

export function generateSetupCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude ambiguous 0, 1, I, O
  let code = "PL-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateSchoolCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = clean.substring(0, 4) || "SCH";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export function buildSyntheticEmail(schoolCode: string, regNumber: string): string {
  const s = schoolCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const r = regNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${s}.${r}@students.peerlearn.invalid`;
}

// AUTH-3 & AUTH-4: Student First-Time Setup
export function studentFirstSetup(input: StudentSetupInput): { ok: boolean; session?: AuthSession; error?: string } {
  const { school_code, reg_number, setup_code, pin } = input;

  if (!pin || !/^\d{6}$/.test(pin)) {
    return { ok: false, error: "PIN must be exactly 6 digits (0-9)." };
  }

  const school = schoolsStore.find((s) => s.school_code.toUpperCase() === school_code.toUpperCase());
  if (!school) {
    return { ok: false, error: "Invalid school code. Please verify with your teacher." };
  }

  const profile = profilesStore.find(
    (p) => p.school_id === school.id && p.reg_number.toUpperCase() === reg_number.toUpperCase()
  );
  if (!profile) {
    return { ok: false, error: "Registration number not found in this school." };
  }

  const cred = studentCredentialsStore.find((c) => c.userId === profile.id);
  if (!cred) {
    return { ok: false, error: "No credentials record found. Please ask your teacher to generate a setup code." };
  }

  if (cred.setupUsed) {
    return { ok: false, error: "Setup code has already been used. Please log in with your PIN or request a reset." };
  }

  if (cred.setupCodeHash !== hashString(setup_code)) {
    return { ok: false, error: "Incorrect one-time setup code. Please check your setup slip." };
  }

  // Set PIN and mark used
  cred.pinHash = hashString(pin);
  cred.setupUsed = true;
  cred.failedAttempts = 0;
  cred.lockedUntil = null;

  const session: AuthSession = {
    user: {
      id: profile.id,
      full_name: profile.full_name,
      role: "learner",
      school_id: school.id,
      school_code: school.school_code,
      reg_number: profile.reg_number,
      grade: profile.grade,
    },
    token: `session_${profile.id}_${Date.now()}`,
  };

  return { ok: true, session };
}

// AUTH-4 & AUTH-5: Student Login with Lockout
export function studentLogin(input: StudentLoginInput): { ok: boolean; session?: AuthSession; error?: string; locked?: boolean } {
  const { school_code, reg_number, pin } = input;

  const school = schoolsStore.find((s) => s.school_code.toUpperCase() === school_code.toUpperCase());
  if (!school) {
    return { ok: false, error: "Invalid school code." };
  }

  const profile = profilesStore.find(
    (p) => p.school_id === school.id && p.reg_number.toUpperCase() === reg_number.toUpperCase()
  );
  if (!profile) {
    return { ok: false, error: "Registration number not found in this school." };
  }

  const cred = studentCredentialsStore.find((c) => c.userId === profile.id);
  if (!cred || !cred.pinHash) {
    return { ok: false, error: "Account has not been activated. Please complete first-time setup with your setup code." };
  }

  // Check 15-minute lockout (AUTH-5)
  if (cred.lockedUntil && cred.lockedUntil > new Date()) {
    const remainingMins = Math.ceil((cred.lockedUntil.getTime() - Date.now()) / (60 * 1000));
    return {
      ok: false,
      locked: true,
      error: `Account is locked due to 5 consecutive failed attempts. Please try again in ${remainingMins} minute(s) or ask a teacher to reset your PIN.`,
    };
  }

  if (cred.pinHash !== hashString(pin)) {
    cred.failedAttempts += 1;
    if (cred.failedAttempts >= 5) {
      cred.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      return {
        ok: false,
        locked: true,
        error: "Too many failed attempts. Account locked for 15 minutes. Contact your teacher for assistance.",
      };
    }
    const left = 5 - cred.failedAttempts;
    return { ok: false, error: `Invalid PIN. ${left} attempt${left === 1 ? "" : "s"} remaining before temporary lockout.` };
  }

  // Success
  cred.failedAttempts = 0;
  cred.lockedUntil = null;

  const session: AuthSession = {
    user: {
      id: profile.id,
      full_name: profile.full_name,
      role: "learner",
      school_id: school.id,
      school_code: school.school_code,
      reg_number: profile.reg_number,
      grade: profile.grade,
    },
    token: `session_${profile.id}_${Date.now()}`,
  };

  return { ok: true, session };
}

// AUTH-6: Teacher PIN Reset
export function resetStudentPin(teacherId: string, schoolId: string, studentRegNumber: string): { ok: boolean; setupCode?: string; error?: string } {
  const profile = profilesStore.find(
    (p) => p.school_id === schoolId && p.reg_number.toUpperCase() === studentRegNumber.toUpperCase()
  );
  if (!profile) {
    return { ok: false, error: "Student registration number not found." };
  }

  const newCode = generateSetupCode();
  let cred = studentCredentialsStore.find((c) => c.userId === profile.id);

  if (!cred) {
    cred = {
      userId: profile.id,
      schoolId,
      setupCodeHash: hashString(newCode),
      setupUsed: false,
      failedAttempts: 0,
      lockedUntil: null,
    };
    studentCredentialsStore.push(cred);
  } else {
    cred.setupCodeHash = hashString(newCode);
    cred.setupUsed = false;
    cred.failedAttempts = 0;
    cred.lockedUntil = null;
  }

  // Audit log (AUTH-6, SAFE-6)
  auditLogsStore.push({
    id: auditLogsStore.length + 1,
    schoolId,
    actorId: teacherId,
    action: "pin_reset",
    detail: { student_id: profile.id, reg_number: profile.reg_number },
    createdAt: new Date().toISOString(),
  });

  return { ok: true, setupCode: newCode };
}

// CLS-1 & CLS-3: Student CSV Importer with Printable Setup Codes
export function importStudentsCSV(schoolId: string, rows: CSVImportStudentRow[]): {
  importedCount: number;
  skippedCount: number;
  errors: string[];
  results: { reg_number: string; full_name: string; grade: number; class_stream?: string; setup_code: string }[];
} {
  const errors: string[] = [];
  const results: { reg_number: string; full_name: string; grade: number; class_stream?: string; setup_code: string }[] = [];
  let importedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;

    if (!r.reg_number || !r.full_name || !r.grade) {
      errors.push(`Row ${rowNum}: Missing reg_number, full_name, or grade.`);
      continue;
    }

    const reg = r.reg_number.trim();
    const existing = profilesStore.find(
      (p) => p.school_id === schoolId && p.reg_number.toUpperCase() === reg.toUpperCase()
    );

    if (existing) {
      skippedCount++;
      continue;
    }

    const userId = `std_${crypto.randomUUID()}`;
    const setupCode = generateSetupCode();

    const profile: StudentProfile = {
      id: userId,
      school_id: schoolId,
      full_name: r.full_name.trim(),
      reg_number: reg,
      grade: Number(r.grade),
      class_stream: r.class_stream?.trim() || "A",
      language: "en",
    };

    profilesStore.push(profile);
    studentCredentialsStore.push({
      userId,
      schoolId,
      setupCodeHash: hashString(setupCode),
      setupUsed: false,
      failedAttempts: 0,
    });

    results.push({
      reg_number: profile.reg_number,
      full_name: profile.full_name,
      grade: profile.grade,
      class_stream: profile.class_stream,
      setup_code: setupCode,
    });

    importedCount++;
  }

  return { importedCount, skippedCount, errors, results };
}

// ONB-1 to ONB-3: School Registration & Approval
export function submitSchoolApplication(data: SchoolApplication): { ok: boolean; application: SchoolApplication } {
  const app: SchoolApplication = {
    ...data,
    id: crypto.randomUUID(),
    status: "pending",
    created_at: new Date().toISOString(),
  };
  applicationsStore.push(app);
  return { ok: true, application: app };
}

export function approveSchoolApplication(applicationId: string): { ok: boolean; school?: School; error?: string } {
  const app = applicationsStore.find((a) => a.id === applicationId);
  if (!app) {
    return { ok: false, error: "Application not found." };
  }

  app.status = "approved";
  const schoolCode = generateSchoolCode(app.school_name);
  const school: School = {
    id: crypto.randomUUID(),
    name: app.school_name,
    county: app.county,
    school_code: schoolCode,
    status: "sandbox", // ONB-3 default
    created_at: new Date().toISOString(),
  };

  schoolsStore.push(school);
  return { ok: true, school };
}
