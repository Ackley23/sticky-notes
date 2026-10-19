import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
import i18next from "i18next";
const languageModule = ts.transpileModule(fs.readFileSync("src/i18n/language.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { normalizeLanguage } = await import(
  "data:text/javascript;base64," + Buffer.from(languageModule).toString("base64")
);
const locales = ["en", "zhHant", "zhHans"];
const catalogs = Object.fromEntries(
  locales.map((l) => [l, JSON.parse(fs.readFileSync(`src/i18n/locales/sticky-${l}.json`, "utf8"))])
);
const keys = Object.keys(catalogs.zhHant).sort();
const variables = (text) => [...text.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]).sort();
for (const language of locales) {
  assert.deepEqual(
    Object.keys(catalogs[language]).sort(),
    keys,
    `${language}: mismatched translation keys`
  );
  for (const key of keys) {
    assert.ok(catalogs[language][key].trim(), `${language}: empty translation ${key}`);
    assert.deepEqual(
      variables(catalogs[language][key]),
      variables(key),
      `${language}: interpolation mismatch for ${key}`
    );
  }
}
for (const [input, expected] of [
  ["en-US", "en"],
  ["en-GB", "en"],
  ["zh", "zhHant"],
  ["zh-TW", "zhHant"],
  ["zh-HK", "zhHant"],
  ["zh-MO", "zhHant"],
  ["zh-Hant", "zhHant"],
  ["zhHant", "zhHant"],
  ["zh-CN", "zhHans"],
  ["zh-SG", "zhHans"],
  ["zh-Hans-CN", "zhHans"],
  ["zhHans", "zhHans"],
  ["ja-JP", "en"],
])
  assert.equal(normalizeLanguage(input), expected);
const used = new Set();
for (const file of ["src/App.tsx", "src/store.ts", "src/i18n/index.ts"]) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "tr") {
      const key = node.arguments[0];
      if (ts.isStringLiteral(key)) {
        assert.ok(Object.hasOwn(catalogs.en, key.text), `${file}: missing key ${key.text}`);
        used.add(key.text);
      }
      node.arguments.slice(1).forEach((arg) => ts.forEachChild(arg, visit));
      return;
    }
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isJsxText(node)) &&
      /[\u3400-\u9fff]/.test(node.text)
    )
      throw new Error(`${file}: unlocalized string ${node.text}`);
    if (
      ts.isTemplateExpression(node) &&
      /[\u3400-\u9fff]/.test(
        node.head.text + node.templateSpans.map((s) => s.literal.text).join("")
      )
    )
      throw new Error(`${file}: unlocalized template`);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const language of locales) {
  const instance = i18next.createInstance();
  await instance.init({
    lng: language,
    fallbackLng: false,
    resources: { [language]: { translation: catalogs[language] } },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
  });
  assert.equal(
    instance.t("開啟{{p0}}", { p0: "User note" }),
    catalogs[language]["開啟{{p0}}"].replace("{{p0}}", "User note")
  );
  assert.equal(
    instance.t("閱讀模式"),
    { en: "View mode", zhHant: "閱讀模式", zhHans: "阅读模式" }[language]
  );
}
console.log(
  `Localization checks passed: ${locales.length} languages, ${keys.length} matching keys, ${used.size} statically used keys, regional language mappings and interpolation.`
);
