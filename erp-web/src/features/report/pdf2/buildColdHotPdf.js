// src/features/report/pdf2/buildColdHotPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { coldHotSchema } from "../../../domain/schemas/coldHotSchema";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ───────────────── 한글 폰트 ───────────────── */
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
  doc.setTextColor(0);
  doc.setDrawColor(0);
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

    if (Array.isArray(src)) return await toDataUrlFlexible(src.find(Boolean));
    if (typeof FileList !== "undefined" && src instanceof FileList) return await toDataUrlFlexible(src[0]);

    // {url}, {downloadURL} 등 객체 대응
    if (typeof src === "object" && !(src instanceof Blob))
      return await toDataUrlFlexible(src.dataUrl || src.file || src.url || src.downloadURL || src.src);

    if (typeof src === "string" && src.startsWith("data:")) return src;

    if (typeof src === "string" && src.startsWith("blob:")) {
      const r = await fetch(src);
      if (!r.ok) return null;
      const b = await r.blob();
      return await toDataUrlFlexible(b);
    }

    if (src instanceof Blob) {
      if (src.type && /image\/hei(c|f)/i.test(src.type)) return null; // HEIC 스킵
      return await blobToDataUrl(src);
    }

    if (typeof src === "string") {
      if (src.startsWith("gs://")) return null; // fetch 불가
      const r = await fetch(src, { cache: "no-store" });
      if (!r.ok) return null;
      const b = await r.blob();
      if (b.type && /image\/hei(c|f)/i.test(b.type)) return null;
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

async function firstPhotoUrl(photoSlots = {}, id) {
  let v = photoSlots?.[id];
  if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

  let src = v;
  if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
  if (Array.isArray(v)) src = v[0];
  if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.downloadURL || src.src || src;

  let raw = await toDataUrlFlexible(src);
  if (!raw) return null;
  return await downscaleDataUrl(raw, 2000, 0.9);
}

async function firstPhotoUrlStrict(photoSlots = {}, id) {
  const p = await firstPhotoUrl(photoSlots, id);
  return p || null;
}

async function toUrls(slots = [], photoSlots = {}) {
  return Promise.all(
    slots.map(async (s) => {
      const raw = await firstPhotoUrl(photoSlots, s.id);
      return raw ? await downscaleDataUrl(raw) : null;
    })
  );
}

/* ───────────────── 프레임/테이블 공통 ───────────────── */
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

function headBodyTable(doc, opt, styleOverride) {
  const base = {
    styles: {
      font: "NotoSansKR",
      fontSize: 10.0,
      cellPadding: 2.2,
      textColor: 0,
      lineWidth: 0.2,
      overflow: "linebreak",
      cellWidth: "wrap",
      valign: "middle",
    },
    headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: 0 },
    bodyStyles: { textColor: 0 },
    theme: "grid",
    tableWidth: innerWidth(doc),
    margin: { left: SAFE.L, right: SAFE.R },
    pageBreak: "auto",
  };

  const merged = styleOverride
    ? {
        ...base,
        styles: { ...base.styles, ...(styleOverride.styles || {}) },
        headStyles: { ...base.headStyles, ...(styleOverride.headStyles || {}) },
      }
    : base;

  autoTable(doc, { ...opt, ...merged, margin: { left: SAFE.L, right: SAFE.R }, tableWidth: innerWidth(doc) });
}

/* ───────────────── 사진 그리드(2x2) ───────────────── */
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

  const lines = Math.max(1, resultLines.length || 1);
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

  headBodyTable(doc, {
    startY: top + gridH + 4,
    head: [["점검", "결과 사항"]],
    body: [["•", resultLines.length ? resultLines.join("\n") : "특이사항 없음"]],
    columnStyles: { 0: { cellWidth: 18 } },
    pageBreak: "avoid",
  });
}

/* ───────────────── PAGE1: 점검표(표지) ───────────────── */
function renderCoverPage(doc, { pageNo, totalPages, meta, place, rated, notes }) {
  pageChrome(doc, { title: "냉온수기 성능 점검표", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검자", "점검일자", "설치위치", "호기(#)", "제조사", "모델"]],
    body: [[meta.engineer || "", meta.dateTxt || "", place || "", rated.unitNo || "", rated.maker || "", rated.model || ""]],
    styles: { fontSize: 9.2, cellPadding: 2.0 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 34 },
      3: { cellWidth: 20 },
      4: { cellWidth: 22 },
      5: { cellWidth: "auto" },
    },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 28) + 2,
    head: [["구분", "점검내용", "점검결과"]],
    body: [
      ["점검항목", "• 성능 점검 단계 및 점검 기준(현황사진 포함)", "○"],
      ["", "• 육안 점검표 #1", "○"],
      ["", "• 육안 점검표 #2", "○"],
      ["", "• 육안 점검표 #3", "○"],
      ["", "• 측정 점검표 #1", "○"],
      ["", "• 측정 계산식(COP)", "○"],
      ["", "• 배기가스 측정(측정지)", "○"],
    ],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 26 } },
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 80) + 2,
    head: [["조치사항", "내용"]],
    body: [["조치사항", notes.actions || "• 없음"]],
    columnStyles: { 0: { cellWidth: 26 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
    pageBreak: "avoid",
  });

  // 하단 비고/작성방법 채우기(간단)
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const frameW = W - FRAME.L - FRAME.R;

  const noteTop = (doc.lastAutoTable?.finalY || FRAME.T + 110) + 2;
  const bottomY = H - FRAME.B;

  const noteH = 18;
  const writeH = Math.max(24, bottomY - (noteTop + noteH));

  doc.setLineWidth(0.6);
  doc.rect(FRAME.L, noteTop, frameW, noteH, "S");
  doc.setLineWidth(0.2);
  doc.line(FRAME.L + 26, noteTop, FRAME.L + 26, noteTop + noteH);
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("비   고", FRAME.L + 6, noteTop + 11);
  doc.setFontSize(9.2);
  doc.text((notes.remark || "• 없음").toString(), FRAME.L + 30, noteTop + 11);

  const writeTop = noteTop + noteH;
  doc.setLineWidth(0.6);
  doc.rect(FRAME.L, writeTop, frameW, writeH, "S");
  doc.setLineWidth(0.2);
  doc.line(FRAME.L, writeTop + 8, FRAME.L + frameW, writeTop + 8);
  doc.setFont("NotoSansKR", "bold");
  doc.text("작성 방법", FRAME.L + frameW / 2, writeTop + 5.6, { align: "center" });

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9.2);
  const lines = [
    "1. 점검 결과에는 [적합 ○, 조치필요 ×, 해당없음 /]을 표기한다.",
    "2. 현장 사진은 명확한 상태사진을 사용한다.",
    "3. 측정값 및 계산 결과(COP)를 함께 기록한다.",
  ];
  doc.text(doc.splitTextToSize(lines.join("\n"), frameW - 10), FRAME.L + 5, writeTop + 13);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 기준표 + 현황사진(1장 크게) ───────────────── */
function renderCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto }) {
  const H = doc.internal.pageSize.getHeight();
  pageChrome(doc, { title: "1. 냉온수기 성능 점검 단계 및 점검 기준", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검", "• 유지/누설/부식 상태\n• 계기/밸브/패널 상태\n• 배기가스 측정 상태 확인"],
      ["2. 측정 점검", "• 절대압/버너 상태\n• 유량/가스 사용량\n• 입출수 온도차"],
      ["3. 계산/판정", "• COP(정격/측정) 비교\n• 판정 및 권고사항 기록"],
    ],
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;

  const boxW = innerWidth(doc);
  const pad = 3;
  const captionH = 7;
  const footerReserve = 18;

  const boxH = Math.max(90, H - FRAME.B - footerReserve - startY);

  doc.setLineWidth(0.6);
  doc.rect(SAFE.L, startY, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const imgX = SAFE.L + pad;
  const imgY = startY + pad;
  const imgW = boxW - pad * 2;
  const imgH = boxH - pad * 2 - captionH;

  try {
    if (criteriaPhoto) addImageSafe(doc, criteriaPhoto, imgX, imgY, imgW, imgH);
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
  doc.line(SAFE.L, capY, SAFE.L + boxW, capY);
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("• 현황 사진(기준/현황)", SAFE.L + pad, capY + 4.5);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE6: COP 계산식 페이지 ───────────────── */
function renderCopPage(doc, { pageNo, totalPages, rated, measured, notes }) {
  pageChrome(doc, { title: "4. 냉온수기 측정 계산식(COP)", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["구분", "항목", "값"]],
    body: [
      ["정격", "냉수 정격유량 (m³/h)", rated.ratedFlow || ""],
      ["정격", "정격 COP", rated.ratedCop || ""],
      ["측정", "냉수유량 (m³/h)", measured.chilledFlow || ""],
      ["측정", "냉수 입출수 온도차 (℃)", measured.deltaT || ""],
      ["측정", "시간당 가스 사용량 (Nm³/h)", measured.gasPerHour || ""],
      ["측정", "측정 COP", measured.measuredCop || ""],
    ],
    styles: { fontSize: 9.4, cellPadding: 2.0 },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 70 }, 2: { cellWidth: "auto" } },
    pageBreak: "avoid",
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 60) + 8;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 계산/판정 메모", SAFE.L + 2, startY);

  headBodyTable(doc, {
    startY: startY + 4,
    head: [["내용"]],
    body: [[(notes.calc || "특이사항 없음").toString()]],
    styles: { fontSize: 9.6, cellPadding: 2.2 },
    pageBreak: "avoid",
  });

  footerNo(doc, pageNo);
}

/* ==================== ✅ 마스터용 렌더러 ==================== */
export async function renderColdHot(doc, { building, reportMeta, report, schema, __page } = {}) {
  if (!doc) throw new Error("renderColdHot: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const useSchema = schema || coldHotSchema;

  // ✅ 핵심: report 포인터(래핑/직접) 모두 대응
  const v = report?.coldHot ?? report ?? {};
  const rated = v.rated || {};
  const measured = v.measured || {};
  const notes = v.notes || {};
  const photoSlots = v.photoSlots || report?.photoSlots || {};

  const place = building?.name || rated.installLabel || v?.meta?.label || "";

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const totalPages = __page?.totalPages || 8;
  let pageNo = __page?.pageNoStart || 1;

  // PAGE1: 표지
  renderCoverPage(doc, {
    pageNo,
    totalPages,
    meta: { engineer: reportMeta?.engineer || "", dateTxt },
    place,
    rated,
    notes,
  });

  // PAGE2: 기준+현황사진
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  const criteriaPhoto = await firstPhotoUrlStrict(photoSlots, "criteria_photo");
  renderCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto });

  // PAGE3: 육안 #1
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "2. 냉온수기 육안 점검표 #1", page: pageNo, total: totalPages });
  {
    const sec = (useSchema.sections || []).find((s) => s.id === "ch_visual_1");
    const items = sec?.slots || [];
    const urls = await toUrls(items, photoSlots);
    const lines = String(notes.visual1 || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 점검 #1", items, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE4: 육안 #2
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "2. 냉온수기 육안 점검표 #2", page: pageNo, total: totalPages });
  {
    const sec = (useSchema.sections || []).find((s) => s.id === "ch_visual_2");
    const items = sec?.slots || [];
    const urls = await toUrls(items, photoSlots);
    const lines = String(notes.visual2 || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 점검 #2", items, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE5: 육안 #3
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "3. 냉온수기 육안 점검표 #3", page: pageNo, total: totalPages });
  {
    const sec = (useSchema.sections || []).find((s) => s.id === "ch_visual_3");
    const items = sec?.slots || [];
    const urls = await toUrls(items, photoSlots);
    const lines = String(notes.visual3 || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 점검 #3", items, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE6: 측정 #1
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "3. 냉온수기 측정 점검표 #1", page: pageNo, total: totalPages });
  {
    const sec = (useSchema.sections || []).find((s) => s.id === "ch_measure_1");
    const items = sec?.slots || [];
    const urls = await toUrls(items, photoSlots);
    const lines = String(notes.measure1 || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "측정 점검 #1", items, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE7: COP 계산
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  renderCopPage(doc, { pageNo, totalPages, rated, measured, notes });

  // PAGE8: 배기가스 측정지
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "5. 냉온수기 배기가스 측정(기준/측정지)", page: pageNo, total: totalPages });
  {
    const sheet = await firstPhotoUrl(photoSlots, "ch_exhaust_sheet");
    const H = doc.internal.pageSize.getHeight();
    const boxW = innerWidth(doc);
    const top = FRAME.T + 10;
    const boxH = Math.max(110, H - FRAME.B - 18 - top - 40);

    doc.setLineWidth(0.6);
    doc.rect(SAFE.L, top, boxW, boxH, "S");
    doc.setLineWidth(0.2);

    const pad = 3;
    const captionH = 7;
    const imgX = SAFE.L + pad;
    const imgY = top + pad;
    const imgW = boxW - pad * 2;
    const imgH = boxH - pad * 2 - captionH;

    try {
      if (sheet) addImageSafe(doc, sheet, imgX, imgY, imgW, imgH);
      else throw new Error("no");
    } catch {
      doc.setDrawColor(190);
      doc.setLineDash([1, 1], 0);
      doc.rect(imgX, imgY, imgW, imgH, "S");
      doc.setLineDash();
      setKR(doc);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text("측정지 이미지 없음", imgX + imgW / 2, imgY + imgH / 2, { align: "center", baseline: "middle" });
      setKR(doc);
    }

    const capY = top + boxH - captionH;
    doc.setDrawColor(210);
    doc.line(SAFE.L, capY, SAFE.L + boxW, capY);
    setKR(doc);
    doc.setFontSize(9.6);
    doc.text("• 배기가스 측정지(기준/측정지)", SAFE.L + pad, capY + 4.5);

    headBodyTable(doc, {
      startY: top + boxH + 6,
      head: [["메모"]],
      body: [[(notes.exhaust || "특이사항 없음").toString()]],
      styles: { fontSize: 9.6, cellPadding: 2.2 },
      pageBreak: "avoid",
    });

    footerNo(doc, pageNo);
  }

  return pageNo;
}

/* ───────────────── 단독 빌더 ───────────────── */
export async function buildColdHotPdf({ building, reportMeta, report, schema } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  await ensureFonts(doc);
  setKR(doc);

  await renderColdHot(doc, {
    building,
    reportMeta,
    report,
    schema: schema || coldHotSchema,
    __page: { pageNoStart: 1, totalPages: 8 },
  });

  return doc.output("blob");
}
