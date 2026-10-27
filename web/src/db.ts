import { openDB } from "idb";
import type { AuthSession, Lesson, SessionResult, Topic } from "../../shared/types";

// Offline layer: lessons + topics cached locally, results queued in an outbox.
const dbp = openDB("peerlearn", 1, {
  upgrade(d) {
    d.createObjectStore("lessons", { keyPath: "topicId" });
    d.createObjectStore("outbox", { keyPath: "client_id" });
    d.createObjectStore("meta");
  },
});

export const saveLesson = async (l: Lesson) => (await dbp).put("lessons", l);

export const saveAllLessons = async (lessons: Lesson[]) => {
  const db = await dbp;
  const tx = db.transaction("lessons", "readwrite");
  for (const l of lessons) {
    await tx.store.put(l);
  }
  await tx.done;
};

export const getLesson = async (id: number): Promise<Lesson | undefined> => (await dbp).get("lessons", id);
export const offlineIds = async (): Promise<number[]> => (await dbp).getAllKeys("lessons") as Promise<number[]>;
export const cacheTopics = async (t: Topic[]) => (await dbp).put("meta", t, "topics");
export const cachedTopics = async (): Promise<Topic[]> => (await (await dbp).get("meta", "topics")) ?? [];
export const pendingCount = async () => (await dbp).count("outbox");

export const cacheTeacherSummary = async (s: any) => (await dbp).put("meta", s, "teacher_summary");
export const cachedTeacherSummary = async (): Promise<any[]> => (await (await dbp).get("meta", "teacher_summary")) ?? [];

export const setLastSyncTime = async (iso: string) => (await dbp).put("meta", iso, "last_sync_time");
export const getLastSyncTime = async (): Promise<string | null> => (await (await dbp).get("meta", "last_sync_time")) ?? null;

/** Write locally first, then try to sync. Safe to call offline. */
export async function queueSession(s: Omit<SessionResult, "client_id" | "at">) {
  const item: SessionResult = { ...s, client_id: crypto.randomUUID(), at: new Date().toISOString() };
  await (await dbp).put("outbox", item);
  return await syncOutbox();
}

export async function syncOutbox(): Promise<{ syncedCount: number; remainingCount: number; timestamp: string }> {
  let synced = 0;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (!navigator.onLine) {
    const db = await dbp;
    const remaining = await db.count("outbox");
    return { syncedCount: 0, remainingCount: remaining, timestamp: now };
  }

  const db = await dbp;
  const items = await db.getAll("outbox");
  for (const item of items) {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await db.delete("outbox", item.client_id);
        synced++;
      }
    } catch {
      /* stay in outbox; retry on next event */
    }
  }

  const remaining = await db.count("outbox");
  await setLastSyncTime(now);
  return { syncedCount: synced, remainingCount: remaining, timestamp: now };
}

// Session offline caching (AUTH-8)
export const saveAuthSession = async (s: AuthSession) => {
  localStorage.setItem("peerlearn_auth_session", JSON.stringify(s));
  const db = await dbp;
  await db.put("meta", s, "current_auth_session");
};

export const getAuthSession = async (): Promise<AuthSession | null> => {
  try {
    const db = await dbp;
    const session = await db.get("meta", "current_auth_session");
    if (session) return session;
  } catch {
    /* fallback to localStorage */
  }
  const raw = localStorage.getItem("peerlearn_auth_session");
  return raw ? JSON.parse(raw) : null;
};

export const clearAuthSession = async () => {
  localStorage.removeItem("peerlearn_auth_session");
  const db = await dbp;
  await db.delete("meta", "current_auth_session");
};

