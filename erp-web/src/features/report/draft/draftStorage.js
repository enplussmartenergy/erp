const KEY_PREFIX = "erp_report_draft_v1:";

// 초과 용량/순환참조 방지: JSON만 저장
export function saveDraft(draftKey, data) {
  try {
    const key = KEY_PREFIX + String(draftKey || "default");
    const payload = {
      savedAt: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "임시저장 실패" };
  }
}

export function loadDraft(draftKey) {
  try {
    const key = KEY_PREFIX + String(draftKey || "default");
    const raw = localStorage.getItem(key);
    if (!raw) return { ok: true, draft: null };
    const parsed = JSON.parse(raw);
    return { ok: true, draft: parsed };
  } catch (e) {
    return { ok: false, error: e?.message || "임시저장 불러오기 실패", draft: null };
  }
}

export function clearDraft(draftKey) {
  try {
    const key = KEY_PREFIX + String(draftKey || "default");
    localStorage.removeItem(key);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "임시저장 삭제 실패" };
  }
}
