import { releaseAllUnsavedInput } from "./unsaved-input";

/**
 * A full page load, so the server sees the new session before rendering.
 * What was typed is done with, so the page doesn't ask before leaving.
 */
export function goTo(path: string) {
  releaseAllUnsavedInput();
  window.location.assign(path);
}
