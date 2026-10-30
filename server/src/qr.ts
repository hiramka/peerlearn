import type { QRTransferPayload, SessionResult, Lesson } from "../../shared/types";
import { sessions, lessons } from "./data";
import { logAudit } from "./safeguarding";

function computeChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function generateQRPayload(type: "session_result" | "lesson_pack", data: any): {
  rawString: string;
  payload: QRTransferPayload;
} {
  const dataString = JSON.stringify(data);
  const checksum = computeChecksum(dataString);

  const payload: QRTransferPayload = {
    version: 1,
    type,
    checksum,
    data,
    createdAt: new Date().toISOString(),
  };

  const rawString = `PEERLEARN_QR:1:${JSON.stringify(payload)}`;
  return { rawString, payload };
}

export function parseAndIngestQRPayload(rawString: string): {
  ok: boolean;
  type?: "session_result" | "lesson_pack";
  importedRecord?: any;
  message: string;
} {
  if (!rawString || !rawString.startsWith("PEERLEARN_QR:1:")) {
    throw new Error("Invalid QR code format. Not a recognized PeerLearn transfer payload.");
  }

  const jsonStr = rawString.replace("PEERLEARN_QR:1:", "");
  let payload: QRTransferPayload;

  try {
    payload = JSON.parse(jsonStr);
  } catch (err: any) {
    throw new Error(`Failed to parse QR payload: ${err.message}`);
  }

  // Validate checksum
  const expectedChecksum = computeChecksum(JSON.stringify(payload.data));
  if (payload.checksum !== expectedChecksum) {
    throw new Error("Tamper detection: QR payload checksum mismatch. Transfer rejected.");
  }

  if (payload.type === "session_result") {
    const session = payload.data as SessionResult;
    if (!session.client_id || typeof session.pre !== "number" || typeof session.post !== "number") {
      throw new Error("Malformed session result inside QR transfer.");
    }

    // Idempotent upsert
    const existing = sessions.find((s) => s.client_id === session.client_id);
    if (!existing) {
      sessions.push(session);
      logAudit("s1", session.tutorId || "qr-sync", "OFFLINE_QR_SESSION_INGESTED", {
        client_id: session.client_id,
        learnerId: session.learnerId,
        gain: session.post - session.pre,
      });
    }

    return {
      ok: true,
      type: "session_result",
      importedRecord: session,
      message: existing
        ? `Session ${session.client_id} already exists in database.`
        : `Successfully imported offline session ${session.client_id} via QR transfer!`,
    };
  }

  if (payload.type === "lesson_pack") {
    const lesson = payload.data as Lesson;
    if (!lesson.topicId || !lesson.title) {
      throw new Error("Malformed lesson pack inside QR transfer.");
    }

    const existingIdx = lessons.findIndex((l) => l.topicId === lesson.topicId);
    if (existingIdx >= 0) {
      lessons[existingIdx] = lesson;
    } else {
      lessons.push(lesson);
    }

    logAudit("s1", "teacher", "OFFLINE_QR_LESSON_PACK_INGESTED", {
      topicId: lesson.topicId,
      version: lesson.version,
    });

    return {
      ok: true,
      type: "lesson_pack",
      importedRecord: lesson,
      message: `Lesson pack "${lesson.title}" (v${lesson.version}) imported successfully via QR!`,
    };
  }

  throw new Error(`Unsupported QR payload type: ${(payload as any).type}`);
}
