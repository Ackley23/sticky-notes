import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export const LANGUAGES = [
  { value: "en", labelKey: "language.en" },
  { value: "zhHant", labelKey: "language.zhHant" },
  { value: "zhHans", labelKey: "language.zhHans" },
] as const;

export type LanguageValue = (typeof LANGUAGES)[number]["value"];

/** 共用的語言切換邏輯：更新 i18n、同步 tray、廣播跨視窗事件 */
async function applyLanguage(
  i18n: ReturnType<typeof useTranslation>["i18n"],
  t: ReturnType<typeof useTranslation>["t"],
  newLang: string
) {
  await i18n.changeLanguage(newLang);
  try {
    await invoke("update_tray_menu", {
      showText: t("tray.show", { lng: newLang }),
      quitText: t("tray.quit", { lng: newLang }),
    });
  } catch (error) {
    console.error("Failed to update tray menu:", error);
  }
  await emit("language-changed", { language: newLang });
}

/** 標題列用：圖示按鈕，循環切換語言 */
export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const handleToggle = async () => {
    const values = LANGUAGES.map((l) => l.value);
    const current = i18n.language === "zh" ? "zhHant" : i18n.language;
    const next = values[(values.indexOf(current as LanguageValue) + 1) % values.length];
    await applyLanguage(i18n, t, next);
  };

  return (
    <button
      onClick={handleToggle}
      className="title-bar-btn mr-1"
      aria-label={t("language.toggle")}
      title={t("language.toggle")}
      tabIndex={-1}
    >
      <Languages className="h-4 w-4" />
    </button>
  );
}

/** 設定頁用：下拉選單，明確選擇語言 */
export function LanguageSelect() {
  const { i18n, t } = useTranslation();

  const currentValue = i18n.language === "zh" ? "zhHant" : i18n.language;

  return (
    <select
      value={currentValue}
      onChange={async (e) => {
        await applyLanguage(i18n, t, e.target.value);
      }}
      className="border-input bg-background text-foreground focus:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-sm focus:ring-1 focus:outline-none"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {t(lang.labelKey)}
        </option>
      ))}
    </select>
  );
}
