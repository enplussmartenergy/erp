const delay = (ms=300) => new Promise(r=>setTimeout(r, ms));

export async function saveDraft(draft) {
  await delay();
  // 서버 저장이라고 가정
  return { ok:true, id: draft?.id || `R-${Date.now()}` };
}

export async function submitReport(payload) {
  await delay(500);
  return { ok:true, reportId: `R-${Date.now()}` };
}
