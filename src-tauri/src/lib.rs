mod plugins;
use rusqlite::{params, Connection};
use std::{fs, path::Path, sync::Mutex};
use tauri::{Emitter, Manager};
struct Storage(Mutex<Connection>);
fn database(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);").map_err(|e|e.to_string())?;
    Ok(conn)
}
fn valid_id(id: &str) -> Result<(), String> {
    if id.len() != 36 || !id.chars().all(|c| c.is_ascii_hexdigit() || c == '-') {
        return Err("Invalid note id".into());
    }
    Ok(())
}
fn upsert(conn: &Connection, note: &serde_json::Value) -> Result<(), String> {
    let id = note
        .get("id")
        .and_then(|s| s.as_str())
        .ok_or("Missing id")?;
    valid_id(id)?;
    let payload = serde_json::to_string(note).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO notes(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",params![id,payload]).map_err(|e|e.to_string())?;
    Ok(())
}
#[tauri::command]
fn load_notes(state: tauri::State<Storage>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT payload FROM notes")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut notes = Vec::new();
    for row in rows {
        notes.push(
            serde_json::from_str(&row.map_err(|e| e.to_string())?).map_err(|e| e.to_string())?,
        );
    }
    Ok(notes)
}
#[tauri::command]
fn save_note(
    app: tauri::AppHandle,
    state: tauri::State<Storage>,
    note: serde_json::Value,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    upsert(&conn, &note)?;
    app.emit("notes-updated", note.get("id"))
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn remove_note(
    app: tauri::AppHandle,
    state: tauri::State<Storage>,
    id: String,
) -> Result<(), String> {
    valid_id(&id)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id=?1", [&id])
        .map_err(|e| e.to_string())?;
    app.emit("notes-updated", id).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
async fn open_note(app: tauri::AppHandle, id: String, pinned: bool) -> Result<(), String> {
    valid_id(&id)?;
    let label = format!("note-{}", id);
    if let Some(w) = app.get_webview_window(&label) {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
    } else {
        tauri::WebviewWindowBuilder::new(
            &app,
            label,
            tauri::WebviewUrl::App(format!("index.html?note={}", id).into()),
        )
        .title("Sticky Notes")
        .inner_size(390., 500.)
        .min_inner_size(320., 360.)
        .always_on_top(pinned)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn update_tray_menu(
    app: tauri::AppHandle,
    show_text: String,
    quit_text: String,
) -> Result<(), String> {
    plugins::system_tray::update_tray_menu(&app, &show_text, &quit_text)
}
#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0)
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            fs::create_dir_all(&dir)?;
            let db = database(&dir.join("sticky-notes.sqlite3")).map_err(std::io::Error::other)?;
            app.manage(Storage(Mutex::new(db)));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init());
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(plugins::system_tray::init());
    builder
        .invoke_handler(tauri::generate_handler![
            load_notes,
            save_note,
            remove_note,
            open_note,
            update_tray_menu,
            exit_app
        ])
        .run(tauri::generate_context!())
        .expect("error running Sticky Notes");
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn independent_notes_survive_updates_and_deletion() {
        let db = database(Path::new(":memory:")).unwrap();
        let a = "11111111-1111-4111-8111-111111111111";
        let b = "22222222-2222-4222-8222-222222222222";
        upsert(&db, &serde_json::json!({"id":a,"html":"中文便箋 📝"})).unwrap();
        upsert(&db, &serde_json::json!({"id":b,"html":"second"})).unwrap();
        upsert(&db, &serde_json::json!({"id":a,"html":"已更新"})).unwrap();
        let count: i64 = db
            .query_row("SELECT count(*) FROM notes", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 2);
        let payload: String = db
            .query_row("SELECT payload FROM notes WHERE id=?1", [a], |r| r.get(0))
            .unwrap();
        assert!(payload.contains("已更新"));
        db.execute("DELETE FROM notes WHERE id=?1", [a]).unwrap();
        let payload: String = db
            .query_row("SELECT payload FROM notes WHERE id=?1", [b], |r| r.get(0))
            .unwrap();
        assert!(payload.contains("second"));
    }
    #[test]
    fn rejects_invalid_ids() {
        assert!(valid_id("../../private").is_err());
        assert!(upsert(
            &database(Path::new(":memory:")).unwrap(),
            &serde_json::json!({"html":"missing id"})
        )
        .is_err());
    }
}
