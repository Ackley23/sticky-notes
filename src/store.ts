import { tr } from "./i18n";
import { invoke, isTauri } from "@tauri-apps/api/core";
export const desktop = isTauri();
export const colors = [
  {
    get name() {
      return tr("暖陽黃");
    },
    value: "#F8E9A1",
    dark: "#51492A",
  },
  {
    get name() {
      return tr("鼠尾草");
    },
    value: "#DCE9CC",
    dark: "#354632",
  },
  {
    get name() {
      return tr("霧藍");
    },
    value: "#D7E8F6",
    dark: "#2D4053",
  },
  {
    get name() {
      return tr("薰衣草");
    },
    value: "#E8DFF5",
    dark: "#453852",
  },
  {
    get name() {
      return tr("蜜桃");
    },
    value: "#F9DFD1",
    dark: "#563C33",
  },
  {
    get name() {
      return tr("玫瑰");
    },
    value: "#F4DCE4",
    dark: "#543541",
  },
  {
    get name() {
      return tr("薄荷");
    },
    value: "#D5EDE6",
    dark: "#2C4943",
  },
  {
    get name() {
      return tr("石灰");
    },
    value: "#E9E9E5",
    dark: "#3D4148",
  },
];
export interface Note {
  id: string;
  title: string;
  html: string;
  tags: string[];
  color: number;
  pinned: boolean;
  archived: boolean;
  deleted: number | null;
  created: number;
  updated: number;
  reminder: string;
  fired: boolean;
  pinHash: string;
  salt: string;
  fontSize: number;
}
export function createNote(): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "",
    html: "",
    tags: [],
    color: 0,
    pinned: false,
    archived: false,
    deleted: null,
    created: now,
    updated: now,
    reminder: "",
    fired: false,
    pinHash: "",
    salt: "",
    fontSize: 16,
  };
}
export function plain(html: string) {
  const d = new DOMParser().parseFromString(html, "text/html");
  return d.body.textContent || "";
}
export function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set([
    "P",
    "BR",
    "DIV",
    "SPAN",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "S",
    "STRIKE",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "IMG",
    "INPUT",
    "A",
    "FONT",
  ]);
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (!allowed.has(el.tagName)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (
        ![
          "style",
          "src",
          "href",
          "type",
          "checked",
          "color",
          "size",
          "class",
          "data-highlight",
          "alt",
        ].includes(attr.name)
      )
        el.removeAttribute(attr.name);
    }
    if (el.hasAttribute("class")) {
      el.setAttribute(
        "class",
        Array.from(el.classList)
          .filter((c) => /^highlight-(yellow|green|blue|pink)$/.test(c))
          .join(" ")
      );
    }
    const src = el.getAttribute("src");
    if (src && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)) el.removeAttribute("src");
    const href = el.getAttribute("href");
    if (href && !/^(https?:|mailto:|tel:)/i.test(href)) el.removeAttribute("href");
    if (el instanceof HTMLInputElement) {
      el.type = "checkbox";
    }
    const style = el.getAttribute("style");
    if (style) {
      el.removeAttribute("style");
      for (const rule of style.split(";")) {
        const [key, ...rest] = rule.split(":");
        const val = rest.join(":");
        if (
          [
            "color",
            "background-color",
            "font-size",
            "text-align",
            "width",
            "text-decoration",
            "font-weight",
            "font-style",
          ].includes(key.trim()) &&
          !/url|expression|var\(/i.test(val)
        )
          (el as HTMLElement).style.setProperty(key.trim(), val);
      }
    }
  }
  return doc.body.innerHTML;
}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("sticky-notes", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("notes", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function browserStore<T>(
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("notes", mode);
    const req = action(tx.objectStore("notes"));
    tx.oncomplete = () => {
      resolve(req.result as T);
      d.close();
    };
    tx.onerror = () => {
      reject(tx.error);
      d.close();
    };
  });
}
export async function loadNotes(): Promise<Note[]> {
  const notes = desktop
    ? await invoke<Note[]>("load_notes")
    : await browserStore<Note[]>("readonly", (s) => s.getAll());
  return notes
    .filter((n) => n && /^[a-f0-9-]{36}$/i.test(n.id) && typeof n.html === "string")
    .map((n) => ({
      ...createNote(),
      ...n,
      title: typeof n.title === "string" ? n.title : "",
      tags: Array.isArray(n.tags) ? n.tags.filter((t) => typeof t === "string") : [],
      color: Math.max(0, Math.min(7, Math.floor(Number(n.color) || 0))),
      fontSize: Math.max(12, Math.min(36, Number(n.fontSize) || 16)),
    }));
}
export async function saveNote(note: Note) {
  if (desktop) await invoke("save_note", { note });
  else await browserStore("readwrite", (s) => s.put(note));
  window.dispatchEvent(new Event("notes-changed"));
}
export async function removeNote(id: string) {
  if (desktop) await invoke("remove_note", { id });
  else await browserStore("readwrite", (s) => s.delete(id));
}
export async function hashPin(pin: string, salt: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}`));
  return Array.from(new Uint8Array(bytes))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function markdown(n: Note) {
  const d = new DOMParser().parseFromString(sanitize(n.html), "text/html");
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    const el = node as HTMLElement;
    const body = Array.from(node.childNodes).map(walk).join("");
    switch (el.tagName) {
      case "BR":
        return "\n";
      case "B":
      case "STRONG":
        return `**${body}**`;
      case "I":
      case "EM":
        return `*${body}*`;
      case "S":
      case "STRIKE":
        return `~~${body}~~`;
      case "A":
        return `[${body}](${el.getAttribute("href") || ""})`;
      case "IMG":
        return tr("\n![圖片]({{p0}})\n", { p0: el.getAttribute("src") || "" });
      case "INPUT":
        return el.hasAttribute("checked") ? "- [x] " : "- [ ] ";
      case "LI":
        return `${el.parentElement?.tagName === "OL" ? `${Array.from(el.parentElement.children).indexOf(el) + 1}.` : "-"} ${body.trim()}\n`;
      case "DIV":
      case "P":
      case "UL":
      case "OL":
        return `${body}\n`;
      default:
        return body;
    }
  }
  return `# ${n.title || tr("未命名便箋")}\n\n${walk(d.body).trim()}\n\n${n.tags.map((t) => "#" + t).join(" ")}`;
}
export function textColor(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const light = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (light + 0.05) / 0.05 >= 1.05 / (light + 0.05) ? "#000000" : "#ffffff";
}
export async function openNote(n: Note) {
  if (!desktop) return false;
  await invoke("open_note", { id: n.id, pinned: n.pinned });
  return true;
}
