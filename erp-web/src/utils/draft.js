const KEY = "report:draft";

export function loadDraft() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}
export function saveDraftLocally(d) {
  localStorage.setItem(KEY, JSON.stringify(d || {}));
}
export function clearDraft() {
  localStorage.removeItem(KEY);
}
