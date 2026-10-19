export const languages = [
  { value: "en", label: "English" },
  { value: "zhHant", label: "繁體中文" },
  { value: "zhHans", label: "简体中文" },
] as const;
export type UiLanguage = (typeof languages)[number]["value"];
export function normalizeLanguage(value: string): UiLanguage {
  if (/^zh(?:[-_]?Hans|[-_](?:CN|SG))/i.test(value)) return "zhHans";
  if (/^zh/i.test(value)) return "zhHant";
  return "en";
}
