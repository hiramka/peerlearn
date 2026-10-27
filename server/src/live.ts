// Live Service: Real-time Session Events & Multi-Client Sync (LIVE-1 to LIVE-3)
import type { Response } from "express";
import type { SessionEvent, SessionEventType } from "../../shared/types";

// In-memory event log
export const sessionEventsStore: SessionEvent[] = [];

// SSE client subscribers by schoolId
const sseSubscribers: Map<string, Set<Response>> = new Map();

const VALID_EVENT_TYPES: Set<SessionEventType> = new Set([
  "started",
  "pre_quiz_done",
  "step_checked",
  "post_quiz_done",
  "ended",
]);

/**
 * LIVE-1: Broadcast and record a session event.
 * Dispatches to all active SSE subscribers for that school in real time.
 */
export function broadcastSessionEvent(event: SessionEvent): { ok: boolean; event: SessionEvent; deliveredTo: number } {
  if (!VALID_EVENT_TYPES.has(event.type)) {
    throw new Error(`Invalid event type: ${event.type}. Must be one of: ${Array.from(VALID_EVENT_TYPES).join(", ")}`);
  }

  const enrichedEvent: SessionEvent = {
    id: event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    school_id: event.school_id,
    session_id: event.session_id,
    type: event.type,
    payload: event.payload || {},
    created_at: event.created_at || new Date().toISOString(),
    is_demo: !!event.is_demo,
  };

  // Prevent duplicate insertion if client_id/id already recorded
  const exists = sessionEventsStore.some((e) => e.id === enrichedEvent.id);
  if (!exists) {
    sessionEventsStore.push(enrichedEvent);
  }

  // Push to connected SSE clients for this school (LIVE-2)
  let delivered = 0;
  const subscribers = sseSubscribers.get(event.school_id);
  if (subscribers && subscribers.size > 0) {
    const payloadStr = `data: ${JSON.stringify(enrichedEvent)}\n\n`;
    for (const client of subscribers) {
      try {
        client.write(payloadStr);
        delivered++;
      } catch {
        subscribers.delete(client);
      }
    }
  }

  return { ok: true, event: enrichedEvent, deliveredTo: delivered };
}

/**
 * LIVE-2: Register an SSE connection for a school.
 */
export function registerSSEClient(schoolId: string, res: Response) {
  if (!sseSubscribers.has(schoolId)) {
    sseSubscribers.set(schoolId, new Set());
  }

  const clientSet = sseSubscribers.get(schoolId)!;
  clientSet.add(res);

  // Send initial keep-alive / connection message
  res.write(`data: ${JSON.stringify({ type: "connected", school_id: schoolId, time: new Date().toISOString() })}\n\n`);

  res.on("close", () => {
    clientSet.delete(res);
  });
}

/**
 * LIVE-3: Batch upload offline events upon reconnection.
 */
export function batchUploadEvents(events: SessionEvent[]): { ok: boolean; processed: number; newEvents: number } {
  let count = 0;
  for (const ev of events) {
    try {
      const { deliveredTo } = broadcastSessionEvent(ev);
      count++;
    } catch {
      /* ignore invalid */
    }
  }
  return { ok: true, processed: events.length, newEvents: count };
}

/**
 * Get recent session events for a school and optional session
 */
export function getSessionEvents(schoolId: string, sessionId?: string, limit: number = 50): SessionEvent[] {
  return sessionEventsStore
    .filter((e) => e.school_id === schoolId && (!sessionId || e.session_id === sessionId))
    .slice(-limit);
}
