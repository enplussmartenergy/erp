// src/features/report/pdf2/buildWaterTankPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ==== 한글 폰트 로더 ==== */
let _cached = { regular: null, bold: null };

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
  if (!_cached.regular) _cached.regular = await fetchFontB64("/fonts/NotoSansKR-Regular.ttf");
  if (!_cached.bold) _cached.bold = await fetchFontB64("/fonts/NotoSansKR-Bold.ttf");

  doc.addFileToVFS("NotoSansKR-Regular.ttf", _cached.regular);
  doc.addFileToVFS("NotoSansKR-Bold.ttf", _cached.bold);
  doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal", "Identity-H");
  doc.addFont("NotoSansKR-Bold.ttf", "NotoSansKR", "bold", "Identity-H");
}

function setKR(doc) {
  doc.setFont("NotoSansKR", "normal");
  doc.setTextColor(0);
  doc.setDrawColor(0);
}

/* ==================== 이미지 유틸 ==================== */
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
    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) return src.src ? await toDataUrlFlexible(src.src) : null;
    if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) return src.toDataURL("image/jpeg", 0.92);
    if (typeof src === "object" && !(src instanceof Blob)) return await toDataUrlFlexible(src.dataUrl || src.file || src.url || src.src);

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

    const w = img.width,
      h = img.height;
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

async function toUrls(schema, photoSlots) {
  return Promise.all(
    (schema || []).map(async (s) => {
      let v = photoSlots?.[s.id];
      if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

      let src = v;
      if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
      if (Array.isArray(v)) src = v[0];
      if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

      const raw = await toDataUrlFlexible(src);
      return raw ? await downscaleDataUrl(raw) : null;
    }),
  );
}

async function firstPhotoUrl(photoSlots, id) {
  let v = photoSlots?.[id];
  if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

  let src = v;
  if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
  if (Array.isArray(v)) src = v[0];
  if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

  let raw = await toDataUrlFlexible(src);

  if (!raw) {
    const any = Object.values(photoSlots || {}).flat();
    if (any.length) raw = await toDataUrlFlexible(any[0]?.dataUrl || any[0]?.file || any[0]?.url || any[0]?.src || any[0]);
  }

  return raw ? await downscaleDataUrl(raw, 2000, 0.9) : null;
}

/* ==================== 표/프레임 공통 ==================== */
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
      fontSize: 10.6,
      cellPadding: 2.6,
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

/* ==================== 사진 그리드 ==================== */
function photoGrid(doc, { title = "육안 점검", top = 32, rows = 2, cols = 2, gap = 5, captionH = 6, items = [], images = [], resultLines = [] }) {
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, SAFE.L + 2, top - 4);
  doc.setFont("NotoSansKR", "normal");

  const lines = Math.max(1, resultLines?.length ? resultLines.length : 1);
  const estResultH = 14 + lines * 6 + 2;
  const gridW = innerWidth(doc);
  const safeSlack = 10;
  let gridH = H - FRAME.B - 14 - top - estResultH - safeSlack;

  const GRID_MIN = rows === 3 ? 138 : 110;
  gridH = Math.max(GRID_MIN, Math.min(gridH, H - FRAME.B - top - 40));

  const cellW = (gridW - (cols - 1) * gap) / cols;
  const cellH = (gridH - (rows - 1) * gap) / rows;

  doc.setFontSize(9.6);
  for (let i = 0; i < rows * cols; i++) {
    const it = items[i];
    if (!it) break;

    const r = Math.floor(i / cols),
      c = i % cols;
    const x = SAFE.L + (cellW + gap) * c;
    const y = top + (cellH + gap) * r;

    doc.setDrawColor(160);
    doc.rect(x, y, cellW, cellH, "S");

    const pad = 2.2;
    const imgX = x + pad,
      imgY = y + pad;
    const imgW = cellW - pad * 2;
    const imgH = cellH - captionH - pad * 2;

    try {
      const dataUrl = images[i];
      if (dataUrl) addImageSafe(doc, dataUrl, imgX, imgY, imgW, imgH);
      else throw new Error();
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

/* ==================== 표지 페이지 ==================== */
function renderWaterTankCover(doc, { pageNo, totalPages, dateTxt, placeLabel, engineerName }) {
  pageChrome(doc, { title: "고·저수조 성능점검표", page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      head: [["점검자", "점검일자", "설치위치"]],
      body: [[engineerName || "", dateTxt || "", placeLabel || ""]],
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: "auto" },
      },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } },
  );

  const rows = [
    ["", "• 유지관리 점검표 확인", "○"],
    ["", "• 파손, 변형, 누수, 결로 상태", "○"],
    ["", "• 자동센서 동작 상태", "○"],
    ["", "• 수질검사(관계법령에 따른 청소확인증 등을 통해 청소상태 확인)", "○"],
  ];

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 4,
      head: [["구 분", "점검내용", "점검결과"]],
      body: rows,
      columnStyles: { 0: { cellWidth: 16 }, 2: { cellWidth: 18 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } },
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 2,
      head: [["조치사항", ""]],
      body: [["<조치필요사항>", "• 없음"]],
      columnStyles: { 0: { cellWidth: 26 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } },
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 2,
      head: [["추진사항 목록", ""]],
      body: [
        ["1.", "고·저수조 성능 점검 단계 및 기준"],
        ["2.", "고·저수조 육안 점검표"],
        ["3.", "고·저수조 측정 점검"],
        ["4.", "고·저수조 수질검사 성적서"],
      ],
      columnStyles: { 0: { cellWidth: 10 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } },
  );

  const guide =
    "1. 유지관리지침서와 기계설비 유지관리 및 성능점검 대상 현황표와의 적합여부를 참고하여 점검결과를 작성한다.\n" +
    "2. 점검결과에는 [적합 ○, 부적합 ×, 해당없음 /]을 표기한다.";

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 2,
      head: [["작성 방법", ""]],
      body: [["", guide]],
      columnStyles: {
        0: { cellWidth: 26, halign: "left", valign: "middle" },
        1: { cellWidth: "auto" },
      },
    },
    {
      styles: { fontSize: 9.6, cellPadding: 3.0, lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: [243, 244, 246], fontStyle: "bold" },
    },
  );

  footerNo(doc, pageNo);
}

/* ==================== 기준 + 현황 사진 ==================== */
async function renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto }) {
  pageChrome(doc, { title: "1. 고·저수조 성능 점검 단계 및 점검 기준", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 확인", "• 유지관리 점검표 확인\n• 파손, 변형, 누수, 결로 상태\n• 자동센서 동작 상태"],
      ["2. 점검 방법", "• 육안 점검: 현장 사진으로 정리\n• 측정 점검 항목은 현장 적용 기준에 따름"],
      ["3. 점검 기준", "• 관계 법령 및 지침에 따름"],
    ],
  });

  const baseY = doc.lastAutoTable?.finalY || FRAME.T + 6;
  const titleY = baseY + 8;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("현황 사진", SAFE.L, titleY);
  doc.setFont("NotoSansKR", "normal");

  const boxY = titleY + 2;
  const boxW = innerWidth(doc);
  const footerReserve = 18;
  const H = doc.internal.pageSize.getHeight();
  const boxH = Math.max(40, H - FRAME.B - footerReserve - boxY);

  doc.setLineWidth(0.6);
  doc.rect(SAFE.L, boxY, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const pad = 3.2,
    captionH = 7;
  const imgX = SAFE.L + pad,
    imgY = boxY + pad;
  const imgW = boxW - pad * 2;
  const imgH = boxH - captionH - pad * 2;

  try {
    if (criteriaPhoto) addImageSafe(doc, criteriaPhoto, imgX, imgY, imgW, imgH);
    else throw new Error();
  } catch {
    doc.setDrawColor(190);
    doc.setLineDash([1, 1], 0);
    doc.rect(imgX, imgY, imgW, imgH, "S");
    doc.setLineDash();
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text("이미지 없음", imgX + imgW / 2, imgY + imgH / 2, { align: "center", baseline: "middle" });
    setKR(doc);
  }

  const capY = boxY + boxH - captionH;
  doc.setDrawColor(210);
  doc.line(SAFE.L, capY, SAFE.L + boxW, capY);
  doc.setFontSize(9.6);
  doc.text("• 현황 사진", SAFE.L + pad, capY + 4.6);

  footerNo(doc, pageNo);
}

/* ==================== 🔥 Master 호환용 named export ==================== */
/**
 * buildMasterReportPdf.js가 named export로 import하는 경우 대비.
 * (에러: does not provide an export named 'renderWaterTank' 방지)
 *
 * 주의: “한 doc에 여러 설비를 이어붙이는” 구조면,
 * 페이지 addPage/페이지번호 부여는 마스터에서 통제하는 경우가 많아서
 * 여기선 표지 1페이지 렌더만 제공.
 */
export async function renderWaterTank(doc, { pageNo, totalPages, building, reportMeta, report } = {}) {
  await ensureFonts(doc);
  setKR(doc);

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const placeLabel = building?.place || building?.label || building?.name || "";
  const engineerName = reportMeta?.engineer || "";

  renderWaterTankCover(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel,
    engineerName,
  });

  return { nextPageNo: pageNo + 1 };
}

/* ==================== 메인: 고·저수조 PDF 빌더 ==================== */
export async function buildWaterTankPdf({ building, reportMeta, report, schema = [] } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  let pageNo = 0;
  const TOTAL = 7;

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const R = report?.waterTank ?? report?.photoOnly ?? report ?? {};
  const photoSlots = R.photoSlots ?? report?.photoOnly?.photoSlots ?? report?.photoSlots ?? {};
  const notes = R.sectionNotes ?? R.notes ?? report?.photoOnly?.sectionNotes ?? report?.notes ?? {};

  // #1 표지
  pageNo++;
  renderWaterTankCover(doc, {
    pageNo,
    totalPages: TOTAL,
    dateTxt,
    placeLabel: building?.place || building?.label || building?.name || "",
    engineerName: reportMeta?.engineer || "",
  });

  // #2 기준 + 현황사진
  pageNo++;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
  await renderCriteriaWithPhoto(doc, { pageNo, totalPages: TOTAL, criteriaPhoto });

  // #3~ 섹션(스키마 기반)
  for (let i = 0; i < (schema?.length || 0); i++) {
    const sec = schema[i];
    const urls = await toUrls(sec.slots, photoSlots);

    pageNo++;
    doc.addPage();
    await ensureFonts(doc);
    setKR(doc);

    pageChrome(doc, { title: sec.title, page: pageNo, total: TOTAL });

    const memo = notes?.[sec.id] || notes?.[sec.noteKey] || "";
    const resultLines = String(memo)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    photoGrid(doc, {
      title: "육안 점검",
      rows: sec.rows ?? 2,
      cols: sec.cols ?? 2,
      items: sec.slots,
      images: urls,
      resultLines,
    });

    footerNo(doc, pageNo);
  }

  return doc.output("blob");
}
