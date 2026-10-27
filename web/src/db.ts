import { openDB } from "idb";
import type { AuthSession, Lesson, SessionResult, SessionEvent, Topic } from "../../shared/types";

// Offline layer: lessons + topics cached locally, results and events queued in an outbox.
const dbp = openDB("peerlearn", 2, {
  upgrade(d, oldVersion) {
    if (oldVersion < 1) {
      d.createObjectStore("lessons", { keyPath: "topicId" });
      d.createObjectStore("outbox", { keyPath: "client_id" });
      d.createObjectStore("meta");
    }
    if (oldVersion < 2) {
      if (!d.objectStoreNames.contains("events_outbox")) {
        d.createObjectStore("events_outbox", { keyPath: "id" });
      }
    }
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
export async function queueSession(s: Omit<SessionResult, "client_id" | "at"> & { client_id?: string; at?: string }) {
  const client_id = s.client_id || crypto.randomUUID();
  const item: SessionResult = { client_id, at: s.at || new Date().toISOString(), ...s };
  await (await dbp).put("outbox", item);
  const res = await syncOutbox();
  return { ...res, client_id };
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

// ============================================================================
// Phase 5: LIVE Event Outbox & Synchronization (LIVE-3)
// ============================================================================

export async function queueEvent(e: SessionEvent): Promise<{ synced: number; remaining: number }> {
  const evId = e.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: SessionEvent = { ...e, id: evId, created_at: e.created_at || new Date().toISOString() };
  try {
    const db = await dbp;
    await db.put("events_outbox", item);
  } catch {
    /* fallback */
  }
  return await syncEventsOutbox();
}

export async function syncEventsOutbox(): Promise<{ synced: number; remaining: number }> {
  if (!navigator.onLine) {
    try {
      const db = await dbp;
      const remaining = await db.count("events_outbox");
      return { synced: 0, remaining };
    } catch {
      return { synced: 0, remaining: 0 };
    }
  }

  try {
    const db = await dbp;
    const items: SessionEvent[] = await db.getAll("events_outbox");
    if (items.length === 0) return { synced: 0, remaining: 0 };

    const res = await fetch("/api/events/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: items }),
    });

    if (res.ok) {
      const tx = db.transaction("events_outbox", "readwrite");
      for (const item of items) {
        if (item.id) await tx.store.delete(item.id);
      }
      await tx.done;
      return { synced: items.length, remaining: 0 };
    }
    const remaining = await db.count("events_outbox");
    return { synced: 0, remaining };
  } catch {
    return { synced: 0, remaining: 0 };
  }
}

export const pendingEventsCount = async (): Promise<number> => {
  try {
    return await (await dbp).count("events_outbox");
  } catch {
    return 0;
  }
};

