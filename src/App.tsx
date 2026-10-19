import { tr, dateLocale, languages, changeUiLanguage } from "./i18n";
import { useTranslation } from "react-i18next";
import { type ReactNode, Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  Bell,
  Trash2,
  Archive,
  Settings,
  Cloud,
  ArrowUpRight,
  X,
  Check,
  LayoutGrid,
  List,
  Sun,
  Moon,
  Monitor,
  Download,
  LockKeyhole,
  ImagePlus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ListTodo,
  ListOrdered,
  List as ListIcon,
  Highlighter,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  Keyboard,
  ExternalLink,
  Pencil,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  colors,
  createNote,
  desktop,
  download,
  hashPin,
  loadNotes,
  markdown,
  openNote,
  plain,
  removeNote,
  sanitize,
  saveNote,
  textColor,
  type Note,
} from "./store";
type Filter = "all" | "pinned" | "reminder" | "archive" | "trash";
type Theme = "light" | "dark" | "system";
const detachedId = new URLSearchParams(location.search).get("note");
const date = (t: number) =>
  new Date(t).toLocaleDateString(dateLocale(), { month: "short", day: "numeric" });
function FilePicker({ children }: { children: ReactNode }) {
  return (
    <label className="file-picker">
      <span>{tr("選擇檔案")}</span>
      {children}
    </label>
  );
}
function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon size={17} />
    </button>
  );
}
function seed(): Note[] {
  return [
    {
      title: tr("留一點空間，給好點子。"),
      html: tr(
        "<p>不必急著整理所有思緒。</p><p>隨手寫下，讓靈感有個落腳的地方。 ✨</p><br><p><b>今天，也從一張小小的便箋開始。</b></p>"
      ),
      color: 0,
      tags: [tr("靈感")],
      pinned: true,
    },
    {
      title: tr("本週的小目標"),
      html: tr(
        '<div><input type="checkbox" checked> 整理工作桌面</div><div><input type="checkbox"> 讀完一本書的第三章</div><div><input type="checkbox"> 散步 30 分鐘</div><div><input type="checkbox"> 留時間給自己</div>'
      ),
      color: 1,
      tags: [tr("生活")],
      pinned: true,
    },
    {
      title: tr("讓工作更順手的快捷鍵"),
      html: tr(
        "<p><b>Ctrl + N</b>　新增便箋</p><p><b>Ctrl + B</b>　粗體文字</p><p><b>Ctrl + Shift + L</b>　項目清單</p><br><p>點擊右上角 ↗，把便箋放到桌面。</p>"
      ),
      color: 2,
      tags: [tr("工作")],
      pinned: false,
    },
    {
      title: tr("下一次旅行"),
      html: tr(
        "<p>想去台東看看海 🌊</p><br><p>找一間有陽台的民宿，帶上相機，走沒有安排好的路。</p><p>記得：不用把行程排得太滿。</p>"
      ),
      color: 3,
      tags: [tr("生活"), tr("靈感")],
      pinned: false,
    },
    {
      title: tr("設計會議筆記"),
      html: tr(
        "<p>好的工具，應該安靜地陪伴。</p><br><ul><li>減少打斷，保留專注</li><li>用顏色讓資訊自然分類</li><li>每一次輸入都值得被保存</li></ul>"
      ),
      color: 4,
      tags: [tr("工作")],
      pinned: false,
    },
    {
      title: tr("一些值得記住的小事"),
      html: tr(
        "<p>下午的陽光、剛煮好的咖啡，</p><p>還有突然想到的一個好點子。</p><br><p>把日常喜歡的片刻，慢慢收集起來。 ☕</p>"
      ),
      color: 5,
      tags: [tr("生活")],
      pinned: false,
    },
  ].map((n, i) => ({
    ...createNote(),
    ...n,
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    created: Date.now() - i * 3600000,
    updated: Date.now() - i * 3600000,
  }));
}
export default function App() {
  const { i18n } = useTranslation("sticky");
  const navs: {
    id: Filter;
    label: string;
    icon: LucideIcon;
  }[] = [
    { id: "all", label: tr("所有便箋"), icon: StickyNote },
    { id: "pinned", label: tr("已釘選"), icon: Pin },
    { id: "reminder", label: tr("提醒事項"), icon: Bell },
    { id: "archive", label: tr("封存便箋"), icon: Archive },
    { id: "trash", label: tr("垃圾桶"), icon: Trash2 },
  ];
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [colorFilter, setColorFilter] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(detachedId);
  const [list, setList] = useState(false);
  const [sort, setSort] = useState("updated");
  const [modal, setModal] = useState<"settings" | "cloud" | "shortcuts" | null>(null);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("sticky-theme") as Theme) || "system"
  );
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [alertNote, setAlertNote] = useState<Note | null>(null);
  const [sound, setSound] = useState(() => localStorage.getItem("sticky-sound") !== "false");
  const [framelessNotes, setFramelessNotes] = useState(
    () => localStorage.getItem("sticky-frameless-notes") === "true"
  );
  const [windowPreferenceReady, setWindowPreferenceReady] = useState(!desktop);
  const [windowPreferenceBusy, setWindowPreferenceBusy] = useState(false);
  const [startupEnabled, setStartupEnabled] = useState<boolean | null>(null);
  const [startupBusy, setStartupBusy] = useState(false);
  const [startupError, setStartupError] = useState("");
  useEffect(() => {
    if (!desktop || detachedId || modal !== "settings") return;
    let live = true;
    setStartupBusy(true);
    setStartupError("");
    void invoke<boolean | null>("get_startup_enabled")
      .then((enabled) => {
        if (live) setStartupEnabled(enabled);
      })
      .catch((error) => {
        if (live) setStartupError(String(error));
      })
      .finally(() => {
        if (live) setStartupBusy(false);
      });
    return () => {
      live = false;
    };
  }, [modal]);
  async function changeStartup(enabled: boolean) {
    setStartupBusy(true);
    setStartupError("");
    try {
      await invoke("set_startup_enabled", { enabled });
      setStartupEnabled(await invoke<boolean>("get_startup_enabled"));
    } catch (error) {
      setStartupError(String(error));
    } finally {
      setStartupBusy(false);
    }
  }
  useEffect(() => {
    if (!desktop) return;
    let live = true;
    void invoke<boolean>("get_note_window_frameless")
      .then((value) => {
        if (live) {
          setFramelessNotes(value);
          setWindowPreferenceReady(true);
        }
      })
      .catch((error) => {
        if (live) setToast(tr("無法讀取視窗偏好：{{p0}}", { p0: String(error) }));
      });
    return () => {
      live = false;
    };
  }, []);
  async function changeNoteTitlebar(frameless: boolean) {
    setWindowPreferenceBusy(true);
    try {
      if (desktop) await invoke("set_note_window_frameless", { frameless });
      else localStorage.setItem("sticky-frameless-notes", String(frameless));
      setFramelessNotes(frameless);
      setToast(
        desktop ? tr("已套用獨立便箋的標題列設定") : tr("已保存預覽偏好；視窗效果請使用桌面版檢視")
      );
    } catch (error) {
      setToast(tr("無法套用視窗偏好：{{p0}}", { p0: String(error) }));
    } finally {
      setWindowPreferenceBusy(false);
    }
  }
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  const searchRef = useRef<HTMLInputElement>(null);
  const report = useCallback(
    (e: unknown) =>
      setError(tr("儲存或讀取失敗：{{p0}}\u3002請保留視窗並重試\u3002", { p0: String(e) })),
    []
  );
  const refresh = useCallback(async () => {
    try {
      const all = await loadNotes();
      setNotes(all);
    } catch (e) {
      report(e);
    }
  }, [report]);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let all = await loadNotes();
        const expired = all.filter((n) => n.deleted && Date.now() - n.deleted > 30 * 86400000);
        for (const n of expired) await removeNote(n.id);
        all = all.filter((n) => !expired.includes(n));
        if (!all.length && !localStorage.getItem("sticky-initialized")) {
          all = seed();
          for (const n of all) await saveNote(n);
        }
        localStorage.setItem("sticky-initialized", "true");
        if (live) {
          setNotes(all);
          setReady(true);
        }
      } catch (e) {
        report(e);
      }
    })();
    return () => {
      live = false;
    };
  }, [report]);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(theme === "dark" || (theme === "system" && mq.matches));
    update();
    mq.addEventListener("change", update);
    localStorage.setItem("sticky-theme", theme);
    return () => mq.removeEventListener("change", update);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (
        event.key === "sticky-theme" &&
        ["light", "dark", "system"].includes(event.newValue || "")
      )
        setTheme(event.newValue as Theme);
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const cb = () => void refresh();
    window.addEventListener("focus", cb);
    let stop: (() => void) | undefined;
    let disposed = false;
    if (desktop)
      void listen("notes-updated", cb).then((fn) => {
        if (disposed) fn();
        else stop = fn;
      });
    const channel = new BroadcastChannel("sticky-notes");
    channel.onmessage = cb;
    return () => {
      disposed = true;
      stop?.();
      channel.close();
      window.removeEventListener("focus", cb);
    };
  }, [refresh]);
  const update = useCallback(
    async (n: Note) => {
      const changed = { ...n, updated: Date.now() };
      setNotes((old) =>
        old.some((x) => x.id === n.id)
          ? old.map((x) => (x.id === n.id ? changed : x))
          : [changed, ...old]
      );
      try {
        await saveNote(changed);
        const c = new BroadcastChannel("sticky-notes");
        c.postMessage(n.id);
        c.close();
      } catch (e) {
        report(e);
        throw e;
      }
    },
    [report]
  );
  const add = useCallback(async () => {
    const n = createNote();
    await update(n);
    setFilter("all");
    setTag("");
    setQuery("");
    setColorFilter(null);
    setSelected(n.id);
  }, [update]);
  const softDelete = useCallback(
    async (n: Note) => {
      await update({ ...n, deleted: Date.now() });
      if (!detachedId) setSelected(null);
      setToast(tr("已移至垃圾桶，30 天內可還原"));
    },
    [update]
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        void add();
      }
      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setSelected(null);
        setFilter("all");
        if (desktop) void getCurrentWindow().show();
      }
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("delete-active-note", { detail: selected }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [add, selected]);
  useEffect(() => {
    if (!desktop || detachedId) return;
    let disposed = false;
    const shortcuts = ["CommandOrControl+Alt+N", "CommandOrControl+Alt+H"];
    (async () => {
      try {
        await register(shortcuts[0], (e) => {
          if (e.state === "Pressed") {
            void getCurrentWindow().show();
            void add();
          }
        });
        if (disposed) {
          await unregister(shortcuts[0]);
          return;
        }
        await register(shortcuts[1], (e) => {
          if (e.state === "Pressed") {
            void getCurrentWindow().show();
            void getCurrentWindow().setFocus();
          }
        });
        if (disposed) await unregister(shortcuts[1]);
      } catch (e) {
        setToast(tr("全域快捷鍵註冊失敗：") + String(e));
      }
    })();
    return () => {
      disposed = true;
      void unregister(shortcuts).catch(() => {});
    };
  }, [add]);
  useEffect(() => {
    if (!ready || detachedId) return;
    const timer = setInterval(() => {
      const due = notesRef.current.find(
        (n) => !n.deleted && !n.fired && n.reminder && new Date(n.reminder).getTime() <= Date.now()
      );
      if (due) {
        void update({ ...due, fired: true });
        setAlertNote(due);
        setSelected(due.id);
        if (desktop) {
          void getCurrentWindow().show();
          void getCurrentWindow().unminimize();
          void getCurrentWindow().setFocus();
          void getCurrentWindow().setAlwaysOnTop(true);
        }
        if (sound && localStorage.getItem("sticky-ringtone")) {
          const audio = new Audio(localStorage.getItem("sticky-ringtone")!);
          void audio.play().catch(() => setToast(tr("音效無法播放，請在設定重新選擇鈴聲")));
        } else if (sound) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
          osc.start();
          osc.stop(ctx.currentTime + 1);
          osc.onended = () => void ctx.close();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ready, sound, update]);
  const current = notes.find((n) => n.id === selected);
  const active = notes.filter((n) => !n.deleted && !n.archived);
  const tags = Array.from(new Set(active.flatMap((n) => n.tags))).sort();
  const counts = {
    all: active.length,
    pinned: active.filter((n) => n.pinned).length,
    reminder: notes.filter((n) => !n.deleted && n.reminder && !n.fired).length,
    archive: notes.filter((n) => !n.deleted && n.archived).length,
    trash: notes.filter((n) => n.deleted).length,
  };
  const filtered = notes
    .filter((n) => {
      if (filter === "trash") return !!n.deleted;
      if (n.deleted) return false;
      if (
        filter === "archive"
          ? !n.archived
          : filter === "reminder"
            ? !n.reminder || n.fired
            : n.archived
      )
        return false;
      if (filter === "pinned" && !n.pinned) return false;
      return true;
    })
    .filter(
      (n) =>
        (!tag || n.tags.includes(tag)) &&
        (colorFilter === null || n.color === colorFilter) &&
        (!query ||
          (!n.pinHash &&
            `${n.title} ${plain(n.html)} ${n.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())))
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, dateLocale())
        : sort === "created"
          ? b.created - a.created
          : Number(b.pinned) - Number(a.pinned) || b.updated - a.updated
    );
  async function popout(n: Note) {
    try {
      if (!(await openNote(n))) setToast(tr("獨立視窗請使用桌面版開啟"));
    } catch (e) {
      report(e);
    }
  }
  async function purge(n: Note) {
    if (!confirm(tr("永久刪除這張便箋？此操作無法還原\u3002"))) return;
    try {
      await removeNote(n.id);
      await refresh();
      setSelected(null);
      setToast(tr("便箋已永久刪除"));
    } catch (e) {
      report(e);
    }
  }
  const closeAlert = () => {
    setAlertNote(null);
    if (desktop) void getCurrentWindow().setAlwaysOnTop(false);
  };
  const editor =
    current && !current.deleted ? (
      <Editor
        key={current.id}
        note={current}
        dark={dark}
        onSave={update}
        onClose={() => (detachedId && desktop ? void getCurrentWindow().hide() : setSelected(null))}
        onDelete={(n) => void softDelete(n)}
        onPopout={() => void popout(current)}
        notify={setToast}
      />
    ) : null;
  if (detachedId)
    return (
      <div className="detached">
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {editor || (
          <div className="empty">
            <StickyNote size={40} />
            <h2>{ready ? tr("便箋已移至垃圾桶") : tr("正在開啟便箋\u2026")}</h2>
          </div>
        )}
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <StickyNote size={23} />
          </span>
          <div>
            Sticky Notes<small>{tr("讓想法，有個地方\u3002")}</small>
          </div>
        </div>
        <button className="new-button" onClick={() => void add()}>
          <Plus size={19} />
          {tr("新增便箋")}
          <kbd>Ctrl N</kbd>
        </button>
        <div className="nav-caption">{tr("我的工作空間")}</div>
        <nav>
          {navs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${filter === id && !tag ? "selected" : ""}`}
              onClick={() => {
                setFilter(id);
                setTag("");
                setColorFilter(null);
              }}
            >
              <Icon size={18} />
              {label}
              <span>{counts[id]}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-line" />
        <div className="nav-caption">
          {tr("標籤")}
          <Tag size={13} />
        </div>
        <div className="tag-nav">
          {tags.map((t, i) => (
            <button
              key={t}
              className={tag === t ? "selected" : ""}
              onClick={() => {
                setTag(tag === t ? "" : t);
                setFilter("all");
              }}
            >
              <span className={`tag-dot dot-${i % 3}`} />
              {t}
              <span>{active.filter((n) => n.tags.includes(t)).length}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="cloud-card" onClick={() => setModal("cloud")}>
            <span className="cloud-symbol">
              <Cloud size={21} />
            </span>
            <b>{tr("把想法，帶著走")}</b>
            <p>{tr("探索跨裝置同步")}</p>
            <span>
              {tr("雲端同步規畫")}
              <ArrowUpRight size={13} />
            </span>
          </button>
          <button className="settings-link" onClick={() => setModal("settings")}>
            <Settings size={17} />
            {tr("設定與偏好")}
            <small>v0.1.0</small>
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            {tr("我的工作空間")}
            <span>/</span> <b>{tag ? `# ${tag}` : navs.find((n) => n.id === filter)?.label}</b>
          </div>
          <div className="top-actions">
            <span className="local-status">
              <span />
              {tr("本機自動儲存")}
            </span>
            <IconButton
              icon={dark ? Moon : Sun}
              label={tr("切換深淺色")}
              onClick={() => setTheme(dark ? "light" : "dark")}
            />
            <button
              className="avatar"
              onClick={() => setModal("settings")}
              aria-label={tr("個人設定")}
            >
              {tr("我")}
            </button>
          </div>
        </header>
        <div className="workspace-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{tr("你的日常，隨手記下")}</div>
              <h1>
                {tag ? `# ${tag}` : navs.find((n) => n.id === filter)?.label}
                <span>{filtered.length}</span>
              </h1>
              <p>
                {filter === "trash"
                  ? tr("刪除的便箋會在這裡保留 30 天\u3002")
                  : filter === "reminder"
                    ? tr("留給未來的自己，一個溫柔的提醒\u3002")
                    : tr("收好每一個靈感，也記住每一件重要的小事\u3002")}
              </p>
            </div>
            <button className="secondary-button" onClick={() => setModal("shortcuts")}>
              <Keyboard size={16} />
              {tr("快捷鍵")}
            </button>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button
                onClick={() => {
                  setError("");
                  void refresh();
                }}
              >
                {tr("重試")}
              </button>
            </div>
          )}
          <div className="filter-bar">
            <label className="search-box">
              <Search size={18} />
              <input
                ref={searchRef}
                placeholder={tr("搜尋便箋內容\u3001標題或標籤\u2026")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <IconButton icon={X} label={tr("清除搜尋")} onClick={() => setQuery("")} />
              ) : (
                <kbd>Ctrl F</kbd>
              )}
            </label>
            <div className="filter-right">
              <label className="sort-control">
                <SlidersHorizontal size={15} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label={tr("排序方式")}
                >
                  <option value="updated">{tr("最近編輯")}</option>
                  <option value="created">{tr("建立時間")}</option>
                  <option value="title">{tr("標題排序")}</option>
                </select>
                <ChevronDown size={13} />
              </label>
              <div className="view-toggle">
                <IconButton
                  icon={LayoutGrid}
                  label={tr("網格檢視")}
                  active={!list}
                  onClick={() => setList(false)}
                />
                <IconButton
                  icon={List}
                  label={tr("清單檢視")}
                  active={list}
                  onClick={() => setList(true)}
                />
              </div>
            </div>
          </div>
          <div className="color-filter">
            <span>{tr("便箋顏色")}</span>
            <button
              className={`all-colors ${colorFilter === null ? "chosen" : ""}`}
              onClick={() => setColorFilter(null)}
            >
              {tr("全部")}
            </button>
            {colors.map((c, i) => (
              <button
                key={c.name}
                className={`color-dot ${colorFilter === i ? "chosen" : ""}`}
                style={{ background: c.value }}
                title={c.name}
                aria-label={tr("篩選{{p0}}", { p0: c.name })}
                onClick={() => setColorFilter(colorFilter === i ? null : i)}
              />
            ))}
            <span className="result-count">
              {filtered.length}
              {tr("張便箋")}
            </span>
          </div>
          {!ready ? (
            <div className="empty">{tr("正在載入便箋\u2026")}</div>
          ) : (
            <div className={`notes-grid ${list ? "list-view" : ""}`}>
              {filtered.map((n) => (
                <article
                  key={n.id}
                  className={`note-card ${selected === n.id ? "current" : ""}`}
                  style={
                    {
                      "--paper": dark ? colors[n.color]?.dark : colors[n.color]?.value,
                      "--paper-ink": textColor(dark ? colors[n.color].dark : colors[n.color].value),
                    } as React.CSSProperties
                  }
                  onClick={() => setSelected(n.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={tr("開啟{{p0}}", {
                    p0: n.pinHash ? tr("已鎖定便箋") : n.title || tr("未命名便箋"),
                  })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelected(n.id);
                  }}
                >
                  <div className="card-top">
                    <span>
                      {n.pinned ? <Pin size={14} /> : <span className="paper-line" />}
                      {n.pinHash && <LockKeyhole size={14} />}
                    </span>
                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      {n.deleted ? (
                        <>
                          <IconButton
                            icon={RotateCcw}
                            label={tr("還原便箋")}
                            onClick={() => void update({ ...n, deleted: null })}
                          />
                          <IconButton
                            icon={Trash2}
                            label={tr("永久刪除")}
                            onClick={() => void purge(n)}
                          />
                        </>
                      ) : (
                        <>
                          <IconButton
                            icon={Pin}
                            label={n.pinned ? tr("取消釘選") : tr("釘選便箋")}
                            active={n.pinned}
                            onClick={() => void update({ ...n, pinned: !n.pinned })}
                          />
                          <IconButton
                            icon={ArrowUpRight}
                            label={tr("在桌面開啟")}
                            onClick={() => void popout(n)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <h2>{n.pinHash ? tr("私人便箋") : n.title || tr("未命名便箋")}</h2>
                  {n.pinHash ? (
                    <div className="locked-preview">
                      <LockKeyhole size={25} />
                      <span>{tr("內容已鎖定")}</span>
                    </div>
                  ) : (
                    <div
                      className="card-preview"
                      dangerouslySetInnerHTML={{ __html: sanitize(n.html) }}
                    />
                  )}
                  <footer>
                    <div>
                      {!n.pinHash &&
                        n.tags.map((t) => (
                          <span key={t} className="note-tag">
                            {t}
                          </span>
                        ))}
                      {n.reminder && !n.fired && (
                        <span className="note-tag">
                          <Bell size={11} />
                          {date(new Date(n.reminder).getTime())}
                        </span>
                      )}
                    </div>
                    <time>{date(n.updated)}</time>
                  </footer>
                </article>
              ))}
              {filter !== "trash" && !query && !tag && (
                <button className="add-card" onClick={() => void add()}>
                  <span>
                    <Plus size={25} />
                  </span>
                  <b>{tr("新的想法，從這裡開始")}</b>
                  <small>
                    {tr("新增一張便箋")}
                    <kbd>Ctrl N</kbd>
                  </small>
                </button>
              )}
            </div>
          )}
          {ready && !filtered.length && (
            <div className="empty">
              <StickyNote size={35} />
              <h3>{query ? tr("找不到相符的便箋") : tr("這裡還沒有便箋")}</h3>
              <p>
                {query ? tr("試試其他關鍵字，或清除篩選條件\u3002") : tr("寫下第一個想法吧\u3002")}
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  setTag("");
                  setColorFilter(null);
                }}
              >
                {tr("清除篩選")}
              </button>
            </div>
          )}
          <div className="workspace-footer">
            <span>
              <span className="status-dot" />
              {tr("所有想法，妥善留在這台裝置")}
            </span>
            <span>{tr("留點空白，讓靈感發生\u3002")}</span>
          </div>
        </div>
      </main>
      {selected && <div className="editor-backdrop" onClick={() => setSelected(null)} />}
      {editor && <div className="editor-drawer">{editor}</div>}
      {current?.deleted && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{tr("這張便箋在垃圾桶中")}</h2>
            <p>{tr("還原後即可繼續編輯\u3002")}</p>
            <button
              className="primary-button"
              onClick={() => void update({ ...current, deleted: null })}
            >
              {tr("還原便箋")}
            </button>
            <button className="secondary-button" onClick={() => setSelected(null)}>
              {tr("關閉")}
            </button>
          </section>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>
                {modal === "settings"
                  ? tr("設定與偏好")
                  : modal === "cloud"
                    ? tr("讓便箋，走得更遠")
                    : tr("鍵盤快捷鍵")}
              </h2>
              <IconButton icon={X} label={tr("關閉")} onClick={() => setModal(null)} />
            </div>
            {modal === "settings" ? (
              <>
                <label className="setting-row">
                  {tr("介面語言")}
                  <select
                    aria-label={tr("介面語言")}
                    value={i18n.resolvedLanguage || "en"}
                    onChange={(event) => {
                      void changeUiLanguage(event.target.value).catch((error) =>
                        setToast(tr("無法切換語言：{{p0}}", { p0: String(error) }))
                      );
                    }}
                  >
                    {languages.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="help">{tr("語言偏好會保存，並套用至所有便箋視窗。")}</p>
                <label className="setting-row">
                  {tr("Windows 登入時自動啟動")}
                  <input
                    type="checkbox"
                    checked={startupEnabled === true}
                    disabled={!desktop || startupEnabled === null || startupBusy || !!startupError}
                    onChange={(event) => void changeStartup(event.target.checked)}
                  />
                </label>
                <p className="help">
                  {tr("自動啟動 Sticky Notes；僅適用 Windows 桌面版，不會變更其他程式的啟動設定。")}
                </p>
                {startupError && (
                  <p className="inline-error">
                    {tr("無法存取自動啟動設定：{{p0}}", { p0: startupError })}
                  </p>
                )}
                <label className="setting-row">
                  {tr("外觀主題")}{" "}
                  <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                    <option value="system">{tr("跟隨系統")}</option>
                    <option value="light">{tr("淺色模式")}</option>
                    <option value="dark">{tr("深色模式")}</option>
                  </select>
                </label>
                <div className="theme-options">
                  {(
                    [
                      { id: "light", icon: Sun, label: tr("明亮") },
                      { id: "dark", icon: Moon, label: tr("深色") },
                      { id: "system", icon: Monitor, label: tr("系統") },
                    ] as const
                  ).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      className={theme === id ? "selected" : ""}
                      onClick={() => setTheme(id)}
                    >
                      <Icon size={22} />
                      {label}
                    </button>
                  ))}
                </div>
                <label className="setting-row">
                  {tr("隱藏獨立便箋的系統標題列")}
                  <input
                    type="checkbox"
                    checked={framelessNotes}
                    disabled={!windowPreferenceReady || windowPreferenceBusy}
                    onChange={(e) => void changeNoteTitlebar(e.target.checked)}
                  />
                </label>
                <p className="help">
                  {tr(
                    "隱藏系統圖示\u3001標題及最小化／最大化／關閉按鈕，立即套用至所有獨立便箋\u3002拖曳便箋上方的模式名稱可移動視窗，右上角 \u00D7 可關閉便箋\u3002"
                  )}
                </p>
                <label className="setting-row">
                  {tr("提醒音效")}
                  <input
                    type="checkbox"
                    checked={sound}
                    onChange={(e) => {
                      setSound(e.target.checked);
                      localStorage.setItem("sticky-sound", String(e.target.checked));
                    }}
                  />
                </label>
                <div className="setting-row">
                  {tr("自訂提醒鈴聲")}
                  <FilePicker>
                    <input
                      className="import-input"
                      type="file"
                      accept="audio/*"
                      aria-label={tr("選擇提醒鈴聲")}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("audio/") || file.size > 1024 * 1024) {
                          setToast(tr("請選擇 1 MB 以下的音訊檔"));
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            localStorage.setItem("sticky-ringtone", String(reader.result));
                            setToast(tr("已設定自訂鈴聲"));
                          } catch {
                            setToast(tr("鈴聲儲存空間不足，請選擇較小的檔案"));
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </FilePicker>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    localStorage.removeItem("sticky-ringtone");
                    setToast(tr("已恢復預設提示音"));
                  }}
                >
                  {tr("恢復預設提示音")}
                </button>
                <p className="help">
                  {tr(
                    "提醒需要應用程式持續執行；關閉主視窗會保留在系統匣\u3002休眠期間的提醒會在恢復後顯示\u3002"
                  )}
                </p>
                <div className="setting-row">
                  {tr("資料備份")}
                  <button
                    className="secondary-button"
                    onClick={() => {
                      download(
                        `sticky-notes-${new Date().toISOString().slice(0, 10)}.json`,
                        JSON.stringify(notes, null, 2),
                        "application/json"
                      );
                      setToast(tr("已匯出備份，包含私人便箋的明文內容"));
                    }}
                  >
                    <Download size={15} />
                    {tr("匯出全部 JSON")}
                  </button>
                </div>
                <p className="help">
                  {tr(
                    "防窺鎖僅遮蔽畫面，不會加密本機檔案\u3002備份含所有便箋內容，請妥善保存\u3002"
                  )}
                </p>
                <div className="setting-row">
                  {tr("還原備份")}
                  <FilePicker>
                    <input
                      className="import-input"
                      type="file"
                      accept=".json"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const input = JSON.parse(await f.text());
                          if (
                            !Array.isArray(input) ||
                            !input.every(
                              (n) =>
                                typeof n.id === "string" &&
                                /^[a-f0-9-]{36}$/i.test(n.id) &&
                                typeof n.html === "string" &&
                                typeof n.title === "string" &&
                                Array.isArray(n.tags)
                            )
                          )
                            throw new Error(tr("備份格式不正確"));
                          for (const item of input) {
                            const base = createNote();
                            await saveNote({
                              ...base,
                              ...item,
                              id: base.id,
                              html: sanitize(item.html),
                              color: Math.max(0, Math.min(7, Number(item.color) || 0)),
                              tags: item.tags.filter((t: unknown) => typeof t === "string"),
                            });
                          }
                          await refresh();
                          setToast(tr("備份已匯入為新便箋"));
                        } catch (e) {
                          report(e);
                        }
                        e.target.value = "";
                      }}
                    />
                  </FilePicker>
                </div>
              </>
            ) : modal === "cloud" ? (
              <>
                <div className="cloud-hero">
                  <Cloud size={42} />
                </div>
                <p>{tr("目前版本採本機優先，無需帳戶即可使用\u3002")}</p>
                <p>
                  {tr(
                    "Google Drive\u3001OneDrive 雙向同步與手機 Widget 規畫於後續版本，尚未連接任何雲端服務\u3002"
                  )}
                </p>
                <div className="cloud-detail">
                  <Check size={17} />
                  {tr("本機自動儲存與 JSON 備份已可使用")}
                </div>
                <button className="primary-button" onClick={() => setModal("settings")}>
                  {tr("先備份我的便箋")}
                </button>
              </>
            ) : (
              <div className="shortcut-list">
                {[
                  [tr("新增便箋"), "Ctrl / ⌘ + N"],
                  [tr("刪除目前便箋"), "Ctrl / ⌘ + D"],
                  [tr("回到總清單"), "Ctrl / ⌘ + H"],
                  [tr("搜尋便箋"), "Ctrl / ⌘ + F"],
                  [tr("粗體 / 斜體 / 底線"), "Ctrl / ⌘ + B / I / U"],
                  [tr("刪除線"), "Ctrl / ⌘ + T"],
                  [tr("項目清單"), "Ctrl / ⌘ + Shift + L"],
                  [tr("放大 / 縮小字級"), "Ctrl / ⌘ + Shift + > / <"],
                  [tr("全域新增（桌面版）"), "Ctrl / ⌘ + Alt + N"],
                  [tr("全域喚醒（桌面版）"), "Ctrl / ⌘ + Alt + H"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <span>{a}</span>
                    <kbd>{b}</kbd>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {alertNote && (
        <div className="modal-backdrop reminder-overlay">
          <section className="dialog reminder-dialog">
            <Bell size={35} />
            <h2>{tr("到了提醒的時間")}</h2>
            <h3>{alertNote.pinHash ? tr("私人便箋") : alertNote.title || tr("未命名便箋")}</h3>
            <p>{new Date(alertNote.reminder).toLocaleString(dateLocale())}</p>
            <button
              className="primary-button"
              onClick={() => {
                setSelected(alertNote.id);
                closeAlert();
              }}
            >
              {tr("開啟便箋")}
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                void update({
                  ...alertNote,
                  reminder: new Date(Date.now() + 10 * 60000).toISOString(),
                  fired: false,
                });
                closeAlert();
              }}
            >
              {tr("10 分鐘後提醒")}
            </button>
            <button className="text-button" onClick={closeAlert}>
              {tr("關閉提醒")}
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Editor({
  note,
  dark,
  onSave,
  onClose,
  onDelete,
  onPopout,
  notify,
}: {
  note: Note;
  dark: boolean;
  onSave: (n: Note) => Promise<void>;
  onClose: () => void;
  onDelete: (n: Note) => void;
  onPopout: () => void;
  notify: (s: string) => void;
}) {
  useTranslation("sticky");
  const [draft, setDraft] = useState(note);
  const [editing, setEditing] = useState(!detachedId);
  const [opacityOpen, setOpacityOpen] = useState(false);
  const [windowFocused, setWindowFocused] = useState(() => !desktop && document.hasFocus());
  useEffect(() => {
    if (!detachedId) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    let focusRevision = 0;
    const focus = () => setWindowFocused(true);
    const blur = () => setWindowFocused(false);
    if (desktop) {
      const noteWindow = getCurrentWindow();
      void noteWindow
        .onFocusChanged(({ payload }) => {
          focusRevision++;
          if (!disposed) setWindowFocused(payload);
        })
        .then(async (unlisten) => {
          if (disposed) return unlisten();
          stop = unlisten;
          const revision = focusRevision;
          const focused = await noteWindow.isFocused();
          if (!disposed && revision === focusRevision) setWindowFocused(focused);
        })
        .catch((error) => console.error("Failed to observe note window focus", error));
    } else {
      window.addEventListener("focus", focus);
      window.addEventListener("blur", blur);
    }
    return () => {
      disposed = true;
      stop?.();
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const draftRef = useRef(note);
  const editor = useRef<HTMLDivElement>(null);
  type WindowDrag = {
    pointer: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    origin: PhysicalPosition | null;
    scale: number;
  };
  const windowDrag = useRef<WindowDrag | null>(null);
  function moveNoteWindow(drag: WindowDrag) {
    if (!drag.origin) return;
    void getCurrentWindow()
      .setPosition(
        new PhysicalPosition(
          Math.round(drag.origin.x + (drag.x - drag.startX) * drag.scale),
          Math.round(drag.origin.y + (drag.y - drag.startY) * drag.scale)
        )
      )
      .catch((error) => notify(tr("無法移動便箋：{{p0}}", { p0: String(error) })));
  }
  const [saved, setSaved] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [panel, setPanel] = useState<"reminder" | "lock" | "export" | null>(null);
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(!note.pinHash);
  useEffect(() => {
    if (!desktop || !detachedId) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    void listen("note-opened", () => {
      setEditing(false);
      setPanel(null);
    }).then((fn) => {
      if (disposed) fn();
      else stop = fn;
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && draftRef.current.pinHash) setUnlocked(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const [pinError, setPinError] = useState("");
  const [tagText, setTagText] = useState(note.tags.join(", "));
  useEffect(() => {
    if (editing || !saved) return;
    draftRef.current = note;
    setDraft(note);
    setTagText(note.tags.join(", "));
  }, [note, editing, saved]);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(Promise.resolve());
  const requestDelete = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    void queue.current.finally(() => onDelete(draftRef.current));
  }, [onDelete]);
  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent<string>).detail === draftRef.current.id) requestDelete();
    };
    window.addEventListener("delete-active-note", handler);
    return () => window.removeEventListener("delete-active-note", handler);
  }, [requestDelete]);
  const selection = useRef<Range | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [reminder, setReminder] = useState(note.reminder ? localDateTime(note.reminder) : "");
  const persist = useCallback(
    (n: Note) => {
      setSaved(false);
      queue.current = queue.current
        .catch(() => {})
        .then(() => onSave(n))
        .then(() => {
          if (draftRef.current === n) {
            setSaved(true);
            setSaveError("");
          }
        })
        .catch((e) => setSaveError(String(e)));
    },
    [onSave]
  );
  const change = useCallback(
    (patch: Partial<Note>) => {
      const n = { ...draftRef.current, ...patch };
      draftRef.current = n;
      setDraft(n);
      setSaved(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        persist(n);
      }, 180);
    },
    [persist]
  );
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        persist(draftRef.current);
      }
    },
    [persist]
  );
  useEffect(() => {
    if (editor.current) editor.current.innerHTML = sanitize(draftRef.current.html);
  }, [note.id, unlocked, editing]); // Restore content when entering edit mode without disturbing typing.
  useEffect(() => {
    const capture = () => {
      const s = window.getSelection();
      if (s?.rangeCount && editor.current?.contains(s.anchorNode))
        selection.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", capture);
    return () => document.removeEventListener("selectionchange", capture);
  }, []);
  const input = () => {
    if (editor.current) change({ html: sanitize(editor.current.innerHTML) });
  };
  const command = (cmd: string, value?: string) => {
    editor.current?.focus();
    const s = window.getSelection();
    if (selection.current && editor.current?.contains(selection.current.commonAncestorContainer)) {
      s?.removeAllRanges();
      s?.addRange(selection.current);
    }
    document.execCommand(cmd, false, value);
    input();
  };
  const addImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      notify(tr("圖片需小於 8 MB"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      command(
        "insertHTML",
        tr('<img src="{{p0}}" alt="貼上的圖片" style="width:100%"><p><br></p>', {
          p0: reader.result,
        })
      );
    reader.readAsDataURL(file);
  };
  const links = Array.from(
    new Set(
      plain(draft.html).match(
        /(?:https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?|[一-鿿]{2,3}[市縣][一-鿿\d]+(?:路|街)[一-鿿\d巷弄段-]*號|(?:\+?\d[\d ()-]{7,}\d))/g
      ) || []
    )
  ).slice(0, 8);
  async function pinAction() {
    if (!/^\d{4}$/.test(pin)) {
      setPinError(tr("請輸入 4 位數 PIN 碼"));
      return;
    }
    if (!unlocked) {
      if ((await hashPin(pin, draft.salt)) !== draft.pinHash) {
        setPinError(tr("PIN 碼不正確"));
        return;
      }
      setUnlocked(true);
      setPin("");
      setPinError("");
      return;
    }
    const salt = crypto.randomUUID();
    change({ pinHash: await hashPin(pin, salt), salt });
    setPin("");
    setPanel(null);
    setUnlocked(false);
    notify(tr("已設定防窺鎖"));
  }
  const paper = dark ? colors[draft.color].dark : colors[draft.color].value;
  async function togglePin() {
    const pinned = !draftRef.current.pinned;
    try {
      if (desktop && detachedId) await getCurrentWindow().setAlwaysOnTop(pinned);
      change({ pinned });
    } catch (error) {
      notify(tr("無法變更置頂狀態：{{p0}}", { p0: String(error) }));
    }
  }
  function finishEditing() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      persist(draftRef.current);
    }
    setPanel(null);
    setSelectedImage(null);
    setEditing(false);
  }
  return (
    <section
      className={[
        "note-editor",
        detachedId && !editing ? "note-view-autohide" : "",
        windowFocused ? "window-focused" : "",
      ].join(" ")}
      style={
        {
          "--paper": paper,
          "--paper-ink": textColor(paper),
          opacity:
            detachedId && (opacityOpen || (draft.pinned && !windowFocused))
              ? (draft.inactiveOpacity ?? 0.7)
              : 1,
        } as React.CSSProperties
      }
    >
      <div
        className="editor-header"
        title={detachedId ? tr("拖曳此處移動便箋") : undefined}
        onPointerDown={(event) => {
          if (
            !detachedId ||
            !desktop ||
            event.button !== 0 ||
            (event.target instanceof Element && event.target.closest("button"))
          )
            return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const drag: WindowDrag = {
            pointer: event.pointerId,
            startX: event.screenX,
            startY: event.screenY,
            x: event.screenX,
            y: event.screenY,
            origin: null,
            scale: 1,
          };
          windowDrag.current = drag;
          void Promise.all([getCurrentWindow().outerPosition(), getCurrentWindow().scaleFactor()])
            .then(([origin, scale]) => {
              drag.origin = origin;
              drag.scale = scale;
              moveNoteWindow(drag);
            })
            .catch((error) => notify(tr("無法移動便箋：{{p0}}", { p0: String(error) })));
        }}
        onPointerMove={(event) => {
          const drag = windowDrag.current;
          if (!drag || drag.pointer !== event.pointerId) return;
          drag.x = event.screenX;
          drag.y = event.screenY;
          moveNoteWindow(drag);
        }}
        onPointerUp={(event) => {
          const drag = windowDrag.current;
          if (!drag || drag.pointer !== event.pointerId) return;
          drag.x = event.screenX;
          drag.y = event.screenY;
          moveNoteWindow(drag);
          windowDrag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          windowDrag.current = null;
        }}
      >
        {detachedId ? (
          <span>
            {unlocked && (
              <button
                className="note-mode-button"
                onClick={() => (editing ? finishEditing() : setEditing(true))}
              >
                {editing ? <Eye size={14} /> : <Pencil size={14} />}
                {editing ? tr("完成") : tr("編輯")}
              </button>
            )}
          </span>
        ) : (
          <span>
            <StickyNote size={16} />
            {tr("編輯便箋")}
          </span>
        )}
        <div>
          {detachedId && (
            <button
              className="note-opacity-button"
              aria-label={tr("失焦透明度設定")}
              aria-expanded={opacityOpen}
              title={tr("失焦透明度設定")}
              onClick={() => setOpacityOpen((open) => !open)}
            >
              <Eye size={14} />
              {Math.round((draft.inactiveOpacity ?? 0.7) * 100)}%
            </button>
          )}
          {detachedId ? (
            <button
              className={`note-pin-button ${draft.pinned ? "is-pinned" : ""}`}
              aria-pressed={draft.pinned}
              title={tr("讓便箋顯示在其他視窗上方")}
              onClick={() => void togglePin()}
            >
              <Pin size={14} />
              {draft.pinned ? tr("取消置頂") : tr("置頂")}
            </button>
          ) : (
            <IconButton
              icon={Pin}
              label={draft.pinned ? tr("取消置頂") : tr("置頂")}
              active={draft.pinned}
              onClick={() => void togglePin()}
            />
          )}
          {!detachedId && (
            <IconButton icon={ArrowUpRight} label={tr("在桌面開啟")} onClick={onPopout} />
          )}
          <IconButton
            icon={X}
            label={tr("關閉便箋")}
            onClick={() => {
              if (detachedId) finishEditing();
              if (draftRef.current.pinHash) setUnlocked(false);
              onClose();
            }}
          />
        </div>
      </div>
      {detachedId && opacityOpen && (
        <div className="note-opacity-panel">
          <label>
            <span>{tr("失焦時的不透明度")}</span>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={Math.round((draft.inactiveOpacity ?? 0.7) * 100)}
              onChange={(event) => change({ inactiveOpacity: Number(event.target.value) / 100 })}
            />
          </label>
          <p>{tr("調整時即時預覽；關閉後僅置頂且失焦時生效。")}</p>
          <button onClick={() => setOpacityOpen(false)}>{tr("完成")}</button>
        </div>
      )}
      {!unlocked ? (
        <div className="lock-screen">
          <div className="blur-paper" aria-hidden="true">
            <div />
            <div />
            <div />
            <div />
          </div>
          <LockKeyhole size={36} />
          <h2>{tr("留給自己的小秘密")}</h2>
          <p>{tr("輸入 4 位數 PIN 碼，開啟這張便箋\u3002")}</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            aria-label={tr("解鎖 PIN 碼")}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void pinAction();
            }}
            autoFocus
          />
          {pinError && <p className="inline-error">{pinError}</p>}
          <button className="primary-button" onClick={() => void pinAction()}>
            {tr("解鎖便箋")}
          </button>
          <small>{tr("防窺鎖僅遮蔽畫面，不加密本機資料\u3002")}</small>
        </div>
      ) : !editing ? (
        <Fragment key="view">
          <div className="note-view-title">
            <h1>{draft.title || tr("未命名便箋")}</h1>
          </div>
          <div
            className="rich-editor note-view-content"
            style={{ fontSize: draft.fontSize }}
            onClick={(e) => {
              const target = e.target;
              if (target instanceof HTMLInputElement) e.preventDefault();
              const anchor = target instanceof Element ? target.closest("a") : null;
              if (anchor) {
                e.preventDefault();
                if (desktop) void openUrl(anchor.href).catch((error) => notify(String(error)));
                else window.open(anchor.href, "_blank", "noopener");
              }
            }}
            dangerouslySetInnerHTML={{
              __html: sanitize(draft.html).replace(/<input\b/g, '<input disabled tabindex="-1"'),
            }}
          />
          {!plain(draft.html) && !draft.html.includes("<img") && (
            <p className="note-view-empty">{tr("按右上角\u300C編輯\u300D，寫下你的想法\u3002")}</p>
          )}
          <div className="note-view-footer">
            <div>
              {draft.tags.map((t) => (
                <span className="note-tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <span>
              {saveError ? tr("儲存失敗") : saved ? tr("已自動儲存") : tr("儲存中\u2026")}
            </span>
          </div>
        </Fragment>
      ) : (
        <Fragment key="edit">
          <div className="editor-title">
            <input
              placeholder={tr("未命名便箋")}
              value={draft.title}
              onChange={(e) => change({ title: e.target.value })}
              aria-label={tr("便箋標題")}
            />
          </div>
          <div
            className="format-toolbar"
            onMouseDown={(e) => {
              if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
            }}
          >
            {[
              { icon: Bold, label: tr("粗體 Ctrl+B"), cmd: "bold" },
              { icon: Italic, label: tr("斜體 Ctrl+I"), cmd: "italic" },
              { icon: Underline, label: tr("底線 Ctrl+U"), cmd: "underline" },
              { icon: Strikethrough, label: tr("刪除線 Ctrl+T"), cmd: "strikeThrough" },
            ].map((t) => (
              <IconButton
                key={t.cmd}
                icon={t.icon}
                label={t.label}
                onClick={() => command(t.cmd)}
              />
            ))}
            <span className="toolbar-divider" />
            <IconButton
              icon={ListTodo}
              label={tr("待辦清單")}
              onClick={() =>
                command("insertHTML", tr('<div><input type="checkbox"> 待辦事項</div>'))
              }
            />
            <IconButton
              icon={ListIcon}
              label={tr("項目清單")}
              onClick={() => command("insertUnorderedList")}
            />
            <IconButton
              icon={ListOrdered}
              label={tr("編號清單")}
              onClick={() => command("insertOrderedList")}
            />
            <IconButton
              icon={ImagePlus}
              label={tr("插入圖片")}
              onClick={() => fileRef.current?.click()}
            />
            <span className="toolbar-divider" />
            <Highlighter size={15} />
            {["yellow", "green", "blue", "pink"].map((c) => (
              <button
                key={c}
                className={`highlight-dot highlight-${c}`}
                title={tr("{{p0}} 色塊標注", { p0: tr(c) })}
                aria-label={tr("{{p0}} 色塊標注", { p0: tr(c) })}
                onClick={() =>
                  command(
                    "insertHTML",
                    `<span class="highlight-${c}">${escapeHTML(window.getSelection()?.toString() || tr("標注文字"))}</span>`
                  )
                }
              />
            ))}
            <button
              className="font-button"
              onClick={() => change({ fontSize: Math.max(12, draft.fontSize - 2) })}
              aria-label={tr("縮小字級")}
            >
              A−
            </button>
            <button
              className="font-button"
              onClick={() => change({ fontSize: Math.min(36, draft.fontSize + 2) })}
              aria-label={tr("放大字級")}
            >
              A+
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addImage(f);
              e.target.value = "";
            }}
          />
          <div
            ref={editor}
            className="rich-editor"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={tr("寫下此刻的想法\u2026")}
            role="textbox"
            aria-label={tr("便箋內容")}
            aria-multiline="true"
            style={{ fontSize: draft.fontSize }}
            onInput={input}
            onPaste={(e) => {
              e.preventDefault();
              const items = Array.from(e.clipboardData.items);
              const image = items.find((i) => i.type.startsWith("image/"))?.getAsFile();
              if (image) {
                addImage(image);
                return;
              }
              const html = e.clipboardData.getData("text/html");
              if (html) command("insertHTML", sanitize(html));
              else command("insertText", e.clipboardData.getData("text/plain"));
            }}
            onClick={(e) => {
              const target = e.target;
              if (target instanceof HTMLInputElement) {
                target.toggleAttribute("checked", target.checked);
                input();
              }
              if (target instanceof HTMLImageElement) setSelectedImage(target);
              else setSelectedImage(null);
              if (target instanceof HTMLAnchorElement) {
                e.preventDefault();
                void (desktop
                  ? openUrl(target.href)
                  : Promise.resolve(window.open(target.href, "_blank", "noopener")));
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
                e.preventDefault();
                command("strikeThrough");
              }
              if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
                e.preventDefault();
                command("insertUnorderedList");
              }
              if (
                (e.ctrlKey || e.metaKey) &&
                e.shiftKey &&
                [">", "<", ". ", ".", ","].includes(e.key)
              ) {
                e.preventDefault();
                change({
                  fontSize: Math.min(
                    36,
                    Math.max(12, draft.fontSize + ([">", "."].includes(e.key) ? 2 : -2))
                  ),
                });
              }
            }}
          />
          {selectedImage && (
            <div className="image-tools">
              <span>{tr("圖片")}</span>
              <button
                onClick={() => {
                  selectedImage.style.width = `${Math.max(20, (parseInt(selectedImage.style.width) || 100) - 10)}%`;
                  input();
                }}
              >
                {tr("縮小")}
              </button>
              <button
                onClick={() => {
                  selectedImage.style.width = `${Math.min(100, (parseInt(selectedImage.style.width) || 100) + 10)}%`;
                  input();
                }}
              >
                {tr("放大")}
              </button>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = selectedImage.src;
                  a.download = "sticky-image.png";
                  a.click();
                }}
              >
                {tr("另存")}
              </button>
              <button
                onClick={() => {
                  selectedImage.remove();
                  setSelectedImage(null);
                  input();
                }}
              >
                {tr("刪除")}
              </button>
            </div>
          )}
          {links.length > 0 && (
            <div className="detected-links">
              <small>{tr("偵測到的連結")}</small>
              {links.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)) {
                      const parsed = new Date(
                        s.replace(/\//g, "-").replace(" ", "T") + (s.includes(":") ? "" : "T09:00")
                      );
                      if (!Number.isNaN(parsed.getTime())) {
                        setReminder(localDateTime(parsed.toISOString()));
                        setPanel("reminder");
                      }
                      return;
                    }
                    const url = s.includes("@")
                      ? `mailto:${s}`
                      : s.startsWith("http")
                        ? s
                        : /[市縣].*[路街].*號/.test(s)
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`
                          : `tel:${s.replace(/[^+\d]/g, "")}`;
                    if (desktop) void openUrl(url).catch((e) => notify(String(e)));
                    else window.open(url, "_blank", "noopener");
                  }}
                >
                  <ExternalLink size={11} />
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="editor-meta">
            <label>
              <Tag size={14} />
              <input
                aria-label={tr("標籤，以逗號分隔")}
                placeholder={tr("加入標籤，以逗號分隔")}
                value={tagText}
                onChange={(e) => {
                  setTagText(e.target.value);
                  change({
                    tags: Array.from(
                      new Set(
                        e.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    ),
                  });
                }}
              />
            </label>
            <div className="editor-colors">
              {colors.map((c, i) => (
                <button
                  key={c.name}
                  style={{ background: c.value }}
                  aria-label={tr("改為{{p0}}", { p0: c.name })}
                  title={c.name}
                  className={draft.color === i ? "chosen" : ""}
                  onClick={() => change({ color: i })}
                >
                  {draft.color === i && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
          <div className="editor-bottom">
            <span className={saveError ? "save-error" : "save-status"}>
              {saveError ? tr("儲存失敗") : saved ? tr("已自動儲存") : tr("儲存中\u2026")}
            </span>
            <div>
              <IconButton
                icon={Bell}
                label={tr("設定提醒")}
                active={!!draft.reminder && !draft.fired}
                onClick={() => setPanel(panel === "reminder" ? null : "reminder")}
              />
              <IconButton
                icon={LockKeyhole}
                label={tr("防窺鎖")}
                active={!!draft.pinHash}
                onClick={() => setPanel(panel === "lock" ? null : "lock")}
              />
              <IconButton
                icon={Archive}
                label={draft.archived ? tr("取消封存") : tr("封存便箋")}
                onClick={() => {
                  change({ archived: !draft.archived });
                  notify(draft.archived ? tr("便箋已取消封存") : tr("便箋已封存"));
                  onClose();
                }}
              />
              <IconButton
                icon={Download}
                label={tr("匯出便箋")}
                onClick={() => setPanel(panel === "export" ? null : "export")}
              />
              <IconButton icon={Trash2} label={tr("刪除便箋")} onClick={requestDelete} />
            </div>
          </div>
          {panel && (
            <div className="editor-panel">
              <div className="dialog-header">
                <b>
                  {panel === "reminder"
                    ? tr("在什麼時候提醒？")
                    : panel === "lock"
                      ? tr("便箋防窺鎖")
                      : tr("匯出這張便箋")}
                </b>
                <IconButton icon={X} label={tr("關閉選單")} onClick={() => setPanel(null)} />
              </div>
              {panel === "reminder" ? (
                <>
                  <input
                    type="datetime-local"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                  />
                  <div className="quick-times">
                    {[5, 15, 30, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() =>
                          setReminder(localDateTime(new Date(Date.now() + m * 60000).toISOString()))
                        }
                      >
                        {m}
                        {tr("分鐘後")}
                      </button>
                    ))}
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => {
                      if (!reminder || new Date(reminder).getTime() <= Date.now()) {
                        notify(tr("請選擇未來的提醒時間"));
                        return;
                      }
                      change({ reminder: new Date(reminder).toISOString(), fired: false });
                      setPanel(null);
                      notify(tr("已設定提醒，請保持應用程式執行"));
                    }}
                  >
                    {tr("設定提醒")}
                  </button>
                  {draft.reminder && (
                    <button
                      className="text-button"
                      onClick={() => {
                        change({ reminder: "", fired: false });
                        setReminder("");
                        setPanel(null);
                      }}
                    >
                      {tr("移除提醒")}
                    </button>
                  )}
                </>
              ) : panel === "lock" ? (
                <>
                  <p>{tr("設定 4 位數 PIN 碼，遮蔽便箋內容\u3002")}</p>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    aria-label={tr("設定 PIN 碼")}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                  {pinError && <p className="inline-error">{pinError}</p>}
                  <button className="primary-button" onClick={() => void pinAction()}>
                    {tr("設定並鎖定")}
                  </button>
                  {draft.pinHash && (
                    <button
                      className="text-button"
                      onClick={() => {
                        change({ pinHash: "", salt: "" });
                        setPanel(null);
                      }}
                    >
                      {tr("移除防窺鎖")}
                    </button>
                  )}
                  <small>{tr("防窺鎖不加密本機資料；忘記 PIN 無法從畫面解鎖\u3002")}</small>
                </>
              ) : (
                <div className="export-options">
                  <button
                    onClick={() =>
                      download(`${draft.title || tr("便箋")}.md`, markdown(draft), "text/markdown")
                    }
                  >
                    Markdown <Download size={15} />
                  </button>
                  <button
                    onClick={() =>
                      download(
                        `${draft.title || tr("便箋")}.json`,
                        JSON.stringify(draft, null, 2),
                        "application/json"
                      )
                    }
                  >
                    JSON <Download size={15} />
                  </button>
                  <button
                    onClick={() => {
                      const print = document.getElementById("print-note");
                      if (print)
                        print.innerHTML = `<h1>${escapeHTML(draft.title)}</h1>${sanitize(draft.html)}`;
                      window.print();
                    }}
                  >
                    {tr("列印 / 另存 PDF")}
                    <Download size={15} />
                  </button>
                  <small>{tr("PDF 使用系統列印功能，選擇\u300C另存為 PDF\u300D\u3002")}</small>
                </div>
              )}
            </div>
          )}
        </Fragment>
      )}
      <div id="print-note" />
    </section>
  );
}
function escapeHTML(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
function localDateTime(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
