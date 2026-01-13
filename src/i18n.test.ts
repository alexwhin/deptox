import { describe, it, expect } from "vitest";
import { languages } from "./i18n";

describe("i18n", () => {
  describe("languages", () => {
    it("contains expected language entries", () => {
      expect(languages.length).toBeGreaterThan(0);
    });

    it("has English as the first language", () => {
      expect(languages[0].code).toBe("en");
      expect(languages[0].name).toBe("English");
      expect(languages[0].nativeName).toBe("English");
    });

    it("each language has required properties", () => {
      for (const language of languages) {
        expect(language).toHaveProperty("code");
        expect(language).toHaveProperty("name");
        expect(language).toHaveProperty("nativeName");
        expect(typeof language.code).toBe("string");
        expect(typeof language.name).toBe("string");
        expect(typeof language.nativeName).toBe("string");
        expect(language.code.length).toBeGreaterThan(0);
        expect(language.name.length).toBeGreaterThan(0);
        expect(language.nativeName.length).toBeGreaterThan(0);
      }
    });

    it("has unique language codes", () => {
      const codes = languages.map((language) => language.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("includes common languages", () => {
      const codes = languages.map((language) => language.code);
      expect(codes).toContain("en");
      expect(codes).toContain("es");
      expect(codes).toContain("fr");
      expect(codes).toContain("de");
      expect(codes).toContain("zh");
      expect(codes).toContain("ja");
    });

    it("has correct native names for languages", () => {
      const languageMap = new Map(languages.map((language) => [language.code, language]));

      expect(languageMap.get("zh")?.nativeName).toBe("中文");
      expect(languageMap.get("es")?.nativeName).toBe("Español");
      expect(languageMap.get("fr")?.nativeName).toBe("Français");
      expect(languageMap.get("de")?.nativeName).toBe("Deutsch");
      expect(languageMap.get("ja")?.nativeName).toBe("日本語");
      expect(languageMap.get("ko")?.nativeName).toBe("한국어");
      expect(languageMap.get("ru")?.nativeName).toBe("Русский");
      expect(languageMap.get("ar")?.nativeName).toBe("العربية");
    });
  });
});
