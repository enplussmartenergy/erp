// src/features/report/pdf2/buildPipePdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────── 공통 상수 ───────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };
const BLACK = 0;

const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const fmt2 = (n) => (Number.isFinite(+n) ? (+n).toFixed(2) : "");
const fmt1 = (n) => (Number.isFinite(+n) ? (+n).toFixed(1) : "");
const fmt3 = (n) => (Number.isFinite(+n) ? (+n).toFixed(3) : "");

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ───────── 한글 폰트 ───────── */
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
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
}

/* ───────── 이미지 유틸 ───────── */
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

    if (typeof src === "object" && !(src instanceof Blob)) {
      return await toDataUrlFlexible(src.dataUrl || src.file || src.url || src.src);
    }

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
        img.onerror = () => rej(new Error("blob 이미지 로드 실패"));
        img.src = src;
      });
    }

    if (src instanceof Blob) return await blobToDataUrl(src);

    if (typeof src === "string") {
      const r = await fetch(src, { cache: "no-store" });
      if (!r.ok) return null;
      const b = await r.blob();
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
    const any = Object.values(photoSlots || {}).flat().filter(Boolean);
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
      return raw ? await downscaleDataUrl(raw, 2000, 0.9) : null;
    })
  );
}

/* ───────── 표 공통 ───────── */
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

/* =========================================================
   photoGrid + slots
========================================================= */
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

const PIPE_VISUAL_1 = [
  { id: "pipe_maint_table", label: "유지 관리 점검표" },
  { id: "pipe_guide_shoe", label: "가이드 슈 상태" },
  { id: "pipe_exp_joint_cw", label: "신축이음(CW) 상태" },
  { id: "pipe_exp_joint_ws", label: "신축이음(WS) 상태" },
];

const PIPE_VISUAL_2 = [
  { id: "pipe_support_hvac_cw", label: "지지대 상태(공조/CW)" },
  { id: "pipe_support_mech_room", label: "지지대 상태(기계실)" },
  { id: "pipe_support_pit_hot_end", label: "지지대 상태(PIT Hot End)" },
  { id: "pipe_support_pit_ws_hot", label: "지지대 상태(PIT WS Hot)" },
];

function toLines(v) {
  return String(v || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ───────── 페이지 렌더 ───────── */
function renderCover(doc, { pageNo, totalPages, dateTxt, placeLabel, equipLabel, notes, engineer }) {
  pageChrome(doc, { title: `배관설비 성능 점검표${equipLabel ? ` ${equipLabel}` : ""}`, page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      body: [[
        { content: "점검자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } }, engineer || "",
        { content: "점검일자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } }, dateTxt || "",
        { content: "설치위치", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } }, placeLabel || "",
      ]],
      columnStyles: { 0:{cellWidth:16},1:{cellWidth:26},2:{cellWidth:16},3:{cellWidth:32},4:{cellWidth:16},5:{cellWidth:30} },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } }
  );

  const rows = [
    ["", "• 유지관리 점검표 확인", "○"],
    ["", "• 신축이음 상태", "○"],
    ["", "• 경과연수에 따른 노후 및 부식 상태", "○"],
    ["", "• 배관의 고정 지지 상태", "○"],
    ["", "• 배관 열교환/두께 측정 점검(Option)", "○"],
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
        ["1.", "배관설비 성능 점검 단계 및 점검 기준"],
        ["2.", "배관 설비 육안 점검"],
        ["3.", "배관 설비 측정 점검(Option)"],
        ["4.", "경과연수에 따른 노후 및 부식 상태"],
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

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 10) + 2,
      head: [["작성 방법", ""]],
      body: [
        ["1.", "유지관리기록서 및 기계실 배관 현황표를 참고하여 점검 결과를 작성한다."],
        ["2.", "점검결과에는 [적합 ○, 부적합 ×, 해당없음 /] 로 표기한다."],
      ],
      columnStyles: { 0: { cellWidth: 12 } },
    },
    { styles: { fontSize: 9.6, cellPadding: 2.0 } }
  );

  footerNo(doc, pageNo);
}

/* =========================================================
   ✅ 추가: “배관설비 성능 점검 단계 및 점검 기준” 페이지
   - criteria_photo 1장 크게
========================================================= */
function renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto }) {
  pageChrome(doc, { title: "1. 배관설비 성능 점검 단계 및 점검 기준", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검", "• 유지관리 점검표 확인\n• 신축이음 상태\n• 경과연수에 따른 노후 및 부식 상태\n• 배관의 고정 지지 상태"],
      ["2. 측정 점검", "• 배관 열교환/두께 측정 점검(Option)"],
      ["3. 점검 방법", "• 현장 사진으로 정리"],
      ["4. 점검 기준", "• 국토부 별지 제3호 서식 점검표 기준\n• 점검표 기준에 의한 측정장비 활용"],
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
    else throw new Error("no image");
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

/* ───────── 두께(Option) 페이지 ───────── */
function renderThicknessPage(doc, { pageNo, totalPages, measured, notes }) {
  pageChrome(doc, { title: "3. 배관 설비 측정 점검표 (Option)", page: pageNo, total: totalPages });

  const topY = FRAME.T + 8;
  const iw = innerWidth(doc);

  const leftW = Math.round(iw * 0.44);
  const rightW = iw - leftW - 6;

  const px = SAFE.L;
  const py = topY;
  const ph = 58;

  doc.setDrawColor(160);
  doc.rect(px, py, leftW, ph, "S");

  const thkPhotoUrl = measured?.thkPhotoUrl || null;
  try {
    if (thkPhotoUrl) addImageSafe(doc, thkPhotoUrl, px + 2.2, py + 2.2, leftW - 4.4, ph - 4.4);
    else throw new Error("no image");
  } catch {
    doc.setLineDash([1, 1], 0);
    doc.rect(px + 2.2, py + 2.2, leftW - 4.4, ph - 4.4, "S");
    doc.setLineDash();
    doc.setTextColor(120);
    doc.text("이미지 없음", px + leftW / 2, py + ph / 2, { align: "center", baseline: "middle" });
    setKR(doc);
  }

  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("• 배관 두께 측정 포인터", px + 3, py + ph + 6);

  const points = Array.isArray(measured?.points)
    ? measured.points
    : [
        ["", "", "", "", "", ""],
        ["", "", "", "", "", ""],
        ["", "", "", "", "", ""],
      ];

  headBodyTable(doc, {
    startY: topY,
    margin: { left: SAFE.L + leftW + 6, right: SAFE.R },
    tableWidth: rightW,
    head: [["두께(mm)", "1호기", "2호기", "3호기"]],
    body: [1, 2, 3, 4, 5, 6].map((pIdx) => [
      `${pIdx} point`,
      points?.[0]?.[pIdx - 1] ?? "",
      points?.[1]?.[pIdx - 1] ?? "",
      points?.[2]?.[pIdx - 1] ?? "",
    ]),
    styles: { fontSize: 9.6, cellPadding: 2.1 },
    headStyles: { fillColor: [243, 244, 246], fontStyle: "bold" },
    pageBreak: "avoid",
  });

  const pipeSpec = measured?.pipeSpec || "";
  const nominal = N(measured?.nominalThk);
  const years = Math.max(0.0001, N(measured?.usedYears || 0));
  const allowRatio = Math.max(0, N(measured?.allowRatio || 40));
  const allowMin = nominal * (allowRatio / 100);

  const baseStd = measured?.baseStd || "ASME B31.3";
  const tReq = N(measured?.tReq);
  const ca = N(measured?.ca);

  const minOf = (arr) => {
    const nums = (arr || []).map(N).filter((x) => Number.isFinite(x) && x > 0);
    return nums.length ? Math.min(...nums) : 0;
  };

  const rowMin = [0, 1, 2].map((i) => minOf(points[i]));
  const corRate = rowMin.map((m) => (nominal > 0 && m > 0 ? (nominal - m) / years : 0));
  const remain = rowMin.map((m, i) => (corRate[i] > 0 ? Math.max(0, (m - allowMin) / corRate[i]) : 0));

  const summaryY = Math.max((doc.lastAutoTable?.finalY || topY + ph) + 10, topY + ph + 18);

  const cwBase = { 0: 14, 1: 16, 2: 18, 3: 24, 4: 18, 5: 24, 6: 24, 7: 20 };
  const sumBase = Object.values(cwBase).reduce((a, b) => a + b, 0);
  const extra = Math.max(0, iw - sumBase);
  const cw = { ...cwBase, 7: cwBase[7] + extra };

  headBodyTable(doc, {
    startY: summaryY,
    tableWidth: iw,
    margin: { left: SAFE.L, right: SAFE.R },
    head: [[
      "구분",
      "배관",
      "공칭두께\n(mm)",
      "측정 최소두께\n(mm)",
      "사용연수\n(year)",
      "최소허용두께\n(mm)",
      "최대 침식율\n(mm/year)",
      "추정 잔존수명",
    ]],
    body: [
      ["1호기", pipeSpec, nominal ? fmt2(nominal) : "", rowMin[0] ? fmt2(rowMin[0]) : "", fmt1(years), allowMin ? fmt2(allowMin) : "", corRate[0] ? fmt3(corRate[0]) : "", remain[0] ? `${fmt2(remain[0])}년` : ""],
      ["2호기", pipeSpec, nominal ? fmt2(nominal) : "", rowMin[1] ? fmt2(rowMin[1]) : "", fmt1(years), allowMin ? fmt2(allowMin) : "", corRate[1] ? fmt3(corRate[1]) : "", remain[1] ? `${fmt2(remain[1])}년` : ""],
      ["3호기", pipeSpec, nominal ? fmt2(nominal) : "", rowMin[2] ? fmt2(rowMin[2]) : "", fmt1(years), allowMin ? fmt2(allowMin) : "", corRate[2] ? fmt3(corRate[2]) : "", remain[2] ? `${fmt2(remain[2])}년` : ""],
    ],
    styles: { fontSize: 8.4, cellPadding: 1.6 },
    columnStyles: Object.fromEntries(Object.entries(cw).map(([k, w]) => [k, { cellWidth: w }])),
    pageBreak: "avoid",
  });

  const calcY = (doc.lastAutoTable?.finalY || summaryY) + 4;

  const calcLines = [
    `• 기준: ${baseStd || "-"}`,
    `• 배관 규격: ${pipeSpec || "-"}`,
    `• 공칭두께 (t_nom) = ${nominal ? `${fmt2(nominal)} mm` : "-"}`,
    `• 최소허용두께 (t_allow) = t_nom × (${allowRatio}%/100) = ${allowMin ? `${fmt2(allowMin)} mm` : "-"}`,
    tReq ? `• 설계 최소두께(t_req) = ${fmt2(tReq)} mm` : `• 설계 최소두께(t_req) =`,
    ca ? `• 부식여유(CA) = ${fmt2(ca)} mm` : `• 부식여유(CA) =`,
    "",
    `• 침식율(mm/year) = (t_nom - t_min) / 사용연수`,
    `• 추정 잔존수명(year) = (t_min - t_allow) / 침식율`,
    "",
    `판정(예시)`,
    `- t_min > t_allow : 양호(잔존 두께 확보)`,
    `- 침식율 증가 시 : 점검주기 단축/보수·교체 검토`,
  ].join("\n");

  headBodyTable(doc, {
    startY: calcY,
    tableWidth: iw,
    margin: { left: SAFE.L, right: SAFE.R },
    head: [["계산식 / 판정"]],
    body: [[calcLines]],
    styles: { fontSize: 9.0, cellPadding: 2.2, overflow: "linebreak" },
    headStyles: { fillColor: [243, 244, 246], fontStyle: "bold" },
    pageBreak: "avoid",
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || calcY) + 4,
    tableWidth: iw,
    margin: { left: SAFE.L, right: SAFE.R },
    head: [["점검 결과 사항", ""]],
    body: [["", notes?.measure || ""]],
    styles: { fontSize: 9.6, cellPadding: 2.6 },
  });

  footerNo(doc, pageNo);
}

/* =========================================================
   육안 페이지 렌더러
========================================================= */
async function renderVisualPage(doc, { pageNo, totalPages, title, slots, photoSlots, noteText }) {
  pageChrome(doc, { title, page: pageNo, total: totalPages });

  const urls = await toUrls(slots, photoSlots);
  const lines = toLines(noteText);

  photoGrid(doc, { title: "육안 점검", items: slots, images: urls, resultLines: lines });
  footerNo(doc, pageNo);
}

/* ───────── 노후/부식 기준 페이지(간단 버전 placeholder) ───────── */
function renderAgingCalcPage(doc, { pageNo, totalPages }) {
  pageChrome(doc, { title: "4. 경과연수에 따른 노후 및 부식 상태", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 8,
    head: [["구분", "점검 내용"]],
    body: [[
      "점검 방법",
      [
        "• 배관 계통도를 참고하여 샘플 측정 포인트를 정함(5개소 내외)",
        "• 초음파 두께 측정기로 측정한 배관의 최소 측정두께를 고려하여 연간 최대 침식 속도 산정",
        "• 최소허용두께(현장 기준)로 잔존수명을 평가",
      ].join("\n"),
    ]],
    styles: { fontSize: 9.6, cellPadding: 2.4 },
    columnStyles: { 0: { cellWidth: 26 } },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 70) + 8,
    head: [["점검 결과 사항", ""]],
    body: [["", ""]],
    styles: { fontSize: 9.6, cellPadding: 2.6 },
  });

  footerNo(doc, pageNo);
}

/* ==================== ✅ 마스터 합본용 렌더러 ==================== */
export async function renderPipe(doc, { building, reportMeta, report, schema, __page } = {}) {
  if (!doc) throw new Error("renderPipe: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const totalPages = __page?.totalPages || 9999;
  let pageNo = __page?.pageNoStart || 1;

  const R = report?.pipe ?? report ?? {};
  const notes = R.notes ?? {};
  const measured = R.measured ?? {};
  const photoSlots = R.photoSlots ?? report?.photoSlots ?? {};

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const placeLabel = report?.meta?.label || building?.label || "";
  const equipLabel = report?.meta?.suffixNo ? `#${report.meta.suffixNo}` : "";
  const engineer = reportMeta?.engineer || "";

  // 1) 표지
  renderCover(doc, { pageNo, totalPages, dateTxt, placeLabel, equipLabel, notes, engineer });

  // ✅ 2) 배관설비 성능 점검 단계 및 점검 기준 + 현황사진(criteria_photo)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
    renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto });
  }

  // 3) 배관 설비 육안 점검표 #1
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  await renderVisualPage(doc, {
    pageNo,
    totalPages,
    title: "2. 배관 설비 육안 점검표 #1",
    slots: PIPE_VISUAL_1,
    photoSlots,
    noteText: notes?.visual1,
  });

  // 4) 배관 설비 육안 점검표 #2
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  await renderVisualPage(doc, {
    pageNo,
    totalPages,
    title: "2. 배관 설비 육안 점검표 #2",
    slots: PIPE_VISUAL_2,
    photoSlots,
    noteText: notes?.visual2,
  });

  // 5) 두께 측정(Option)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    const thkPhoto = await firstPhotoUrl(photoSlots, "pipe_thk_points");
    const measured2 = { ...measured, thkPhotoUrl: thkPhoto };
    renderThicknessPage(doc, { pageNo, totalPages, measured: measured2, notes });
  }

  // 6) 노후/부식 기준
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  {
    renderAgingCalcPage(doc, { pageNo, totalPages });
  }

  return pageNo;
}

/* ───────── 단독 빌더 ───────── */
export async function buildPipePdf({ building, reportMeta, report, schema } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  // ✅ 페이지 구성(6p): 표지(1) + 기준(2) + 육안#1(3) + 육안#2(4) + 두께(5) + 노후(6)
  await renderPipe(doc, {
    building,
    reportMeta,
    report,
    schema,
    __page: { pageNoStart: 1, totalPages: 6 },
  });

  return doc.output("blob");
}
