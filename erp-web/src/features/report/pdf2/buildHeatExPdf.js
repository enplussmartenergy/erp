// src/features/report/pdf2/buildHeatExPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const fmt0 = (n) => (Number.isFinite(+n) ? `${Math.round(+n)}` : "");
const fmt2 = (n) => (Number.isFinite(+n) ? `${(+n).toFixed(2)}` : "");

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
    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement)
      return src.src ? await toDataUrlFlexible(src.src) : null;
    if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement)
      return src.toDataURL("image/jpeg", 0.92);
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
async function toUrls(slots, photoSlots) {
  return Promise.all(
    (slots || []).map(async (s) => {
      let v = photoSlots?.[s.id];
      if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

      let src = v;
      if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
      if (Array.isArray(v)) src = v[0];
      if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

      const raw = await toDataUrlFlexible(src);
      return raw ? await downscaleDataUrl(raw) : null;
    })
  );
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
        bodyStyles: { ...base.bodyStyles, ...(styleOverride.bodyStyles || {}) },
      }
    : base;

  autoTable(doc, { ...opt, ...merged, margin: { left: SAFE.L, right: SAFE.R }, tableWidth: innerWidth(doc) });
}

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
    body: [["•", resultLines.length ? resultLines.join("\n") : "특이사항 없음"]],
    columnStyles: { 0: { cellWidth: 18 } },
    pageBreak: "avoid",
  });
}

/* ───────────── 열교환기 기본 섹션(기본값) ───────────── */
const DEFAULT_SECTIONS = [
  {
    title: "2. 열교환기 육안 점검",
    noteKey: "visual",
    slots: [
      { id: "maint_table", label: "유지관리 점검표" },
      { id: "aging_rust_photo", label: "노후 및 부식 상태" },
      { id: "safety_valve_photo", label: "안전밸브 상태(증기)" },
      { id: "circulation_pump_photo", label: "순환펌프 상태" },
    ],
  },
  {
    title: "3. 열교환기 측정 점검(온도/열화상)",
    noteKey: "measure",
    slots: [
      { id: "thermal_steam_in", label: "열화상(증기입구)" },
      { id: "temp_cond_out", label: "응축수 배출 온도" },
      { id: "temp_hot_in", label: "온수 입구 온도" },
      { id: "temp_hot_out", label: "온수 출구 온도" },
    ],
  },
  {
    title: "4. 열교환기 측정 점검(압력/유량)",
    noteKey: "flow",
    slots: [
      { id: "gauge_hot_pump", label: "온수 펌프 공급 압력" },
      { id: "gauge_steam_head", label: "증기헤드 압력" },
      { id: "flow_measure", label: "온수 유량 측정" },
      { id: "flow_value", label: "온수 유량 측정값" },
    ],
  },
];

/* ───────────────── (추가) 열교환 효율 계산 도식 ───────────────── */
function drawHxDiagram(doc, x, y, w, h, { Tq1, Tq2, Ta1, Ta2 } = {}) {
  const RED = [220, 38, 38];
  const BLUE = [37, 99, 235];
  const ORANGE = [249, 115, 22];

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(x, y, w, h, "S");
  doc.setLineWidth(0.2);

  const midY = y + h / 2;
  doc.setDrawColor(0);
  doc.line(x, midY, x + w, midY);

  const padL = 10;
  const padR = 10;
  const topTextY = y + 15;
  const bottomTextY = midY + 15;

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(11);

  doc.setTextColor(...RED);
  doc.text(`Tq1 = ${Tq1 ?? ""}`, x + padL, topTextY);
  doc.text("[kcal/kg]", x + padL, topTextY + 7);

  doc.text(`Ta1 = ${Ta1 ?? ""}`, x + padL, bottomTextY);
  doc.text("[℃]", x + padL, bottomTextY + 7);

  const rightX = x + w - padR;
  doc.text(`Tq2 = ${Tq2 ?? ""}`, rightX, topTextY, { align: "right" });
  doc.text("[kcal/kg]", rightX, topTextY + 7, { align: "right" });

  doc.text(`Ta2 = ${Ta2 ?? ""}`, rightX, bottomTextY, { align: "right" });
  doc.text("[℃]", rightX, bottomTextY + 7, { align: "right" });

  doc.setTextColor(...BLUE);
  doc.setFont("NotoSansKR", "bold");
  doc.text("증기", x + w / 2, y + h * 0.30, { align: "center" });
  doc.text("온수", x + w / 2, y + h * 0.70, { align: "center" });

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(x + w * 0.25, y + h * 0.28, x + w * 0.75, y + h * 0.45);
  doc.line(x + w * 0.25, y + h * 0.72, x + w * 0.75, y + h * 0.55);

  setKR(doc);
}

/* ==================== 페이지 렌더 ==================== */
function renderCover(doc, { pageNo, totalPages, dateTxt, placeLabel, equipLabel, notes, engineer }) {
  pageChrome(doc, { title: `열교환기 성능 점검표${equipLabel ? ` ${equipLabel}` : ""}`, page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      body: [
        [
          { content: "점검자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          engineer || "",
          { content: "점검일자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          dateTxt || "",
          { content: "설치위치", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          placeLabel || "",
        ],
      ],
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 26 },
        2: { cellWidth: 16 },
        3: { cellWidth: 32 },
        4: { cellWidth: 16 },
        5: { cellWidth: 30 },
      },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } }
  );

  const rows = [
    ["", "• 유지관리 점검표 확인", "○"],
    ["", "• 노후 및 부식 상태", "○"],
    ["", "• 열교환 효율 점검", "○"],
    ["", "• 응축수 배출 온도 상태(증기)", "○"],
    ["", "• 안전밸브 상태(증기)", "○"],
    ["", "• 증기트랩 상태(증기)", "○"],
  ];
  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 10) + 4,
      head: [["구 분", "점검내용", "점검결과"]],
      body: rows,
      columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 16 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 10) + 2,
      head: [["조치사항", ""]],
      body: [["<조치필요사항>", `• ${notes?.actions || "없음"}`]],
      columnStyles: { 0: { cellWidth: 24 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 10) + 2,
      head: [["추진사항 목록", ""]],
      body: [
        ["1.", "열교환기 성능 점검 단계 및 점검 기준"],
        ["2.", "열교환기 육안 점검"],
        ["3.", "열교환기 측정 점검(온도/열화상)"],
        ["4.", "열교환기 측정 점검(압력/유량)"],
        ["5.", "열교환기 측정 계산식"],
      ],
      columnStyles: { 0: { cellWidth: 10 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 10) + 2,
      head: [["비  고", ""]],
      body: [["", notes?.remark || ""]],
    },
    { styles: { fontSize: 9.8, cellPadding: 4.0 } }
  );

  footerNo(doc, pageNo);
}

function renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto }) {
  pageChrome(doc, { title: "1. 열교환기 성능 점검 단계 및 점검 기준", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 확인", "• 유지관리 점검표 확인\n• 노후 및 부식 상태\n• 안전밸브/증기트랩 상태"],
      ["2. 측정 점검", "• 온수 입/출구 온도 측정\n• 온수 유량 측정\n• 증기압/온도 확인(표 참조)"],
      ["3. 점검 기준", "• 관련 점검 기준 및 현장 상태에 의함"],
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

  const pad = 3.2;
  const captionH = 7;
  const imgX = SAFE.L + pad;
  const imgY = boxY + pad;
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

function renderCalcPage(doc, { pageNo, totalPages, rated, measured, notes, equipLabel }) {
  pageChrome(doc, { title: `5. 열교환기 측정 계산식${equipLabel ? ` ${equipLabel}` : ""}`, page: pageNo, total: totalPages });

  const rho = N(measured?.waterRho || 1000);
  const condRho = N(measured?.condRho || 960);

  const hotIn = N(measured?.hotInTemp);
  const hotOut = N(measured?.hotOutTemp);
  const flow = N(measured?.hotFlow);

  const h1 = N(measured?.hSteamIn);
  const h2 = N(measured?.hCondOut);

  const dT = hotOut - hotIn;
  const qSteam1kg = h1 - h2; // kcal/kg
  const qTotal = rho * flow * dT; // kcal/h (Cp=1)
  const mSteam = qSteam1kg > 0 ? qTotal / qSteam1kg : 0; // kg/h
  const vCond = condRho > 0 ? mSteam / condRho : 0; // m3/h

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 6,
      head: [["정격 현황", "값", "점검 현황(측정값)", "값"]],
      body: [
        ["형식", rated?.hxType || "", "증기 압력", String(measured?.steamPressure ?? "")],
        ["제조사", rated?.maker || "", "증기 온도", String(measured?.steamTemp ?? "")],
        ["전열면적", rated?.heatArea ? `${rated.heatArea} ㎡` : "", "온수 입구(℃)", String(measured?.hotInTemp ?? "")],
        ["용량", rated?.capacity ? `${rated.capacity} kcal/h` : "", "온수 출구(℃)", String(measured?.hotOutTemp ?? "")],
        ["", "", "온수 유량(m³/h)", String(measured?.hotFlow ?? "")],
      ],
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 36 }, 2: { cellWidth: 30 }, 3: { cellWidth: 36 } },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } }
  );

  const yDiaTitle = (doc.lastAutoTable?.finalY || FRAME.T + 40) + 8;
  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 열교환 효율 계산", SAFE.L + 2, yDiaTitle);

  const diaX = SAFE.L + 2;
  const diaY = yDiaTitle + 4;
  const diaW = innerWidth(doc) - 4;
  const diaH = 46;

  drawHxDiagram(doc, diaX, diaY, diaW, diaH, {
    Tq1: Number.isFinite(h1) ? fmt0(h1) : "",
    Tq2: Number.isFinite(h2) ? fmt0(h2) : "",
    Ta1: Number.isFinite(hotIn) ? fmt0(hotIn) : "",
    Ta2: Number.isFinite(hotOut) ? fmt0(hotOut) : "",
  });

  const boxTop = diaY + diaH + 8;
  const boxW = innerWidth(doc);
  const boxX = SAFE.L;
  const H = doc.internal.pageSize.getHeight();

  const reserveBottom = 52;
  const boxH = Math.max(78, Math.min(110, H - FRAME.B - reserveBottom - boxTop));

  setKR(doc);
  doc.setLineWidth(0.6);
  doc.rect(boxX, boxTop, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const pad = 4;
  let y = boxTop + pad + 4;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("측정 계산식", boxX + pad, y);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(10);

  y += 8;

  const drawLine = (label, val, tail = "") => {
    setKR(doc);
    doc.setTextColor(0);
    doc.text(label, boxX + pad, y);

    const x2 = boxX + pad + doc.getTextWidth(label) + 2;
    doc.text(val, x2, y);

    if (tail) doc.text(tail, x2 + doc.getTextWidth(val) + 2, y);
    y += 6.2;
  };

  drawLine("1) ΔT = 온수출구 - 온수입구 = ", `${fmt2(hotOut)} - ${fmt2(hotIn)}`, ` = ${fmt2(dT)} ℃`);
  drawLine("2) 증기 1kg 방출열량 Qs = h1 - h2 = ", `${fmt2(h1)} - ${fmt2(h2)}`, ` = ${fmt2(qSteam1kg)} kcal/kg`);

  setKR(doc);
  doc.text("3) 총 열교환량 Qt = ρ × 유량 × ΔT (Cp=1) = ", boxX + pad, y);
  doc.text(
    `${fmt0(rho)} × ${fmt2(flow)} × ${fmt2(dT)}`,
    boxX + pad + doc.getTextWidth("3) 총 열교환량 Qt = ρ × 유량 × ΔT (Cp=1) = ") + 2,
    y
  );
  y += 6.2;

  drawLine("   → Qt = ", `${fmt0(qTotal)}`, " kcal/h");
  drawLine("4) 증기 질량유량 m = Qt / Qs = ", `${fmt0(qTotal)} / ${fmt2(qSteam1kg)}`, ` = ${fmt0(mSteam)} kg/h`);
  drawLine("5) 응축수 체적유량 V = m / ρ(응축수) = ", `${fmt0(mSteam)} / ${fmt0(condRho)}`, ` = ${fmt2(vCond)} m³/h`);

  y += 4;
  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("※ 엔탈피(h1/h2)는 증기표(압력/온도) 기준값을 입력한다.", boxX + pad, y);

  const startY = boxTop + boxH + 6;
  headBodyTable(
    doc,
    {
      startY,
      head: [["작성 방법", ""]],
      body: [
        ["1.", "증기압/온도 및 온수 입·출구 온도, 유량을 측정/확인한다."],
        ["2.", "증기표 기준 엔탈피(h1/h2)를 입력하여 열량 및 증기유량을 산출한다."],
      ],
      columnStyles: { 0: { cellWidth: 12 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  if (notes?.calc) {
    headBodyTable(
      doc,
      {
        startY: (doc.lastAutoTable?.finalY || startY) + 2,
        head: [["비고(계산식 페이지)", ""]],
        body: [["", notes.calc]],
      },
      { styles: { fontSize: 9.6, cellPadding: 2.6 } }
    );
  }

  footerNo(doc, pageNo);
}

/* ==================== ✅ 마스터용 렌더러 ==================== */
export async function renderHeatEx(doc, { building, reportMeta, report, schema, __page } = {}) {
  if (!doc) throw new Error("renderHeatEx: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const R = report?.heatEx ?? report ?? {};
  const rated = R.rated ?? {};
  const measured = R.measured ?? {};
  const notes = R.notes ?? R.sectionNotes ?? {};
  const photoSlots = R.photoSlots ?? report?.photoSlots ?? {};

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const placeLabel = report?.meta?.label || building?.label || "";
  const equipLabel = report?.meta?.suffixNo ? `#${report.meta.suffixNo}` : "";

  const totalPages = __page?.totalPages || 9999;
  let pageNo = __page?.pageNoStart || 1;

  // 1) 표지(현재 페이지)
  renderCover(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel,
    equipLabel,
    notes,
    engineer: reportMeta?.engineer || "",
  });

  // 2) 기준+현황
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
  renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto });

  // 3~5) 섹션 사진
  const secs = Array.isArray(schema) && schema.length ? schema : DEFAULT_SECTIONS;
  const secCount = Math.min(3, secs.length);

  for (let i = 0; i < secCount; i++) {
    const sec = secs[i];
    pageNo += 1;
    doc.addPage();
    await ensureFonts(doc);
    setKR(doc);

    pageChrome(doc, { title: sec?.title || `사진 점검 ${i + 1}`, page: pageNo, total: totalPages });
    const urls = await toUrls(sec?.slots || [], photoSlots);

    const resultLines = String(notes?.[sec?.noteKey] || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    photoGrid(doc, {
      title: "육안/측정 점검",
      rows: 2,
      cols: 2,
      items: sec?.slots || [],
      images: urls,
      resultLines,
    });

    footerNo(doc, pageNo);
  }

  // 6) 계산식(+도식)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  renderCalcPage(doc, { pageNo, totalPages, rated, measured, notes, equipLabel });

  return pageNo;
}

/* ==================== 단독 빌더 ==================== */
export async function buildHeatExPdf({ building, reportMeta, report, schema } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // 단독 기준 총 페이지: 표지1 + 기준1 + 섹션(최대3) + 계산1
  const secs = Array.isArray(schema) && schema.length ? schema : DEFAULT_SECTIONS;
  const totalPages = 1 + 1 + Math.min(3, secs.length) + 1;

  await ensureFonts(doc);
  setKR(doc);

  await renderHeatEx(doc, {
    building,
    reportMeta,
    report,
    schema,
    __page: { pageNoStart: 1, totalPages },
  });

  return doc.output("blob");
}
