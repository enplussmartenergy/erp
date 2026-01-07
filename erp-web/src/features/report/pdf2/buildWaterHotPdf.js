// src/features/report/pdf2/buildWaterHotPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { waterHotSchema } from "../../../domain/schemas/waterHot"; // ✅ 경로 맞춰

/* ───────────────── 공통 상수 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

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
  doc.setTextColor(0);
  doc.setDrawColor(0);
}

/* ───────────────── 유틸 ───────────────── */
function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

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

async function firstPhotoUrl(photoSlots = {}, id) {
  let v = photoSlots?.[id];
  if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

  let src = v;
  if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
  if (Array.isArray(v)) src = v[0];
  if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

  let raw = await toDataUrlFlexible(src);
  if (!raw) return null;
  return await downscaleDataUrl(raw, 2000, 0.9);
}

async function toUrls(slotDefs = [], photoSlots = {}) {
  return Promise.all(
    (slotDefs || []).map(async (s) => {
      const dataUrl = await firstPhotoUrl(photoSlots, s.id);
      return dataUrl ? await downscaleDataUrl(dataUrl) : null;
    })
  );
}

/* ───────────────── 테이블 공통 ───────────────── */
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

/* ───────────────── PAGE1: 점검표(간단형) ───────────────── */
function renderChecklistPage(doc, { pageNo, totalPages, building, reportMeta, suffixNo = 1 }) {
  const place = building?.name || "";
  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  pageChrome(doc, { title: `급수·급탕 설비 성능 점검표 #${suffixNo}`, page: pageNo, total: totalPages });

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
      ["육안", "• 누수/부식/고정 상태\n• 보온/단열 상태\n• 계기/제어반 상태", "○"],
      ["측정", "• 유량/압력/온도/전류 등 측정값 확인", "○"],
      ["정리", "• 현장사진 및 결과사항 정리", "○"],
    ],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 26 } },
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const frameW = W - FRAME.L - FRAME.R;

  const top = (doc.lastAutoTable?.finalY || FRAME.T + 70) + 4;
  const bottomY = H - FRAME.B;
  const boxH = Math.max(28, bottomY - top);

  doc.setLineWidth(0.6);
  doc.rect(FRAME.L, top, frameW, boxH, "S");
  doc.setLineWidth(0.2);

  doc.line(FRAME.L, top + 8, FRAME.L + frameW, top + 8);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10);
  doc.text("작성 방법", FRAME.L + frameW / 2, top + 5.6, { align: "center" });

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9.2);
  const lines = [
    "1. 급수·급탕 설비의 육안 점검 항목을 확인한다.",
    "2. 측정값(유량/압력/온도/전류 등)을 현장 데이터로 기록한다.",
    "3. 현황 사진은 명확한 상태 사진을 사용한다.",
    "4. 점검결과는 [적합 ○, 조치필요 ×, 해당없음 /]으로 표기한다.",
  ];
  const inner = doc.splitTextToSize(lines.join("\n"), frameW - 10);
  doc.text(inner, FRAME.L + 5, top + 13);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 기준 + 현황사진(1장 크게) ───────────────── */
async function renderCriteriaPage(doc, { pageNo, totalPages, photoSlots, criteriaSlotId, suffixNo = 1 }) {
  pageChrome(doc, { title: `급수·급탕 설비 점검 기준 #${suffixNo}`, page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검", "• 누수/부식/고정/보온 상태 확인\n• 계기/제어반 상태 확인"],
      ["2. 측정 점검", "• 유량/압력/온도/전류 등 측정값 확인"],
      ["3. 점검 방법", "• 현장 사진으로 정리\n• 점검기기로 측정"],
      ["4. 점검 기준", "• 유지관리 지침서 및 현장 측정값 기준"],
    ],
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;

  // ✅ criteria_photo가 있으면 그걸, 없으면 첫 섹션 첫 슬롯을 fallback
  const img = await firstPhotoUrl(photoSlots, criteriaSlotId);

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

/* ───────────────── ✅ 마스터용 렌더러 ───────────────── */
export async function renderWaterHot(doc, { building, reportMeta, report, __page } = {}) {
  if (!doc) throw new Error("renderWaterHot: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const totalPages = __page?.totalPages || 9999;
  let pageNo = __page?.pageNoStart || 1;

  // report 래핑 대응
  const v = report?.waterHot ?? report?.photoOnly ?? report ?? {};
  const photoSlots = v.photoSlots || report?.photoSlots || {};
  const notes = v.sectionNotes || v.notes || {};

  // ✅ 섹션은 무조건 스키마 기준
  const SECTIONS = waterHotSchema?.sections || [];

  // ✅ PAGE2 현황사진 슬롯: 스키마에 criteria_photo가 있으면 사용, 아니면 첫 섹션 첫 슬롯 fallback
  const criteriaSlotId =
    (photoSlots && Object.prototype.hasOwnProperty.call(photoSlots, "criteria_photo") && "criteria_photo") ||
    "criteria_photo" ||
    (SECTIONS?.[0]?.slots?.[0]?.id || "");

  // PAGE1
  renderChecklistPage(doc, {
    pageNo,
    totalPages,
    building,
    reportMeta,
    suffixNo: reportMeta?.suffixNo || 1,
  });

  // PAGE2
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  await renderCriteriaPage(doc, {
    pageNo,
    totalPages,
    photoSlots,
    criteriaSlotId,
    suffixNo: reportMeta?.suffixNo || 1,
  });

  // PAGE3~ : 스키마 섹션들(2x2)
  for (const sec of SECTIONS) {
    pageNo += 1;
    doc.addPage();
    await ensureFonts(doc);
    setKR(doc);

    pageChrome(doc, { title: sec.title, page: pageNo, total: totalPages });

    const urls = await toUrls(sec.slots || [], photoSlots);

    const noteKey = sec.noteKey || sec.note_key; // 혹시 레거시
    const rawNote = notes?.[noteKey] ?? "";
    const resultLines = String(rawNote || "특이사항 없음")
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
export async function buildWaterHotPdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  const total = 2 + (waterHotSchema?.sections?.length || 0);

  await renderWaterHot(doc, {
    building,
    reportMeta,
    report,
    __page: { pageNoStart: 1, totalPages: total },
  });

  return doc.output("blob");
}
