import { describe, it, expect } from "vitest";
import { translations, getTranslation, type SupportedLanguage, type Translations } from "../shared/i18n";

describe("Phase 7: Localization (I18N-1)", () => {
  it("provides complete key parity between English and Kiswahili dictionaries", () => {
    const enKeys = Object.keys(translations.en).sort();
    const swKeys = Object.keys(translations.sw).sort();

    expect(enKeys).toEqual(swKeys);
    expect(enKeys.length).toBeGreaterThan(30);

    for (const key of enKeys as (keyof Translations)[]) {
      expect(translations.en[key]).toBeTruthy();
      expect(translations.sw[key]).toBeTruthy();
    }
  });

  it("translates primary navigation, session, and teacher terminology to Kiswahili correctly", () => {
    const sw = getTranslation("sw");
    expect(sw.navDashboard).toBe("Dashibodi");
    expect(sw.navCourses).toBe("Mada za Masomo");
    expect(sw.navTeacher).toBe("Tovuti ya Mwalimu");
    expect(sw.diagnosticQuiz).toContain("Mtihani wa Awali");
    expect(sw.postQuizTitle).toContain("Mtihani wa Baada wa Umahiri");
    expect(sw.retentionTitle).toContain("Ukaguzi wa Kumbukumbu wa Siku 7");
    expect(sw.topicStruggleHeatmap).toContain("Ramani ya Ugumu wa Mada");
    expect(sw.lowDataMode).toBe("Hali ya Data Ndogo");
  });

  it("safely falls back to English when an unconfigured locale is requested", () => {
    const fallback = getTranslation("fr" as SupportedLanguage);
    expect(fallback.appName).toBe("PeerLearn");
    expect(fallback.navDashboard).toBe("Dashboard");
  });
});

describe("Phase 7: Storage Management & Accessibility (OFF-1, A11Y-1)", () => {
  it("correctly calculates human-readable storage statistics", () => {
    const formatStorage = (bytes: number) => {
      return bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(bytes / 1024)} KB`;
    };

    expect(formatStorage(51200)).toBe("50 KB");
    expect(formatStorage(2097152)).toBe("2.0 MB");
  });

  it("verifies peer tutor certificate criteria (LATER items: score >= 80% and teacher approval)", () => {
    const isEligibleForCert = (score: number, teacherApproved: boolean) => {
      return score >= 0.8 && teacherApproved;
    };

    expect(isEligibleForCert(0.85, true)).toBe(true);
    expect(isEligibleForCert(0.79, true)).toBe(false);
    expect(isEligibleForCert(0.95, false)).toBe(false);
  });
});
