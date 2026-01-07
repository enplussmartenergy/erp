// src/features/report/pdf2/buildCoolTowerPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

// ✅ 전부 흑백 고정
const BLACK = [0, 0, 0];

const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const fmt2 = (x) => (Number.isFinite(+x) ? (+x).toFixed(2) : "");

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

  const raw = await toDataUrlFlexible(src);
  if (!raw) return null;
  return await downscaleDataUrl(raw, 2000, 0.9);
}

async function toUrls(items = [], photoSlots = {}) {
  return Promise.all(
    items.map(async (it) => {
      const raw = await firstPhotoUrl(photoSlots, it.id);
      return raw ? await downscaleDataUrl(raw, 2000, 0.9) : null;
    }),
  );
}

/* ───────────────── 프레임/표 공통 ───────────────── */
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
      fontSize: 9.8,
      cellPadding: 2.0,
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
        bodyStyles: { ...base.bodyStyles, ...(styleOverride.bodyStyles || {}) },
      }
    : base;

  autoTable(doc, {
    ...opt,
    ...merged,
    margin: { left: SAFE.L, right: SAFE.R },
    tableWidth: innerWidth(doc),
  });
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
  gridH = Math.max(140, Math.min(gridH, H - FRAME.B - top - 40));

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

/* ───────────────── 계산 ───────────────── */
function ratioPercent(measured, rated) {
  const m = N(measured);
  const r = N(rated);
  if (r <= 0) return "";
  return fmt2((m / r) * 100);
}
function loadRatePercent(measKw, ratedKw) {
  const m = N(measKw);
  const r = N(ratedKw);
  if (r <= 0) return "";
  return fmt2((m / r) * 100);
}

/* ───────────────── 슬롯(폼/스키마와 동일 id) ───────────────── */
const P3_VISUAL_1 = [
  { id: "ct_maint_table", label: "유지관리 점검표" },
  { id: "ct_rust_state", label: "노후 및 부식 상태" },
  { id: "ct_fill_state", label: "냉각탑 충진물 상태" },
  { id: "ct_water_basin", label: "냉각수 수조 및 분출 작동 상태" },
];

const P4_VISUAL_2 = [
  { id: "ct_strainer", label: "살수 장치 상태" },
  { id: "ct_fan_rotation", label: "송풍기 회전 상태" },
  { id: "ct_anchor_state", label: "냉각탑 고정 상태" },
  { id: "ct_motor_noise", label: "송풍기 모터 소음 측정" },
];

const P5_MEASURE = [
  { id: "ct_flow_measure", label: "냉각수 유량 측정" },
  { id: "ct_flow_value", label: "냉각수 유량 측정값" },
  { id: "ct_voltage", label: "냉각수 송풍기 전압 측정" },
  { id: "ct_current", label: "냉각수 송풍기 전류 측정" },
];

/* ───────────────── PAGE1: 점검표 ───────────────── */
function renderChecklistPage(doc, { pageNo, totalPages, meta, place, equipLabel = "" }) {
  pageChrome(doc, { title: "냉각탑 성능 점검표 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 4,
    head: [["점검자", "", "점검일자", "설치위치", ""]],
    body: [[meta.engineer || "", "", meta.dateTxt || "", place || "", equipLabel || ""]],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: "auto" },
    },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 22) + 2,
    head: [["구분", "점검내용", "점검결과"]],
    body: [
      ["점검항목", "• 유지관리 점검표 확인", "○"],
      ["", "• 냉각탑 수조 및 분출 상태", "○"],
      ["", "• 노후 및 부식 상태", "○"],
      ["", "• 살수 장치 상태", "○"],
      ["", "• 송풍기 회전 상태", "○"],
      ["", "• 레지오넬라균 관리(수질검사 등)", "○"],
      ["", "• 냉각수 유량 상태", "○"],
      ["", "• 충진물 상태", "○"],
      ["", "• 송풍기 소음 상태", "○"],
      ["", "• 부하 전류 상태", "○"],
    ],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 26 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 95) + 2,
    head: [["조치사항", "내용"]],
    body: [["<미조치사항>", "• 없음"], ["<조치필요사항>", "• 없음"]],
    columnStyles: { 0: { cellWidth: 26 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 115) + 2,
    head: [["추진사항 목록", "내용"]],
    body: [
      ["1.", "냉각탑 성능 점검 단계 및 기준"],
      ["2.", "냉각탑 육안 점검 #1"],
      ["3.", "냉각탑 육안 점검 #2"],
      ["4.", "냉각탑 측정 점검"],
      ["5.", "냉각탑 측정 계산식"],
    ],
    columnStyles: { 0: { cellWidth: 16 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  // 하단 채우기(비고/작성방법)
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const frameW = W - FRAME.L - FRAME.R;

  const noteTop = (doc.lastAutoTable?.finalY || FRAME.T + 140) + 2;
  const bottomY = H - FRAME.B;

  const noteH = 14;
  const writeH = Math.max(18, bottomY - (noteTop + noteH));

  doc.setLineWidth(0.6);
  doc.rect(FRAME.L, noteTop, frameW, noteH, "S");
  doc.setLineWidth(0.2);
  doc.line(FRAME.L + 26, noteTop, FRAME.L + 26, noteTop + noteH);
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("비   고", FRAME.L + 6, noteTop + 9);

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
    "1. 유지관리지침서와 기계설비 유지관리 및 성능 점검 대상 현황표의 적합 여부를 참고하여 점검결과를 작성한다.",
    "2. 점검결과에는 [적합 ○, 부적합 ×, 해당없음 /]을 표기한다.",
    "3. 현장사진에는 명확한 상태사진과 측정데이터를 포함하여 작성한다.",
    "4. 전동기 소음 및 진동범위 내에서 점검을 실시한다.",
    "5. 냉각탑은 수질/위생(레지오넬라균 등) 관리가 중요하므로 주기 점검을 실시한다.",
  ];
  doc.text(doc.splitTextToSize(lines.join("\n"), frameW - 10), FRAME.L + 5, writeTop + 13);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 기준 + 현황사진 ───────────────── */
function renderCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto }) {
  const H = doc.internal.pageSize.getHeight();
  pageChrome(doc, { title: "1. 냉각탑 성능 점검 단계 및 점검 기준 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검\n(외관 확인)", "• 유지 관리 점검표\n• 수조/살수/충진물 상태\n• 노후 및 부식 상태\n• 송풍기 회전 상태\n• 소음 상태"],
      ["2. 측정 점검\n(일반 측정)", "• 유량/전력 측정\n• 전압/전류 측정"],
      ["3. 점검 방법\n(육안/측정)", "• 현장 사진으로 정리\n• 측정기로 측정"],
      ["4. 점검 기준\n(육안/측정)", "• 국토부 별지 서식 점검표 기준\n• 서식 기준에 의한 측정장비 활용"],
    ],
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  const baseY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;
  const boxW = innerWidth(doc);
  const pad = 3;
  const captionH = 7;
  const footerReserve = 18;
  const boxH = Math.max(78, H - FRAME.B - footerReserve - baseY);

  doc.setLineWidth(0.6);
  doc.rect(SAFE.L, baseY, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const imgX = SAFE.L + pad;
  const imgY = baseY + pad;
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

  const capY = baseY + boxH - captionH;
  doc.setDrawColor(210);
  doc.line(SAFE.L, capY, SAFE.L + boxW, capY);
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("• 현황 사진", SAFE.L + pad, capY + 4.5);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE6: 계산식 (✅ 전부 검정) ───────────────── */
function renderCalcPage(doc, { pageNo, totalPages, meta, place, equipLabel, data, memo }) {
  pageChrome(doc, { title: "5. 냉각탑 측정 계산식 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검자", "", "점검일자", "설치위치", ""]],
    body: [[meta.engineer || "", "", meta.dateTxt || "", place || "", equipLabel || ""]],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: "auto" },
    },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
  });

  const y0 = (doc.lastAutoTable?.finalY || FRAME.T + 20) + 6;

  // ✅ 입력값/결과값 모두 검정
  const cell = (v, extra = {}) => ({
    content: v ?? "",
    styles: { textColor: BLACK, fontStyle: "normal", ...extra },
  });

  // 정격
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 정격 현황", SAFE.L + 2, y0);

  headBodyTable(doc, {
    startY: y0 + 4,
    head: [["구분", "형식", "정격 유량\n[m³/h]", "정격 전력\n[kW]", "제조사"]],
    body: [[
      cell(data.ratedKind),
      cell(data.ratedType),
      cell(data.ratedFlow, { halign: "center" }),
      cell(data.ratedPower, { halign: "center" }),
      cell(data.ratedMaker),
    ]],
    styles: { fontSize: 9.0, cellPadding: 1.8 },
    pageBreak: "avoid",
  });

  // 점검
  const y1 = (doc.lastAutoTable?.finalY || y0 + 18) + 8;
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 점검 현황", SAFE.L + 2, y1);

  headBodyTable(doc, {
    startY: y1 + 4,
    head: [["구분", "측정 유량\n[m³/h]", "정격 대비\n유량[%]", "측정 전력\n[kW]", "부하율[%]"]],
    body: [[
      cell("냉각탑", { halign: "center" }),
      cell(data.measFlow, { halign: "center" }),
      cell(data.flowRatio, { halign: "center" }),
      cell(data.measPower, { halign: "center" }),
      cell(data.loadRate, { halign: "center" }),
    ]],
    styles: { fontSize: 9.0, cellPadding: 1.8 },
    pageBreak: "avoid",
  });

  // 설명 박스
  const y2 = (doc.lastAutoTable?.finalY || y1 + 18) + 6;
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9.6);

  const desc = [
    `• 부하율(%) = 측정 소비전력[kW] ÷ 정격 소비전력[kW] × 100 = ${data.loadRate || ""} (%)`,
    `• 정격 대비 유량(%) = 측정 유량[m³/h] ÷ 정격 유량[m³/h] × 100 = ${data.flowRatio || ""} (%)`,
    "",
    "• 냉각탑은 옥외 설비로서 소음/수질오염/미생물 비산(레지오넬라균 등)에 유의하여 운전한다.",
    "  주기적인 수질검사, 청소 및 점검을 통해 안전하고 효율적인 설비 운영이 필요하다.",
    memo ? `• 메모: ${memo}` : "",
  ].filter(Boolean);

  const boxW = innerWidth(doc);
  const boxX = SAFE.L;
  const boxTop = y2;
  const boxH = 92;

  doc.setLineWidth(0.6);
  doc.rect(boxX, boxTop, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  // ✅ 텍스트도 검정 고정
  setKR(doc);
  doc.text(doc.splitTextToSize(desc.join("\n"), boxW - 8), boxX + 4, boxTop + 8);

  footerNo(doc, pageNo);
}

/* ───────────────── 통합용 렌더러 ─────────────────
   - 외부에서 doc.addPage() 한 뒤에 호출된다고 가정
   - 내부에서 필요한 만큼 doc.addPage() 하며 6페이지를 그린다
*/
export async function renderCoolTower(doc, { building, reportMeta, report } = {}) {
  await ensureFonts(doc);
  setKR(doc);

  const TOTAL = 6;
  let pageNo = 0;

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  // report shape
  const v = report?.coolTower || report || {};
  const rated = v.rated || {};
  const measured = v.measured || {};
  const notes = v.notes || {};
  const photoSlots = v.photoSlots || {};

  const place = building?.name || v?.meta?.label || "";
  const equipLabel = rated?.kind || v?.meta?.label2 || v?.meta?.subLabel || "냉각탑 #1";

  // 계산
  const ratedFlow = rated.flow ?? "";
  const ratedPower = rated.power ?? "";
  const measFlow = measured.flow ?? "";
  const measPower = measured.power ?? "";

  const flowRatio = ratioPercent(measFlow, ratedFlow);
  const loadRate = loadRatePercent(measPower, ratedPower);

  // PAGE 1 (현재 페이지에 그린다)
  pageNo++;
  renderChecklistPage(doc, {
    pageNo,
    totalPages: TOTAL,
    meta: { engineer: reportMeta?.engineer || "", dateTxt },
    place,
    equipLabel,
  });

  // PAGE 2
  pageNo++;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
    renderCriteriaPage(doc, { pageNo, totalPages: TOTAL, criteriaPhoto });
  }

  // PAGE 3
  pageNo++;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: "2. 냉각탑 육안 점검 #1", page: pageNo, total: TOTAL });
  {
    const urls = await toUrls(P3_VISUAL_1, photoSlots);
    const lines = (notes.visual1 || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 점검", items: P3_VISUAL_1, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE 4
  pageNo++;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: "3. 냉각탑 육안 점검 #2", page: pageNo, total: TOTAL });
  {
    const urls = await toUrls(P4_VISUAL_2, photoSlots);
    const lines = (notes.visual2 || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 점검", items: P4_VISUAL_2, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE 5
  pageNo++;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: "4. 냉각탑 측정 점검", page: pageNo, total: TOTAL });
  {
    const urls = await toUrls(P5_MEASURE, photoSlots);
    const lines = (notes.measure || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 및 측정 점검", items: P5_MEASURE, images: urls, resultLines: lines });
    footerNo(doc, pageNo);
  }

  // PAGE 6
  pageNo++;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  renderCalcPage(doc, {
    pageNo,
    totalPages: TOTAL,
    meta: { engineer: reportMeta?.engineer || "", dateTxt },
    place,
    equipLabel,
    memo: notes.calc || "",
    data: {
      ratedKind: rated.kind ?? "냉각탑",
      ratedType: rated.type ?? "",
      ratedFlow,
      ratedPower,
      ratedMaker: rated.maker ?? "",
      measFlow,
      measPower,
      flowRatio: flowRatio || "",
      loadRate: loadRate || "",
    },
  });
}

/* ───────────────── 단독 PDF 빌더(기존 호환) ───────────────── */
export default async function buildCoolTowerPdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  // 단독은 1페이지부터 시작
  await renderCoolTower(doc, { building, reportMeta, report });

  return doc.output("blob");
}

// (선택) named export도 유지하고 싶으면:
export { buildCoolTowerPdf };
