// src/features/report/pdf2/buildSanitaryFixturePdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sanitarySchema } from "../../../domain/schemas/sanitarySchema";

/* ───────────────── 공통 상수 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };
const BLACK = 0;

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ───────────────── 페이지 안전 ───────────────── */
function gotoLastPage(doc) {
  const n = doc.getNumberOfPages();
  if (n >= 1) doc.setPage(n);
}
function safeAddPage(doc) {
  gotoLastPage(doc);
  doc.addPage();
  gotoLastPage(doc);
}

/* ───────────────── 폰트 ───────────────── */
let _cachedFonts = { regular: null, bold: null };

async function fetchFontB64(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`폰트 로드 실패: ${url}`);
  const b = await r.blob();
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("base64 변환 실패"));
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.readAsDataURL(b);
  });
}

async function ensureFonts(doc) {
  if (!_cachedFonts.regular) _cachedFonts.regular = await fetchFontB64("/fonts/NotoSansKR-Regular.ttf");
  if (!_cachedFonts.bold) _cachedFonts.bold = await fetchFontB64("/fonts/NotoSansKR-Bold.ttf");

  doc.addFileToVFS("NotoSansKR-Regular.ttf", _cachedFonts.regular);
  doc.addFileToVFS("NotoSansKR-Bold.ttf", _cachedFonts.bold);
  doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal", "Identity-H");
  doc.addFont("NotoSansKR-Bold.ttf", "NotoSansKR", "bold", "Identity-H");
}

function setKR(doc) {
  doc.setFont("NotoSansKR", "normal");
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
}

/* ───────────────── 테이블 공통(옵션 병합 순서 fix) ───────────────── */
function headBodyTable(doc, opt = {}, styleOverride = {}) {
  const base = {
    styles: {
      font: "NotoSansKR",
      fontSize: 10.0,
      cellPadding: 2.2,
      textColor: BLACK,
      lineWidth: 0.2,
      overflow: "linebreak",
      cellWidth: "wrap",
      valign: "middle",
    },
    headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: BLACK },
    bodyStyles: { textColor: BLACK },
    theme: "grid",
    tableWidth: innerWidth(doc),
    margin: { left: SAFE.L, right: SAFE.R },
  };

  const merged = {
    ...base,
    styles: { ...base.styles, ...(styleOverride.styles || {}) },
    headStyles: { ...base.headStyles, ...(styleOverride.headStyles || {}) },
  };

  // ✅ opt가 최종 승리해야 함
  autoTable(doc, { ...merged, ...opt, margin: { left: SAFE.L, right: SAFE.R }, tableWidth: innerWidth(doc) });
}

/* ───────────────── 이미지 유틸 ───────────────── */
function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("이미지 변환 실패"));
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(blob);
  });
}

async function toDataUrlFlexible(src) {
  try {
    if (!src) return null;

    if (Array.isArray(src)) return await toDataUrlFlexible(src[0]);
    if (typeof FileList !== "undefined" && src instanceof FileList) return await toDataUrlFlexible(src[0]);

    if (typeof src === "object" && !(src instanceof Blob))
      return await toDataUrlFlexible(src.dataUrl || src.file || src.url || src.src);

    if (typeof src === "string" && src.startsWith("data:")) return src;

    if (typeof src === "string" && src.startsWith("blob:")) {
      return await new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          c.getContext("2d").drawImage(img, 0, 0);
          res(c.toDataURL("image/jpeg", 0.92));
        };
        img.onerror = rej;
        img.src = src;
      });
    }

    if (src instanceof Blob) {
      if (src.type && /image\/hei(c|f)/i.test(src.type)) throw new Error("HEIC_NOT_SUPPORTED");
      return await blobToDataUrl(src);
    }

    if (typeof src === "string") {
      const r = await fetch(src, { cache: "no-store" });
      if (!r.ok) return null;
      const b = await r.blob();
      if (b.type && /image\/hei(c|f)/i.test(b.type)) throw new Error("HEIC_NOT_SUPPORTED");
      return await blobToDataUrl(b);
    }

    return null;
  } catch {
    return null;
  }
}

async function downscaleDataUrl(dataUrl, maxSide = 2000, quality = 0.9) {
  try {
    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = dataUrl;
    });

    const w = img.width;
    const h = img.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    if (scale === 1) return dataUrl;

    const c = document.createElement("canvas");
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function mimeFromDataUrl(dataUrl = "") {
  const m = /^data:image\/([a-z0-9+.-]+);base64,/i.exec(dataUrl);
  const ext = (m?.[1] || "").toLowerCase();
  if (ext.includes("png")) return "PNG";
  if (ext.includes("jpg") || ext.includes("jpeg")) return "JPEG";
  if (ext.includes("webp")) return "WEBP";
  return undefined;
}

function addImageSafe(doc, dataUrl, x, y, w, h) {
  if (!dataUrl) throw new Error("no image");
  const fmt = mimeFromDataUrl(dataUrl);
  if (fmt) doc.addImage(dataUrl, fmt, x, y, w, h, undefined, "FAST");
  else doc.addImage(dataUrl, x, y, w, h, undefined, "FAST");
}

async function firstPhotoUrlStrict(photoSlots = {}, id) {
  const v = photoSlots?.[id];
  let src = v;
  if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
  if (Array.isArray(v)) src = v[0];
  if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

  const raw = await toDataUrlFlexible(src);
  if (!raw) return null;
  return await downscaleDataUrl(raw, 2000, 0.9);
}

async function toUrls(slotDefs = [], photoSlots = {}) {
  return Promise.all(
    (slotDefs || []).map(async (s) => {
      const u = await firstPhotoUrlStrict(photoSlots, s.id);
      return u ? await downscaleDataUrl(u) : null;
    })
  );
}

/* ───────────────── 크롬/푸터 ───────────────── */
function pageChrome(doc, { title, page, total }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(14.5);
  doc.text(title, FRAME.L + 8, 16);

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(10);
  doc.text(`페이지 ${page}/${total}`, W - (FRAME.R + 8), 16, { align: "right" });

  doc.setLineWidth(0.6);
  doc.rect(FRAME.L, FRAME.T, W - (FRAME.L + FRAME.R), H - (FRAME.T + FRAME.B), "S");
  doc.setLineWidth(0.2);
}

function footerNo(doc, pageNo) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);
  doc.setFontSize(9);
  doc.text(String(pageNo), W / 2, H - 10, { align: "center" });
}

/* ───────────────── 사진 그리드(2x2 + 결과표) ───────────────── */
function photoGrid(doc, { title, top = 32, items = [], images = [], resultLines = [] }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, SAFE.L + 2, top - 4);
  doc.setFont("NotoSansKR", "normal");

  const rows = 2;
  const cols = 2;
  const gap = 5;
  const captionH = 6;

  const MAX_LINES = 8;
  const trimmed = (resultLines || []).slice(0, MAX_LINES);
  const ellipsis = (resultLines || []).length > MAX_LINES ? "…(이하 생략)" : "";
  const finalLines = ellipsis ? [...trimmed, ellipsis] : trimmed;

  const lines = Math.max(1, finalLines.length || 1);
  const estResultH = 14 + lines * 6 + 2;

  const gridW = W - SAFE.L - SAFE.R;
  let gridH = H - FRAME.B - 14 - top - estResultH - 12;
  gridH = Math.max(120, Math.min(gridH, H - FRAME.B - top - 40));

  const cellW = (gridW - (cols - 1) * gap) / cols;
  const cellH = (gridH - (rows - 1) * gap) / rows;

  doc.setFontSize(9.6);
  for (let i = 0; i < rows * cols; i++) {
    const it = items[i];
    if (!it) break;

    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = SAFE.L + (cellW + gap) * c;
    const y = top + (cellH + gap) * r;

    doc.setDrawColor(160);
    doc.rect(x, y, cellW, cellH, "S");

    const pad = 2.2;
    const imgX = x + pad;
    const imgY = y + pad;
    const imgW = cellW - pad * 2;
    const imgH = cellH - captionH - pad * 2;

    try {
      const dataUrl = images[i];
      if (dataUrl) addImageSafe(doc, dataUrl, imgX, imgY, imgW, imgH);
      else throw new Error("no");
    } catch {
      doc.setLineDash([1, 1], 0);
      doc.rect(imgX, imgY, imgW, imgH, "S");
      doc.setLineDash();
      doc.setTextColor(120);
      doc.text("이미지 없음", imgX + imgW / 2, imgY + imgH / 2, { align: "center", baseline: "middle" });
      setKR(doc);
    }

    const capY = y + cellH - captionH;
    doc.text(`• ${it?.label || ""}`, x + 2.2, capY + 4.2);
  }

  headBodyTable(
    doc,
    {
      startY: top + gridH + 4,
      head: [["점검", "결과 사항"]],
      body: [["•", finalLines.length ? finalLines.join("\n") : "특이사항 없음"]],
      columnStyles: { 0: { cellWidth: 18 } },
      pageBreak: "avoid",
      rowPageBreak: "avoid",
    },
    {}
  );
}

/* ───────────────── PAGE1: 표지(간단) ───────────────── */
function renderCover(doc, { pageNo, totalPages, building, reportMeta, suffixNo = 1 }) {
  const place = building?.name || "";
  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  pageChrome(doc, { title: `위생기구설비 성능 점검표 #${suffixNo}`, page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 4,
    head: [["점검자", "점검일자", "설치위치", "비고"]],
    body: [[reportMeta?.engineer || "", dateTxt, place, ""]],
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 60 }, 3: { cellWidth: "auto" } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 22) + 2,
    head: [["구분", "점검내용", "점검결과"]],
    body: [
      ["육안", "• 위생기구 상태 및 트랩/수전/배수 상태 확인", "○"],
      ["측정", "• 수격 작동 / 소변기 / 양변기 / 수압 상태 확인", "○"],
      ["정리", "• 현장사진 및 결과사항 정리", "○"],
    ],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 26 } },
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 기준 + 현황사진 ───────────────── */
async function renderCriteria(doc, { pageNo, totalPages, photoSlots, suffixNo = 1 }) {
  pageChrome(doc, { title: `위생기구설비 점검 기준 #${suffixNo}`, page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검", "• 유지관리 점검표 확인\n• 수전/트랩/배수 상태 확인"],
      ["2. 측정 점검", "• 수격 작동/양변기/소변기/수압 확인"],
      ["3. 기록", "• 현황 사진 및 결과사항 작성"],
      ["4. 기준", "• 현장 상태 및 유지관리 기준 준수"],
    ],
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;

  const img = await firstPhotoUrlStrict(photoSlots, "criteria_photo");

  const W = innerWidth(doc);
  const H = doc.internal.pageSize.getHeight();
  const footerReserve = 18;
  const availH = H - FRAME.B - footerReserve - startY;
  const boxH = Math.max(90, Math.min(130, availH));

  doc.setLineWidth(0.6);
  doc.rect(SAFE.L, startY, W, boxH, "S");
  doc.setLineWidth(0.2);

  const pad = 3;
  const captionH = 7;

  const imgX = SAFE.L + pad;
  const imgY = startY + pad;
  const imgW = W - pad * 2;
  const imgH = boxH - pad * 2 - captionH;

  try {
    if (img) addImageSafe(doc, img, imgX, imgY, imgW, imgH);
    else throw new Error("no");
  } catch {
    doc.setDrawColor(190);
    doc.setLineDash([1, 1], 0);
    doc.rect(imgX, imgY, imgW, imgH, "S");
    doc.setLineDash();
    setKR(doc);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("현황 사진 없음", imgX + imgW / 2, imgY + imgH / 2, { align: "center", baseline: "middle" });
    setKR(doc);
  }

  const capY = startY + boxH - captionH;
  doc.setDrawColor(210);
  doc.line(SAFE.L, capY, SAFE.L + W, capY);
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("• 현황 사진", SAFE.L + pad, capY + 4.5);

  footerNo(doc, pageNo);
}

/* ───────────────── 섹션 정렬(안전) ───────────────── */
function orderSections(sections = []) {
  const orderIds = ["visual_page", "measure_page_1", "measure_page_2"];
  const map = new Map((sections || []).map((s) => [s.id, s]));
  const out = [];
  for (const id of orderIds) if (map.has(id)) out.push(map.get(id));
  for (const s of sections || []) if (!orderIds.includes(s.id)) out.push(s);
  return out;
}

/* ───────────────── ✅ 마스터용 렌더러 ───────────────── */
export async function renderSanitaryFixture(doc, { building, reportMeta, report, __page } = {}) {
  if (!doc) throw new Error("renderSanitaryFixture: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  // ✅ 스키마가 비면 무조건 여기서 터뜨려야 디버깅이 됨 (침묵 스킵 방지)
  const SECTIONS = orderSections(sanitarySchema?.sections || []);
  if (!SECTIONS.length) throw new Error("sanitarySchema.sections 가 비어있음 (import/export/경로 확인)");

  const totalPages = __page?.totalPages || 9999;
  let pageNo = __page?.pageNoStart || 1;

  // report 포인터/레거시 대응
  const v = report?.sanitaryFixture ?? report?.photoOnly ?? report ?? {};
  const photoSlots = v.photoSlots || v.photoOnly?.photoSlots || report?.photoSlots || {};
  const notes = v.notes || v.sectionNotes || report?.sectionNotes || {};

  // PAGE1
  gotoLastPage(doc);
  renderCover(doc, {
    pageNo,
    totalPages,
    building,
    reportMeta,
    suffixNo: reportMeta?.suffixNo || 1,
  });

  // PAGE2
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  await renderCriteria(doc, {
    pageNo,
    totalPages,
    photoSlots,
    suffixNo: reportMeta?.suffixNo || 1,
  });

  // PAGE3~
  for (const sec of SECTIONS) {
    pageNo += 1;
    safeAddPage(doc);
    await ensureFonts(doc);
    setKR(doc);

    pageChrome(doc, { title: sec.title, page: pageNo, total: totalPages });

    const urls = await toUrls(sec.slots || [], photoSlots);

    const noteKey = sec.noteKey || sec.note_key;
    const raw = notes?.[noteKey] ?? "";
    const resultLines = String(raw || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    photoGrid(doc, {
      title: sec.title.replace(/^(\d+\.\s*)?/, ""),
      items: sec.slots || [],
      images: urls,
      resultLines,
    });

    footerNo(doc, pageNo);
  }

  return pageNo;
}

/* ───────────────── 단독 빌더 ───────────────── */
export async function buildSanitaryFixturePdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  const total = 2 + (sanitarySchema?.sections?.length || 0);

  await renderSanitaryFixture(doc, {
    building,
    reportMeta,
    report,
    __page: { pageNoStart: 1, totalPages: total },
  });

  return doc.output("blob");
}
