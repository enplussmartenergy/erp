// src/features/report/pdf2/buildPumpChwPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

// ✅ 올블랙 고정
const BLACK = 0;

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

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
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
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
async function toUrls(schema = [], photoSlots = {}) {
  return Promise.all(
    schema.map(async (s) => {
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
      fontSize: 9.8,
      cellPadding: 2.0,
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
    margin: opt?.margin ? opt.margin : { left: SAFE.L, right: SAFE.R },
    tableWidth: opt?.tableWidth ? opt.tableWidth : innerWidth(doc),
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

/* ───────────────── 성능(효율) 계산 ───────────────── */
function calcMeasuredEff({ sg, H, Q, P }) {
  const _sg = N(sg) || 1;
  const _H = N(H);
  const _Q = N(Q);
  const _P = N(P);
  if (_H <= 0 || _Q <= 0 || _P <= 0) return 0;
  return (_sg * _H * _Q) / (367 * _P) * 100;
}

/* ───────────────── 기준 표(7페이지) ───────────────── */
const VIB_GRADE_TABLE = [
  ["진동 기준", "15kW이하", "15~75kW이하"],
  ["A", "0.28~0.71", "0.28~1.12"],
  ["B", "0.71~1.8", "1.12~2.8"],
  ["C", "1.8~4.5", "2.8~7.1"],
  ["D", "4.5이상", "7.1이상"],
];

const MOTOR_NOISE_TABLE = [
  ["정격출력[kW]", "2극", "4극", "6극", "8극"],
  ["30", "91", "84", "81", "77"],
  ["37", "91", "85", "81", "77"],
  ["45", "93", "86", "83", "79"],
  ["55", "93", "86", "85", "79"],
  ["75", "94", "89", "85", "82"],
  ["90", "94", "89", "85", "82"],
  ["110", "96", "89", "86", "82"],
  ["132", "96", "92", "86", "-"],
  ["160", "96", "92", "86", "-"],
  ["200", "96", "92", "86", "-"],
];

/* ───────────────── 소음/진동 기준 자동 계산 유틸 ───────────────── */
function pickNoiseBaseDb(motorKw, pole = 4) {
  const kw = N(motorKw);
  const p = String(pole || 4);
  const colIdx = p === "2" ? 1 : p === "6" ? 3 : p === "8" ? 4 : 2; // 4극 default

  const rows = MOTOR_NOISE_TABLE.slice(1).map((r) => ({
    kw: N(r[0]),
    val: r[colIdx] === "-" ? null : N(r[colIdx]),
  }));

  let hit = rows.find((x) => kw <= x.kw && x.val != null);
  if (!hit) hit = [...rows].reverse().find((x) => x.val != null) || rows[rows.length - 1];

  return hit?.val || 0;
}

function calcNoiseStdText(motorKw, pole = 4) {
  const base = pickNoiseBaseDb(motorKw, pole);
  if (!base) return "";
  const min = Math.round(base - 10);
  const max = Math.round(base + 10);
  return `${min}~${max}`;
}

function calcNoiseState(motorKw, pole, noiseDb) {
  const base = pickNoiseBaseDb(motorKw, pole);
  if (!base || !String(noiseDb ?? "").trim()) return "";
  const v = N(noiseDb);
  const min = base - 10;
  const max = base + 10;
  return v >= min && v <= max ? "양호" : "불량";
}

function vibBandByKw(motorKw) {
  const kw = N(motorKw);
  if (kw <= 15) {
    return {
      A: [0.28, 0.71],
      B: [0.71, 1.8],
      C: [1.8, 4.5],
      D: [4.5, Infinity],
      stdTextA: "0.28~0.71",
      isHigh: false,
    };
  }
  return {
    A: [0.28, 1.12],
    B: [1.12, 2.8],
    C: [2.8, 7.1],
    D: [7.1, Infinity],
    stdTextA: "0.28~1.12",
    isHigh: true,
  };
}

function calcVibStdText(motorKw) {
  return vibBandByKw(motorKw).stdTextA;
}

function calcVibGrade(motorKw, vibVal) {
  if (!String(vibVal ?? "").trim()) return "";
  const v = N(vibVal);
  const b = vibBandByKw(motorKw);

  const inRange = (x, a, z) => x >= a && x <= z;

  if (inRange(v, b.A[0], b.A[1])) return "A";
  if (inRange(v, b.B[0], b.B[1])) return "B";
  if (inRange(v, b.C[0], b.C[1])) return "C";
  if (v >= b.D[0]) return "D";
  return "";
}

/* ───────────────── PAGE1: 점검표 ───────────────── */
function renderChecklistPage(doc, { pageNo, totalPages, dateTxt, place, engineer, equipLabel = "", remark }) {
  pageChrome(doc, { title: "펌프(냉수) 성능 점검표 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 4,
    head: [["점검자", "총설원", "점검일자", "설치위치", ""]],
    body: [[engineer || "", "", dateTxt || "", place || "", equipLabel || ""]],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 35 },
      4: { cellWidth: "auto" },
    },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 22) + 2,
    head: [["구분", "점검내용", "점검결과"]],
    body: [
      ["점검항목", "• 유지 관리 점검표", "○"],
      ["", "• 샤프트 및 패킹 마모 상태", "○"],
      ["", "• 이상 소음 및 진동 상태", "○"],
      ["", "• 베어링 및 모터 등 과열 상태", "○"],
      ["", "• 베이스 앵커볼트 노후 및 풀림 상태", "○"],
      ["", "• 이상 전류 차단 장치 동작 상태", "○"],
      ["", "• 유량, 양정 및 동력 적정 상태", "○"],
    ],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 26 } },
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 80) + 2,
    head: [["조치사항", "내용"]],
    body: [["<미조치사항>", "• 없음"], ["<조치필요사항>", "• 없음"]],
    columnStyles: { 0: { cellWidth: 26 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 100) + 2,
    head: [["추진사항 목록", "내용"]],
    body: [
      ["1.", "펌프 성능 점검 단계 및 기준"],
      ["2.", "펌프 육안 점검"],
      ["3.", "펌프 측정 점검"],
      ["4.", "펌프 성능 점검 결과 수치표"],
    ],
    columnStyles: { 0: { cellWidth: 16 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  // 하단 비고/작성방법(프레임 꽉 채우기)
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const frameW = W - FRAME.L - FRAME.R;

  const noteTop = (doc.lastAutoTable?.finalY || FRAME.T + 120) + 2;
  const bottomY = H - FRAME.B;

  const noteH = 16;
  const writeH = Math.max(20, bottomY - (noteTop + noteH));

  doc.setLineWidth(0.6);
  doc.rect(FRAME.L, noteTop, frameW, noteH, "S");
  doc.setLineWidth(0.2);
  doc.line(FRAME.L + 26, noteTop, FRAME.L + 26, noteTop + noteH);
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("비   고", FRAME.L + 6, noteTop + 10);

  if (remark) {
    doc.setFontSize(9.2);
    const t = doc.splitTextToSize(String(remark), frameW - 32);
    doc.text(t, FRAME.L + 30, noteTop + 6);
  }

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
    "2. 점검결과에는 [적합 ○, 조치필요 ×, 해당없음 /]을 표기한다.",
    "3. 현장사진에는 명확한 상태사진을 사용하고, 측정데이터를 포함하여 작성한다.",
    "4. 전체 주요 설비 중 일정 비율 이상 현장 내 점검을 실시한다.",
    "5. 순환펌프, 급수펌프, 배수펌프, 오수펌프, 소화펌프 등을 포함하여 작성한다.",
  ];
  const inner = doc.splitTextToSize(lines.join("\n"), frameW - 10);
  doc.text(inner, FRAME.L + 5, writeTop + 13);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 단계/기준 + 현황사진 ───────────────── */
function renderCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto }) {
  const H = doc.internal.pageSize.getHeight();
  pageChrome(doc, { title: "펌프 성능 점검 단계 및 점검 기준 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "정격 항목"]],
    body: [
      [
        "1. 육안 점검\n  서류 확인\n  외관 확인",
        "• 유지관리 점검표 점수 및 내용 확인\n• 샤프트 및 패킹 마모 상태\n• 베어링 및 모터 등 과열 상태\n• 베이스 앵커볼트 노후 및 풀림 상태\n• 이상 전류 차단 장치 동작 상태\n• 유량, 양정 및 동력 적정 상태",
      ],
      ["2. 측정 점검", "• 이상 소음 및 진동 상태\n• 1차측 유량/압력\n• 2차측 공급 압력/점수도\n• 전류, 전압 측정"],
      ["3. 점검 방법", "• 현장 사진으로 정리\n• 점검기기로 측정"],
      ["4. 점검 기준", "• 국토부 별지 제3호 서식 점검표 기준\n• (측정) 국토부 별지 제3호 서식 점검표 기준에 의한 측정장비 활용"],
    ],
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  const baseY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;
  const boxW = innerWidth(doc);
  const pad = 3;
  const captionH = 7;
  const footerReserve = 18;
  const boxH = Math.max(80, H - FRAME.B - footerReserve - baseY);

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

/* ───────────────── PAGE6: 결과 수치표(성능) ───────────────── */
function renderResultPerfPage(doc, { pageNo, totalPages, meta, place, equipLabel, data }) {
  pageChrome(doc, { title: "펌프 성능 점검 결과 수치표 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검자", "총설원", "점검일자", "설치위치", ""]],
    body: [[meta.engineer || "", "", meta.dateTxt || "", place || "", equipLabel || ""]],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 35 },
      4: { cellWidth: "auto" },
    },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 22) + 8;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 정격 현황", SAFE.L + 2, startY);

  headBodyTable(doc, {
    startY: startY + 4,
    head: [["구분", "형식", "유량[m³/h]", "양정[m]", "소비전력[kW]", "정격효율[%]", "설치일"]],
    body: [[data.ratedName, data.ratedType, data.ratedFlow, data.ratedHead, data.ratedPower, data.ratedEff, data.ratedYear]],
    styles: { fontSize: 9.0, cellPadding: 1.8 },
    pageBreak: "avoid",
  });

  const y2 = (doc.lastAutoTable?.finalY || startY + 22) + 10;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 측정 현황", SAFE.L + 2, y2);

  headBodyTable(doc, {
    startY: y2 + 4,
    head: [["유량[m³/h]", "양정[m]", "소비전력[kW]", "측정효율[%]", "정격대비 효율[%]", "부하율[%]"]],
    body: [[data.mFlow, data.mHead, data.mPower, data.effMeasured, data.effVsRated, data.loadRate]],
    styles: { fontSize: 9.0, cellPadding: 1.8 },
    pageBreak: "avoid",
  });

  const y3 = (doc.lastAutoTable?.finalY || y2 + 20) + 10;

  setKR(doc);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9.6);

  const descLines = [
    "• 해당 펌프의 효율을 분석하기 위해 유량, 양정, 소비전력을 측정한 결과,",
    `  측정 유량 / 정격 유량 : ${data.mFlow} / ${data.ratedFlow} (m³/h), 측정 양정 / 정격 양정 : ${data.mHead} / ${data.ratedHead} (m)`,
    `  측정 소비전력 / 정격 소비전력 : ${data.mPower} / ${data.ratedPower} (kW)`,
    "",
    "η = p × H × Q / (367 × P1)",
    "",
    `*효율(%) = (비중 × 양정(m) × 유량(m³/h)) / (367 × 전력(kW))`,
    `  (1 × ${data.mHead} × ${data.mFlow}) / (367 × ${data.mPower}) = ${data.effMeasured} (%)`,
    `*정격 대비 효율(%) = 측정 효율(%) ÷ 정격 효율(%) × 100 = ${data.effVsRated} (%)`,
    `*부하율(%) = 측정 소비전력(kW) ÷ 정격 소비전력(kW) × 100 = ${data.loadRate} (%)`,
  ];

  const boxW = innerWidth(doc);
  const boxX = SAFE.L;
  const boxTop = y3;
  const boxH = 92;

  doc.setLineWidth(0.6);
  doc.rect(boxX, boxTop, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const inner = doc.splitTextToSize(descLines.join("\n"), boxW - 8);
  doc.text(inner, boxX + 4, boxTop + 8);

  const y4 = boxTop + boxH + 8;
  const resultLines = (data.resultNote || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  headBodyTable(doc, {
    startY: y4,
    head: [["점검", "결과 사항"]],
    body: [["•", resultLines.length ? resultLines.join("\n") : "특이사항 없음"]],
    columnStyles: { 0: { cellWidth: 18 } },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
    pageBreak: "avoid",
  });

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE7: 소음/진동 결과 수치표 ───────────────── */
function renderNoiseVibPage(doc, { pageNo, totalPages, meta, place, equipLabel, data }) {
  pageChrome(doc, { title: "펌프 성능 점검 결과 수치표 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검자", "총설원", "점검일자", "설치위치", ""]],
    body: [[meta.engineer || "", "", meta.dateTxt || "", place || "", equipLabel || ""]],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 35 },
      4: { cellWidth: "auto" },
    },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 22) + 10;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 소음 측정과 진동 측정", SAFE.L + 2, startY);

  // ✅ 빨강 제거: 입력값도 전부 검정으로 출력
  headBodyTable(doc, {
    startY: startY + 4,
    head: [["측정 위치", "모터용량(kW)", "소음기준[±10% dB]", "소음값\n측정값", "상태", "진동기준\n[mm/s]", "측정값", "등급"]],
    body: [[data.loc, data.motorKw, data.noiseStd, data.noiseDb, data.noiseState, data.vibStd, data.vibVal, data.vibGrade]],
    styles: { fontSize: 8.8, cellPadding: 1.6 },
    pageBreak: "avoid",
  });

  const y2 = (doc.lastAutoTable?.finalY || startY + 30) + 10;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10.6);
  doc.text("진동 기준", SAFE.L + 2, y2);

  headBodyTable(doc, {
    startY: y2 + 3,
    head: [VIB_GRADE_TABLE[0]],
    body: VIB_GRADE_TABLE.slice(1),
    styles: { fontSize: 9.0, cellPadding: 1.6 },
    pageBreak: "avoid",
  });

  const y3 = (doc.lastAutoTable?.finalY || y2 + 35) + 10;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10.6);
  doc.text("전동기의 소음도", SAFE.L + 2, y3);

  headBodyTable(doc, {
    startY: y3 + 3,
    head: [MOTOR_NOISE_TABLE[0]],
    body: MOTOR_NOISE_TABLE.slice(1),
    styles: { fontSize: 9.0, cellPadding: 1.4 },
    pageBreak: "avoid",
  });

  const y4 = (doc.lastAutoTable?.finalY || y3 + 45) + 10;
  const noteLines = (data.note || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  headBodyTable(doc, {
    startY: y4,
    head: [["점검", "결과 사항"]],
    body: [["•", noteLines.length ? noteLines.join("\n") : "특이사항 없음"]],
    columnStyles: { 0: { cellWidth: 18 } },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
    pageBreak: "avoid",
  });

  footerNo(doc, pageNo);
}

/* ───────────────── 스키마(사진 슬롯) ───────────────── */
const P3_VISUAL = [
  { id: "pump_maint_table", label: "유지관리 점검표" },
  { id: "pump_base_coupling", label: "베이스 앵커볼트 노후 및 풀림 상태" },
  { id: "pump_shaft_wear", label: "샤프트 및 패킹 마모 상태 점검" },
  { id: "pump_pressure_gauge", label: "펌프 압력 게이지 점검" },
];
const P4_MEASURE = [
  { id: "pump_noise", label: "가동 시 모터 소음 점검" },
  { id: "pump_vib", label: "가동 시 모터 진동 점검" },
  { id: "pump_overheat_temp", label: "베어링 및 모터 과열 온도 점검" },
  { id: "pump_breaker", label: "이상 전류 차단 장치 동작 상태" },
];
const P5_MEASURE = [
  { id: "pump_voltage", label: "모터 전압 측정" },
  { id: "pump_current", label: "모터 전류 측정" },
  { id: "pump_ultra_flow", label: "초음파 유량 측정" },
  { id: "pump_ultra_flow_value", label: "초음파 유량 측정값" },
];

/* ==================== ✅ 합본용 렌더러 ==================== */
export async function renderPumpChw(doc, { building, reportMeta, report, __page } = {}) {
  if (!doc) throw new Error("renderPumpChw: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const totalPages = __page?.totalPages || 9999;
  let pageNo = __page?.pageNoStart || 1;

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  // report shape
  const v = report || {};
  const rated = v.rated || {};
  const measured = v.measured || {};
  const nv = v.nv || {};
  const notes = v.notes || {};
  const photoSlots = v.photoSlots || {};

  const place = building?.name || v?.meta?.label || "";
  const equipLabel = v?.meta?.label2 || v?.meta?.subLabel || "냉수펌프 2호기(지하기계실)";
  const engineer = reportMeta?.engineer || "";

  // 폼 키로 통일
  const ratedName = rated.kind || "냉수2호기";
  const ratedType = rated.type || "인라인펌프";
  const ratedEffNum = N(rated.efficiency);
  const ratedPowerNum = N(rated.power);

  // 계산
  const effMeasuredNum = calcMeasuredEff({
    sg: measured.sg ?? 1,
    H: measured.head,
    Q: measured.flow,
    P: measured.power,
  });
  const effMeasured = effMeasuredNum ? effMeasuredNum.toFixed(2) : "";

  const effVsRatedNum = ratedEffNum > 0 ? (effMeasuredNum / ratedEffNum) * 100 : 0;
  const effVsRated = effVsRatedNum ? effVsRatedNum.toFixed(2) : "";

  const loadRateNum = ratedPowerNum > 0 ? (N(measured.power) / ratedPowerNum) * 100 : 0;
  const loadRate = loadRateNum ? loadRateNum.toFixed(2) : "";

  // ===== PAGE 1 (현재 페이지)
  renderChecklistPage(doc, {
    pageNo,
    totalPages,
    dateTxt,
    place,
    engineer,
    equipLabel,
    remark: notes?.remark || "",
  });

  // ===== PAGE 2
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
    renderCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto });
  }

  // ===== PAGE 3
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    pageChrome(doc, { title: "2. 펌프 육안 점검표 #1", page: pageNo, total: totalPages });
    const vUrls = await toUrls(P3_VISUAL, photoSlots);
    const vLines = String(notes.visual || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "육안 및 측정 점검", items: P3_VISUAL, images: vUrls, resultLines: vLines });
    footerNo(doc, pageNo);
  }

  // ===== PAGE 4
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    pageChrome(doc, { title: "3. 펌프 측정 점검표 #1", page: pageNo, total: totalPages });
    const m4Urls = await toUrls(P4_MEASURE, photoSlots);
    const mLines = String(notes.measure || "특이사항 없음")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    photoGrid(doc, { title: "측정 점검", items: P4_MEASURE, images: m4Urls, resultLines: mLines });
    footerNo(doc, pageNo);
  }

  // ===== PAGE 5
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    pageChrome(doc, { title: "3. 펌프 측정 점검표 #2", page: pageNo, total: totalPages });
    const m5Urls = await toUrls(P5_MEASURE, photoSlots);
    const r = ["특이사항 없음"];
    photoGrid(doc, { title: "측정 점검", items: P5_MEASURE, images: m5Urls, resultLines: r });
    footerNo(doc, pageNo);
  }

  // ===== PAGE 6 (성능)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    renderResultPerfPage(doc, {
      pageNo,
      totalPages,
      meta: { engineer, dateTxt },
      place,
      equipLabel,
      data: {
        ratedName,
        ratedType,
        ratedFlow: rated.flow ?? "",
        ratedHead: rated.head ?? "",
        ratedPower: rated.power ?? "",
        ratedEff: rated.efficiency ?? "",
        ratedYear: rated.year ?? "",

        mFlow: measured.flow ?? "",
        mHead: measured.head ?? "",
        mPower: measured.power ?? "",

        effMeasured,
        effVsRated,
        loadRate,

        resultNote: notes.pm_result_note || "유량과 부하율은 정격대비 양호하게 나오고 있다.",
      },
    });
  }

  // ===== PAGE 7 (소음/진동)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    const motorKw = nv.motorKw ?? "";
    const pole = nv.pole ?? 4;
    const noiseDb = nv.noiseDb ?? "";
    const vibVal = nv.vibVal ?? "";

    const noiseStd = calcNoiseStdText(motorKw, pole);
    const noiseState = calcNoiseState(motorKw, pole, noiseDb);
    const vibStd = calcVibStdText(motorKw);
    const vibGrade = calcVibGrade(motorKw, vibVal);

    renderNoiseVibPage(doc, {
      pageNo,
      totalPages,
      meta: { engineer, dateTxt },
      place,
      equipLabel,
      data: {
        loc: ratedName,
        motorKw,
        noiseStd,
        noiseDb,
        noiseState: noiseState || "",
        vibStd,
        vibVal,
        vibGrade: vibGrade || "",
        note: notes.nv || "특이사항 없음",
      },
    });
  }

  return pageNo;
}

/* ───────────────── 단독: buildPumpChwPdf (7페이지) ───────────────── */
export async function buildPumpChwPdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  await renderPumpChw(doc, {
    building,
    reportMeta,
    report,
    __page: { pageNoStart: 1, totalPages: 7 },
  });

  return doc.output("blob");
}
