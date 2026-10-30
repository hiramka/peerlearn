import type { USSDRequest, USSDResponse, SMSMessageLog } from "../../shared/types";
import { logAudit } from "./safeguarding";

export const smsLogsStore: SMSMessageLog[] = [
  {
    id: "sms-seed-1",
    to: "+254712345678",
    message: "PeerLearn: Kikao chako cha Hisabati na Wanjiru kimepangwa kesho saa 16:00 Maktabani. Kumbuka kuja na daftari lako.",
    status: "delivered",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "sms-seed-2",
    to: "+254798765432",
    message: "PeerLearn: Mwanafunzi Amani amekamilisha somo la Linear Equations kwa ongezeko la +40%! Hongera sana.",
    status: "delivered",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
];

/**
 * Africa's Talking USSD Webhook Handler
 * Standard Kenyan USSD protocol (*384*500#)
 */
export function processUSSDRequest(req: USSDRequest): USSDResponse {
  const text = (req.text || "").trim();
  const parts = text ? text.split("*") : [];

  // Level 0: Main Menu
  if (parts.length === 0 || text === "") {
    return {
      continueSession: true,
      message:
        "CON PeerLearn Kenya (*384*500#)\n" +
        "1. Leo: Ratiba ya Masomo (Today's Sessions)\n" +
        "2. Matokeo na Maendeleo (My Scores & Gains)\n" +
        "3. Omba Msaada wa Somo (Request Tutor Help)\n" +
        "4. PIN Status & Msaada wa Usalama",
    };
  }

  const choice = parts[0];

  // Option 1: Today's scheduled sessions
  if (choice === "1") {
    return {
      continueSession: false,
      message:
        "END Ratiba ya Leo (Alliance High):\n" +
        "• 16:00: Math (Solving linear equations) na Wanjiru katika Room 3B.\n" +
        "Fika dakika 5 kabla ya muda. Hakuna mtandao unaohitajika!",
    };
  }

  // Option 2: Scores & Gain
  if (choice === "2") {
    return {
      continueSession: false,
      message:
        "END Matokeo Yako ya Hivi Karibuni:\n" +
        "• Linear Equations: 90% (Ongezeko: +40%)\n" +
        "• States of Matter: 85% (Ongezeko: +35%)\n" +
        "Kazi nzuri sana! Endelea kujifunza.",
    };
  }

  // Option 3: Request Tutor Help
  if (choice === "3") {
    if (parts.length === 1) {
      return {
        continueSession: true,
        message:
          "CON Chagua Somo Unalohitaji Msaada:\n" +
          "1. Hisabati (Form 1-4)\n" +
          "2. Fizikia (Physics)\n" +
          "3. Kemia (Chemistry)\n" +
          "4. Biolojia (Biology)",
      };
    }

    const subChoice = parts[1];
    const subjectMap: Record<string, string> = {
      "1": "Hisabati (Mathematics)",
      "2": "Fizikia (Physics)",
      "3": "Kemia (Chemistry)",
      "4": "Biolojia (Biology)",
    };
    const subjectName = subjectMap[subChoice] || "Somo la Chaguo";

    logAudit("s1", "ussd-user", "USSD_TUTOR_REQUEST_SUBMITTED", {
      phone: req.phoneNumber,
      subject: subjectName,
    });

    return {
      continueSession: false,
      message: `END Ombi lako la somo la ${subjectName} limepokelewa. Mwalimu wa darasa atakupangia mfunzaji wa rika kabla ya prep ya jioni.`,
    };
  }

  // Option 4: PIN Status & Security Help
  if (choice === "4") {
    return {
      continueSession: false,
      message:
        "END Hali ya Akaunti: Salama & Inafanya Kazi.\n" +
        "Kama umefungiwa kwa PIN isiyo sahihi, muone Mwalimu ili akupe Kadi Mpya ya Kuanzisha (Setup Slip).",
    };
  }

  // Fallback
  return {
    continueSession: false,
    message: "END Chaguo si sahihi. Tafadhali piga tena *384*500# ili kujaribu.",
  };
}

/**
 * Africa's Talking Outbound SMS Dispatcher & Simulator
 */
export function sendSMS(to: string, message: string): SMSMessageLog {
  if (!to || !message) {
    throw new Error("Phone number and message are required.");
  }

  const logEntry: SMSMessageLog = {
    id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    to,
    message,
    status: "delivered",
    timestamp: new Date().toISOString(),
  };

  smsLogsStore.unshift(logEntry);

  logAudit("s1", "sms-service", "SMS_DISPATCHED", {
    to,
    preview: message.substring(0, 40),
  });

  return logEntry;
}

export function getSMSLogs(): SMSMessageLog[] {
  return smsLogsStore;
}

export function resetTelecomData(): void {
  smsLogsStore.length = 0;
  smsLogsStore.push(
    {
      id: "sms-seed-1",
      to: "+254712345678",
      message: "PeerLearn: Kikao chako cha Hisabati na Wanjiru kimepangwa kesho saa 16:00 Maktabani.",
      status: "delivered",
      timestamp: new Date().toISOString(),
    }
  );
}
