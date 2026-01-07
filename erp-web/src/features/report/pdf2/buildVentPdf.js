// src/features/report/pdf2/buildVentPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const BLACK = 0;
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* 숫자 유틸 */
const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const mean = (arr = []) => {
  const nums = (arr || []).map(N).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
};
const ensure6 = (arr) => {
  const out = Array.isArray(arr) ? arr.slice(0, 6) : [];
  while (out.length < 6) out.push("");
  return out;
};

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

/* ───────────────── 페이지 안전 ───────────────── */
function gotoLastPage(doc) {
  const total = doc.getNumberOfPages();
  if (total >= 1) doc.setPage(total);
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

async function normalizeOneSrc(v) {
  if (!v) return null;

  let src = v;

  if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) src = v.files?.[0] ?? null;
  if (typeof FileList !== "undefined" && src instanceof FileList) src = src[0];
  if (Array.isArray(src)) src = src[0];
  if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

  return src;
}

async function toUrls(schema = [], photoSlots = {}) {
  return Promise.all(
    schema.map(async (s) => {
      const v = photoSlots?.[s.id];
      const src = await normalizeOneSrc(v);
      const raw = await toDataUrlFlexible(src);
      return raw ? await downscaleDataUrl(raw) : null;
    })
  );
}

// ✅ criteria는 strict (fallback 금지)
async function firstPhotoUrlStrict(photoSlots = {}, id) {
  const v = photoSlots?.[id];
  const src = await normalizeOneSrc(v);
  const raw = await toDataUrlFlexible(src);
  return raw ? await downscaleDataUrl(raw, 2000, 0.9) : null;
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
      fontSize: 10.0,
      cellPadding: 2.4,
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

  const merged = styleOverride
    ? {
        ...base,
        styles: { ...base.styles, ...(styleOverride.styles || {}) },
        headStyles: { ...base.headStyles, ...(styleOverride.headStyles || {}) },
        bodyStyles: { ...base.bodyStyles, ...(styleOverride.bodyStyles || {}) },
      }
    : base;

  // ✅ opt 최종 승리
  autoTable(doc, {
    ...merged,
    ...opt,
    margin: { left: SAFE.L, right: SAFE.R, ...(opt?.margin || {}) },
    tableWidth: opt?.tableWidth ? opt.tableWidth : innerWidth(doc),
  });
}

/* ───────────────── 문단 박스 ───────────────── */
function paragraphBoxFit(doc, { title, lines, left = SAFE.L, top, right = SAFE.R, bottom = 16 }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const maxOuterH = Math.max(20, H - FRAME.B - bottom - top);

  setKR(doc);
  const headFS = 10.6;
  const bodyFS = 9.6;
  const padTop = 6;
  const padBottom = 6;
  const padSide = 3.2;
  const lineGap = 2.2;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(headFS);
  doc.text(title, left, top);

  const boxY = top + 2.5;
  const innerX = left + padSide;
  const innerW = W - left - right - padSide * 2;

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(bodyFS);

  let wrapped = lines.map((t) => doc.splitTextToSize(`• ${t}`, innerW));

  const px2mm = 0.3528;
  const lineH = bodyFS * 1.2 * px2mm;

  let textH = wrapped.reduce((h, arr) => h + arr.length * lineH + lineGap, 0);
  let boxH = padTop + textH + padBottom;

  if (boxH > maxOuterH) {
    const fs = Math.max(8.6, bodyFS - 1.0);
    doc.setFontSize(fs);
    const lineH2 = fs * 1.2 * px2mm;
    wrapped = lines.map((t) => doc.splitTextToSize(`• ${t}`, innerW));
    textH = wrapped.reduce((h, arr) => h + arr.length * lineH2 + lineGap, 0);
    boxH = Math.min(maxOuterH, padTop + textH + padBottom);
  }

  doc.setLineWidth(0.6);
  doc.rect(left, boxY, W - left - right, boxH, "S");
  doc.setLineWidth(0.2);

  let y = boxY + padTop;
  const activeLineH = doc.getFontSize() * 1.2 * 0.3528;
  for (const arr of wrapped) {
    arr.forEach((line) => {
      doc.text(line, innerX, y);
      y += activeLineH;
    });
    y += 2.0;
  }

  return boxY + boxH;
}

/* ───────────────── 사진 그리드 ───────────────── */
function photoGrid(doc, { title = "육안 점검", top = 32, rows = 2, cols = 2, gap = 5, captionH = 6, items = [], images = [], resultLines = [] }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, SAFE.L + 2, top - 4);
  doc.setFont("NotoSansKR", "normal");

  // 결과사항 줄수 제한(페이지 안정)
  const MAX_LINES = 8;
  const cleaned = (resultLines || []).slice(0, MAX_LINES);
  const more = (resultLines || []).length > MAX_LINES;
  const finalLines = more ? [...cleaned, "…(이하 생략)"] : cleaned;

  const lines = Math.max(1, finalLines.length ? finalLines.length : 1);
  const estResultH = 14 + lines * 6 + 2;
  const gridW = W - SAFE.L - SAFE.R;
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
    body: [["•", finalLines.length ? finalLines.join("\n") : "특이사항 없음"]],
    pageBreak: "avoid",
    rowPageBreak: "avoid",
  });
}

/* ───────────────── 환기설비 사진 슬롯 ───────────────── */
const VENT_PHOTO_VISUAL = [
  { id: "vt_maint_table", label: "유지관리 점검표" },
  { id: "vt_motor_status", label: "노후 및 부식 상태" },
  { id: "vt_fix_status", label: "고정 장치 및 풀림 상태" },
  { id: "vt_co2", label: "CO₂ 측정" },
];

const VENT_PHOTO_MEASURE = [
  { id: "vt_voltage", label: "가동 시 전압 측정" },
  { id: "vt_current", label: "가동 시 전류 측정" },
  { id: "vt_flow_graph", label: "배기 풍량 측정 그래프" },
  { id: "vt_extra", label: "추가 사진" },
];

/* ───────────────── PAGE1: 점검표 ───────────────── */
function renderVentChecklistPage(doc, { pageNo, totalPages, dateTxt, placeLabel, engineer }) {
  pageChrome(doc, { title: "환기설비 성능 점검표 #1", page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      head: [["점검자", "운전원", "점검일자", "설치위치"]],
      body: [[engineer || "", "", dateTxt || "", placeLabel || ""]],
    },
    { styles: { fontSize: 9.8, cellPadding: 2.2 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 18) + 4,
      head: [["구분", "점검내용", "점검결과"]],
      body: [
        ["점검항목", "• 유지 관리 점검표", "○"],
        ["", "• 노후 및 부식 상태", "○"],
        ["", "• 모터 및 흡·송풍기 베어링 이상 소음 상태", "○"],
        ["", "• 볼트·넛트 개·폐쇄 상태", "/"],
        ["", "• 급·배기 풍량 상태", "○"],
        ["", "• 이산화탄소 농도 확인 (10개소 내외)", "○"],
        ["", "• 필터 오염 상태", "/"],
      ],
    },
    { styles: { fontSize: 9.6, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 70) + 2,
      head: [["조치사항", "내용"]],
      body: [
        ["<미조치사항>", "없음"],
        ["<조치필요사항>", "없음"],
      ],
    },
    { styles: { fontSize: 9.4, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 90) + 2,
      head: [["추진사항 목록", "내용"]],
      body: [
        ["1.", "환기설비 성능 점검 단계 및 기준"],
        ["2.", "환기설비 육안 점검"],
        ["3.", "환기설비 측정 점검"],
        ["4.", "환기설비 성능 점검 결과 수치표(풍량·전력)"],
        ["5.", "환기설비 성능 점검 결과 수치표(소음·진동·CO₂)"],
      ],
    },
    { styles: { fontSize: 9.4, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 110) + 2,
      head: [["작성 방법", "내용"]],
      body: [
        [
          "",
          [
            "1. 유지관리지침서와 기계설비 유지관리 및 성능 점검 대상 현황표의 적합 여부를 참고하여 점검결과를 작성한다.",
            "2. 점검결과에는 [적합 ○, 조치필요 ×, 해당없음 /]을 표기한다.",
            "3. 현장사진에는 동일 위치 전·후의 상태를 사용할 수 있으며, 측정 데이터도 포함하여 작성한다.",
            "4. 전체 설비 중 50% 이상 현장 내에서 점검을 실시한다.",
          ].join("\n"),
        ],
      ],
    },
    { styles: { fontSize: 9.2, cellPadding: 2.4 }, headStyles: { fillColor: [243, 244, 246] } }
  );

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const frameWidth = W - FRAME.L - FRAME.R;

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 140) + 2;
  const bottomY = H - FRAME.B;
  const headerH = 8;
  const boxH = Math.max(18, bottomY - startY);

  const noteX = FRAME.L;
  const noteY = startY;

  doc.setDrawColor(0);
  doc.rect(noteX, noteY, frameWidth, boxH, "S");

  const labelW = 26;
  const labelX = noteX + labelW;
  doc.line(labelX, noteY, labelX, noteY + boxH);

  const headerY = noteY + headerH;
  doc.line(noteX, headerY, noteX + frameWidth, headerY);

  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("비  고", noteX + 4, noteY + headerH / 2 + 2.3);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 기준 + 현황사진 ───────────────── */
function renderVentCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto }) {
  const H = doc.internal.pageSize.getHeight();

  pageChrome(doc, { title: "환기설비 성능 점검 단계 및 점검 기준 #1", page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 6,
      head: [["점검 단계", "점검 항목"]],
      body: [
        [
          "1. 육안 점검",
          "• 유지관리 점검표 확인\n• 노후 및 부식 상태\n• 모터 및 흡·송풍기 베어링 이상 소음 상태\n• 볼트·넛트 개·폐쇄 상태\n• 필터 오염 상태",
        ],
        ["2. 측정 점검", "• 풍속 6포인트 측정\n• 전류/전압 측정\n• 배기 풍량 계산"],
        ["3. 점검 방법", "• 현장 사진으로 정리"],
        ["4. 점검 기준", "• 국토부 별지 제3호 서식 점검표 기준에 의함"],
      ],
    },
    { styles: { fontSize: 9.6, cellPadding: 2.0 } }
  );

  const baseY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;
  const boxW = innerWidth(doc);
  const pad = 3;
  const captionH = 7;
  const footerReserve = 18;
  const boxH = Math.max(50, H - FRAME.B - footerReserve - baseY);

  doc.setLineWidth(0.6);
  doc.rect(SAFE.L, baseY, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const imgX = SAFE.L + pad;
  const imgY = baseY + pad;
  const imgW = boxW - pad * 2;
  const imgH = boxH - pad * 2 - captionH;

  try {
    if (criteriaPhoto) addImageSafe(doc, criteriaPhoto, imgX, imgY, imgW, imgH);
    else throw new Error();
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

/* ───────────────── PAGE5: 수치표 #1 (풍량/전력) ───────────────── */
function renderVentResult1(doc, { pageNo, totalPages, reportMeta, dateTxt, placeLabel, rated, measured, calc }) {
  pageChrome(doc, { title: "환기설비 성능 점검 결과 수치표 #1", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검자", "점검일자", "설치위치"]],
    body: [[reportMeta?.engineer || "", dateTxt, placeLabel]],
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 16) + 4,
    head: [["구분", "풍량 (m³/h)", "정압 (mmAq)", "소비전력 (kW)", "비고"]],
    body: [
      [
        "정격값",
        calc.ratedFlow ? calc.ratedFlow.toLocaleString() : "",
        rated?.sp || "",
        calc.ratedPower || "",
        "",
      ],
    ],
  });

  const vel6 = ensure6(measured?.velPts || []);
  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 40) + 4,
    head: [["구분", "1포인트", "2포인트", "3포인트", "4포인트", "5포인트", "6포인트", "평균 풍속 (m/s)"]],
    body: [
      [
        "측정 풍속",
        vel6[0] || "",
        vel6[1] || "",
        vel6[2] || "",
        vel6[3] || "",
        vel6[4] || "",
        vel6[5] || "",
        calc.velAvg ? calc.velAvg.toFixed(2) : "",
      ],
    ],
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 70) + 4,
    head: [["측정 풍량 (m³/h)", "계산 전력 (kW)", "정격 대비 풍량비 (%)", "정격 대비 전력비 (%)"]],
    body: [[calc.flowCalc ? calc.flowCalc.toLocaleString() : "", calc.kwCalc || "", calc.pctFlow, calc.pctPower]],
  });

  paragraphBoxFit(doc, {
    title: "계산식 및 해석",
    lines: [
      "풍량[m³/h] = 평균 풍속[m/s] × 3,600[s/h] × 덕트 면적[m²]",
      "정격 대비 풍량비[%] = 측정 풍량 ÷ 정격 풍량 × 100",
      "정격 대비 전력비[%] = 측정 전력 ÷ 정격 소비전력 × 100",
      "전력[kW] = 전류[A] × (√3×380×0.9×0.9/1000)",
    ],
    top: (doc.lastAutoTable?.finalY || FRAME.T + 90) + 4,
    bottom: 16,
  });

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE6: 수치표 #2 (소음·진동·CO₂) ───────────────── */
function renderVentResult2(doc, { pageNo, totalPages, placeLabel, ratedPower, noise }) {
  pageChrome(doc, { title: "환기설비 성능 점검 결과 수치표 #2 (소음·진동·CO₂)", page: pageNo, total: totalPages });

  const motorKwStd = ratedPower || "";
  const motorKwMeas = noise?.motorKw ?? "";

  const noiseStd = noise?.noiseStd || "64~84";
  const noiseMeas = noise?.noiseMeas ?? "";

  const vibStd = noise?.vibStd || "0.71~1.8";
  const vibMeas = noise?.vibMeas ?? "";

  const co2Std = noise?.co2Std || "350~450";
  const co2Meas = noise?.co2Meas ?? "";

  const noiseJudge = noise?.judge || "";

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 6,
      head: [["구분", "측정 위치", "모터 용량 [kW]", "소음 기준 [±10% dB]", "진동 기준 [mm/s]", "CO₂ 기준 [PPM]"]],
      body: [
        ["기준값", placeLabel || "-", motorKwStd || "-", noiseStd || "-", vibStd || "-", co2Std || "-"],
        ["측정값", placeLabel || "-", motorKwMeas || "", noiseMeas || "", vibMeas || "", co2Meas || ""],
      ],
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 40 } },
    },
    { styles: { fontSize: 9.6, cellPadding: 2.2 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 40) + 4,
      head: [["판정", "내용"]],
      body: [[noiseJudge || "", "소음, 진동, CO₂ 측정 결과를 종합하여 판정함."]],
      columnStyles: { 0: { cellWidth: 22 } },
    },
    { styles: { fontSize: 9.4, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 70) + 4,
      head: [["진동 기준", "15kW 이하", "15~75kW 이하"]],
      body: [
        ["A", "0.28~0.71", "0.28~1.12"],
        ["B", "0.71~1.8", "1.12~2.8"],
        ["C", "1.8~4.5", "2.8~7.1"],
        ["D", "4.5 이상", "7.1 이상"],
      ],
      columnStyles: { 0: { cellWidth: 22 } },
    },
    { styles: { fontSize: 9.0, cellPadding: 1.8 } }
  );

  const basisTop = (doc.lastAutoTable?.finalY || FRAME.T + 100) + 4;
  const afterBasisY = paragraphBoxFit(doc, {
    title: "기준 근거",
    lines: [
      "진동 기준(A~D 등급)은 회전 기계 진동 관련 표준/기술자료를 참고하여 설정하였다.",
      "전동기 소음 기준 표는 전동기 표준 소음도 자료를 참고하여 정리하였다.",
      "CO₂ 농도 기준 값은 실내 공기환경 유지기준 등 관계 자료를 참고하였다.",
    ],
    top: basisTop,
    bottom: 30,
  });

  paragraphBoxFit(doc, {
    title: "CO₂ 농도와 인체 영향",
    lines: [
      "350~450ppm : 일반 실내에서 쾌적하게 느끼는 농도",
      "450~1,000ppm : 공기가 맑고 쾌적한 정도",
      "1,000~2,000ppm : 공기가 탁하게 느껴지고 졸음, 피로감이 나타날 수 있음",
      "2,000~5,000ppm : 두통, 집중력 저하 등 불쾌감이 뚜렷하게 나타날 수 있음",
      "5,000ppm 이상 : 장시간 노출 시 건강에 유해할 수 있는 수준으로 충분한 환기 필요",
    ],
    top: afterBasisY + 4,
    bottom: 18,
  });

  footerNo(doc, pageNo);
}

/* ==================== 페이지 수 ==================== */
function computeVentTotalPages() {
  return 6; // 1:점검표, 2:기준+현황, 3:육안, 4:측정, 5:수치1, 6:수치2
}

/* ==================== ✅ 합본용 렌더러 ==================== */
export async function renderVent(doc, { building, reportMeta, report, __page } = {}) {
  if (!doc) throw new Error("renderVent: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const totalPages = __page?.totalPages || computeVentTotalPages();
  let pageNo = __page?.pageNoStart || 1;

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  // ✅🔥 핵심: report 포인터/레거시/래핑 대응
  const v = report?.vent ?? report?.photoAndCalc ?? report ?? {};

  const rated = v.rated || report?.rated || {};
  const measured = v.measured || report?.measured || {};

  const photoSlots =
    v.photoSlots ||
    v.photoAndCalc?.photoSlots ||
    report?.photoSlots ||
    report?.photoAndCalc?.photoSlots ||
    {};

  const notes =
    v.notes ||
    v.sectionNotes ||
    v.ventNotes ||
    report?.notes ||
    report?.sectionNotes ||
    report?.ventNotes ||
    {};

  const noise = v.noise || report?.noise || {};

  const placeLabel = building?.name || v?.meta?.label || "";

  /* ---- 풍량/전력 계산 ---- */
  const velPtsNum = (measured.velPts || []).map(N);
  const velAvg = mean(velPtsNum);

  const ductW = N(measured.w);
  const ductH = N(measured.h);
  const ductArea = ductW * ductH;

  const flowCalc = Math.round(velAvg * 3600 * ductArea) || 0;

  const KW_PER_A = (Math.sqrt(3) * 380 * 0.9 * 0.9) / 1000;
  const measuredCurrent = N(measured.current);
  const kwCalc = +(measuredCurrent * KW_PER_A).toFixed(2);

  const ratedFlow = N(rated.flow);
  const ratedPower = N(rated.power);

  const pctFlow = ratedFlow > 0 ? ((flowCalc / ratedFlow) * 100).toFixed(2) : "";
  const pctPower = ratedPower > 0 ? ((kwCalc / ratedPower) * 100).toFixed(2) : "";

  const calc = { velAvg, ductArea, flowCalc, kwCalc, ratedFlow, ratedPower, pctFlow, pctPower };

  /* PAGE 1 */
  renderVentChecklistPage(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel,
    engineer: reportMeta?.engineer || "",
  });

  /* PAGE 2 */
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  const criteriaPhoto = await firstPhotoUrlStrict(photoSlots, "criteria_photo");
  renderVentCriteriaPage(doc, { pageNo, totalPages, criteriaPhoto });

  /* PAGE 3 : 육안 */
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "환기설비 육안 점검표 #1", page: pageNo, total: totalPages });

  const visualUrls = await toUrls(VENT_PHOTO_VISUAL, photoSlots);
  const visualLines = String(notes.vt_visual_note || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  photoGrid(doc, {
    title: "육안 점검",
    rows: 2,
    cols: 2,
    items: VENT_PHOTO_VISUAL,
    images: visualUrls,
    resultLines: visualLines,
  });
  footerNo(doc, pageNo);

  /* PAGE 4 : 측정 */
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "환기설비 측정 점검표 #1", page: pageNo, total: totalPages });

  const measureUrls = await toUrls(VENT_PHOTO_MEASURE, photoSlots);
  const measureLines = String(notes.vt_measure_note || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  photoGrid(doc, {
    title: "측정 점검",
    rows: 2,
    cols: 2,
    items: VENT_PHOTO_MEASURE,
    images: measureUrls,
    resultLines: measureLines,
  });
  footerNo(doc, pageNo);

  /* PAGE 5 : 수치표 #1 */
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  renderVentResult1(doc, {
    pageNo,
    totalPages,
    reportMeta,
    dateTxt,
    placeLabel,
    rated,
    measured,
    calc,
  });

  /* PAGE 6 : 수치표 #2 */
  pageNo += 1;
  safeAddPage(doc);
  await ensureFonts(doc);
  setKR(doc);

  renderVentResult2(doc, {
    pageNo,
    totalPages,
    placeLabel,
    ratedPower,
    noise,
  });

  return pageNo;
}

/* ───────────────── 단독 빌더 ───────────────── */
export async function buildVentPdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  await renderVent(doc, {
    building,
    reportMeta,
    report,
    __page: { pageNoStart: 1, totalPages: computeVentTotalPages() },
  });

  return doc.output("blob");
}
