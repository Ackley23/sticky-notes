import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import en from "./locales/en.json";
import zhHant from "./locales/zh-hant.json";
import zhHans from "./locales/zh-hans.json";
import stickyEn from "./locales/sticky-en.json";
import stickyHant from "./locales/sticky-zhHant.json";
import stickyHans from "./locales/sticky-zhHans.json";
import { normalizeLanguage } from "./language";
export { languages, normalizeLanguage } from "./language";
export type { UiLanguage } from "./language";
export function dateLocale() {
  return ({ en: "en-US", zhHant: "zh-TW", zhHans: "zh-CN" } as const)[
    normalizeLanguage(i18n.resolvedLanguage || i18n.language || "en")
  ];
}
export function tr(key: string, values?: Record<string, unknown>): string {
  return String(i18n.t(key, { ns: "sticky", keySeparator: false, nsSeparator: false, ...values }));
}
function updateLanguageChrome() {
  document.documentElement.lang = dateLocale();
  const name = tr("自黏便箋");
  document.title = name === "Sticky Notes" ? name : `Sticky Notes · ${name}`;
  if (isTauri() && !new URLSearchParams(location.search).has("note")) {
    void invoke("update_tray_menu", {
      showText: i18n.t("tray.show"),
      quitText: i18n.t("tray.quit"),
    }).catch((error) => console.error("Unable to translate tray menu", error));
  }
}
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, sticky: stickyEn },
      zhHant: { translation: zhHant, sticky: stickyHant },
      zhHans: { translation: zhHans, sticky: stickyHans },
    },
    supportedLngs: ["en", "zhHant", "zhHans"],
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      convertDetectedLanguage: normalizeLanguage,
    },
  });
i18n.on("languageChanged", updateLanguageChrome);
updateLanguageChrome();
window.addEventListener("storage", (event) => {
  if (event.key === "i18nextLng" && event.newValue) {
    const next = normalizeLanguage(event.newValue);
    if (next !== i18n.language) void i18n.changeLanguage(next);
  }
});
if (isTauri())
  void listen<{ language: string }>("language-changed", (event) => {
    const next = normalizeLanguage(event.payload.language);
    if (next !== i18n.language) void i18n.changeLanguage(next);
  });
export async function changeUiLanguage(language: string) {
  const next = normalizeLanguage(language);
  await i18n.changeLanguage(next);
  if (isTauri()) await emit("language-changed", { language: next });
}
export default i18n;
