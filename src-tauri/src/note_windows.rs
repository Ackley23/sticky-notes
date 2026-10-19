use super::{read_frameless, valid_id, Storage, NOTE_MIN_HEIGHT, NOTE_MIN_WIDTH};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow};

#[derive(Debug, Serialize, Deserialize)]
struct Placement {
    x: i32,
    y: i32,
    width: f64,
    height: f64,
}

fn placement(db: &Connection, id: &str) -> Result<Option<Placement>, String> {
    let raw: Option<String> = db
        .query_row(
            "SELECT placement FROM desktop_windows WHERE id=?1",
            [id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(raw
        .and_then(|raw| serde_json::from_str::<Placement>(&raw).ok())
        .filter(|p| p.width.is_finite() && p.height.is_finite() && p.width > 0. && p.height > 0.))
}

fn save_geometry(window: &WebviewWindow, id: &str) -> Result<(), String> {
    if window.is_minimized().map_err(|e| e.to_string())? {
        return Ok(());
    }
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window
        .inner_size()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(window.scale_factor().map_err(|e| e.to_string())?);
    if size.width < NOTE_MIN_WIDTH || size.height < NOTE_MIN_HEIGHT {
        return Ok(());
    }
    let value = serde_json::to_string(&Placement {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    })
    .map_err(|e| e.to_string())?;
    let state = window.state::<Storage>();
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO desktop_windows(id,placement,is_open) VALUES(?1,?2,1) ON CONFLICT(id) DO UPDATE SET placement=excluded.placement", params![id, value]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn remember_closed<R: Runtime>(app: &AppHandle<R>, label: &str) {
    let Some(id) = label.strip_prefix("note-") else {
        return;
    };
    if let Some(state) = app.try_state::<Storage>() {
        if let Ok(db) = state.0.lock() {
            if let Err(error) = db.execute("UPDATE desktop_windows SET is_open=0 WHERE id=?1", [id])
            {
                eprintln!("Unable to remember closed note: {error}");
            }
        }
    }
}

fn keep_on_screen(window: &WebviewWindow, saved: &Placement) -> Result<(), String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors
        .iter()
        .find(|m| {
            let area = m.work_area();
            i64::from(saved.x) >= i64::from(area.position.x)
                && i64::from(saved.x) < i64::from(area.position.x) + i64::from(area.size.width)
                && i64::from(saved.y) >= i64::from(area.position.y)
                && i64::from(saved.y) < i64::from(area.position.y) + i64::from(area.size.height)
        })
        .or_else(|| monitors.first());
    if let Some(monitor) = monitor {
        let area = monitor.work_area();
        let scale = monitor.scale_factor();
        window
            .set_size(tauri::LogicalSize::new(
                saved
                    .width
                    .max(NOTE_MIN_WIDTH)
                    .min((area.size.width as f64 / scale).max(NOTE_MIN_WIDTH)),
                saved
                    .height
                    .max(NOTE_MIN_HEIGHT)
                    .min((area.size.height as f64 / scale).max(NOTE_MIN_HEIGHT)),
            ))
            .map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;
        let max_x = (i64::from(area.position.x) + i64::from(area.size.width)
            - i64::from(size.width))
        .max(i64::from(area.position.x));
        let max_y = (i64::from(area.position.y) + i64::from(area.size.height)
            - i64::from(size.height))
        .max(i64::from(area.position.y));
        window
            .set_position(tauri::PhysicalPosition::new(
                i64::from(saved.x).clamp(i64::from(area.position.x), max_x) as i32,
                i64::from(saved.y).clamp(i64::from(area.position.y), max_y) as i32,
            ))
            .map_err(|e| e.to_string())?;
    } else {
        window.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn open(app: &AppHandle, id: &str, pinned: bool, focus: bool) -> Result<(), String> {
    valid_id(id)?;
    let (frameless, saved) = {
        let state = app.state::<Storage>();
        let db = state.0.lock().map_err(|e| e.to_string())?;
        (read_frameless(&db)?, placement(&db, id)?)
    };
    let label = format!("note-{id}");
    let window = if let Some(window) = app.get_webview_window(&label) {
        window
            .set_decorations(!frameless)
            .map_err(|e| e.to_string())?;
        window
            .set_always_on_top(pinned)
            .map_err(|e| e.to_string())?;
        window.emit("note-opened", ()).map_err(|e| e.to_string())?;
        window
    } else {
        let window = tauri::WebviewWindowBuilder::new(
            app,
            label,
            tauri::WebviewUrl::App(format!("index.html?note={id}").into()),
        )
        .title("Sticky Notes")
        .inner_size(
            saved.as_ref().map_or(390., |p| p.width.max(NOTE_MIN_WIDTH)),
            saved
                .as_ref()
                .map_or(500., |p| p.height.max(NOTE_MIN_HEIGHT)),
        )
        .min_inner_size(NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT)
        .always_on_top(pinned)
        .transparent(true)
        .decorations(!frameless)
        .visible(false)
        .focused(focus)
        .build()
        .map_err(|e| e.to_string())?;
        if let Some(saved) = &saved {
            keep_on_screen(&window, saved)?;
        }
        let observed = window.clone();
        let note_id = id.to_owned();
        window.on_window_event(move |event| {
            if matches!(
                event,
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)
            ) {
                if let Err(error) = save_geometry(&observed, &note_id) {
                    eprintln!("Unable to save note placement: {error}");
                }
            }
        });
        window
    };
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    if focus {
        window.set_focus().map_err(|e| e.to_string())?;
    }
    save_geometry(&window, id)?;
    let state = app.state::<Storage>();
    state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .execute("UPDATE desktop_windows SET is_open=1 WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn restorable(db: &Connection) -> Result<Vec<(String, bool)>, String> {
    let mut stmt = db.prepare("SELECT w.id,n.payload FROM desktop_windows w JOIN notes n ON n.id=w.id WHERE w.is_open=1").map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    for row in rows {
        let (id, payload) = row.map_err(|e| e.to_string())?;
        if valid_id(&id).is_err() {
            continue;
        }
        if let Ok(note) = serde_json::from_str::<serde_json::Value>(&payload) {
            if note.get("deleted").is_none_or(|v| v.is_null()) {
                notes.push((
                    id,
                    note.get("pinned")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false),
                ));
            }
        }
    }
    Ok(notes)
}

pub fn restore(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let notes = {
            let state = app.state::<Storage>();
            let result = state
                .0
                .lock()
                .map_err(|e| e.to_string())
                .and_then(|db| restorable(&db));
            result
        };
        match notes {
            Ok(notes) => {
                for (id, pinned) in notes {
                    if let Err(error) = open(&app, &id, pinned, false) {
                        eprintln!("Unable to restore note {id}: {error}");
                    }
                }
            }
            Err(error) => eprintln!("Unable to restore desktop notes: {error}"),
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restore_only_open_existing_non_deleted_notes_and_keep_geometry() {
        let path = std::env::temp_dir().join(format!(
            "sticky-session-{}-{}.sqlite3",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let db = super::super::database(&path).unwrap();
        for (n, open, deleted) in [(1, 1, false), (2, 0, false), (3, 1, true)] {
            let id = format!("00000000-0000-4000-8000-{n:012}");
            super::super::upsert(&db, &serde_json::json!({"id":id,"deleted":if deleted {Some(123)} else {None},"pinned":true})).unwrap();
            db.execute(
                "INSERT INTO desktop_windows VALUES(?1,?2,?3)",
                params![id, r#"{"x":-100,"y":50,"width":240,"height":180}"#, open],
            )
            .unwrap();
        }
        drop(db);
        let db = super::super::database(&path).unwrap();
        let restored = restorable(&db).unwrap();
        assert_eq!(
            restored,
            vec![("00000000-0000-4000-8000-000000000001".into(), true)]
        );
        let saved = placement(&db, &restored[0].0).unwrap().unwrap();
        assert_eq!(
            (saved.x, saved.y, saved.width, saved.height),
            (-100, 50, 240., 180.)
        );
        db.execute("DELETE FROM notes WHERE id=?1", [&restored[0].0])
            .unwrap();
        assert!(restorable(&db).unwrap().is_empty());
        drop(db);
        std::fs::remove_file(path).unwrap();
    }
}
