import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import zh from "../locales/zh.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import pt from "../locales/pt.json";
import ja from "../locales/ja.json";
import it from "../locales/it.json";
import ko from "../locales/ko.json";
import ru from "../locales/ru.json";
import ar from "../locales/ar.json";
import hi from "../locales/hi.json";

export const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "中文" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
] as const;

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ja: { translation: ja },
  it: { translation: it },
  ko: { translation: ko },
  ru: { translation: ru },
  ar: { translation: ar },
  hi: { translation: hi },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: languages.map((language) => language.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
