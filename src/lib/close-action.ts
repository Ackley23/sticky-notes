import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export type CloseActionPreference = "ask" | "minimize" | "exit";

export const CLOSE_ACTION_PREFERENCE_KEY = "close-window-action";

export function getCloseActionPreference(): CloseActionPreference {
  const val = localStorage.getItem(CLOSE_ACTION_PREFERENCE_KEY);
  if (val === "minimize" || val === "exit" || val === "ask") {
    return val;
  }
  return "ask";
}

export function setCloseActionPreference(action: CloseActionPreference): void {
  localStorage.setItem(CLOSE_ACTION_PREFERENCE_KEY, action);
}

export async function executeCloseAction(action: "minimize" | "exit"): Promise<void> {
  if (action === "exit") {
    try {
      await invoke("exit_app");
    } catch (error) {
      console.error("Failed to exit app:", error);
    }
  } else {
    try {
      const currentWindow = getCurrentWebviewWindow();
      await currentWindow.hide();
    } catch (error) {
      console.error("Failed to hide window:", error);
    }
  }
}
