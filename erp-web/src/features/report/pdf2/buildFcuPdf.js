// src/features/report/pdf2/buildFcuPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };
const BLACK = 0;

const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const S = (v) => (v == null ? "" : String(v));

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
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
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

    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) {
      return src.src ? await toDataUrlFlexible(src.src) : null;
    }
    if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) {
      return src.toDataURL("image/jpeg", 0.92);
    }

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

async function downscaleDataUrl(dataUrl, maxSide = 1800, quality = 0.9) {
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

async function firstSlotUrl(slots, id) {
  let v = slots?.[id];
  if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

  let src = v;
  if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
  if (Array.isArray(v)) src = v[0];
  if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

  const raw = await toDataUrlFlexible(src);
  return raw ? await downscaleDataUrl(raw, 1800, 0.9) : null;
}

/* ==================== 프레임/표 공통 ==================== */
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
      fontSize: 10.2,
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

/* ==================== 페이지: 표지 ==================== */
function renderCover(doc, { pageNo, totalPages, dateTxt, placeLabel, engineerName }) {
  pageChrome(doc, { title: "팬코일 유닛 성능 점검표", page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      body: [[
        { content: "점검자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } }, engineerName || "",
        { content: "점검일자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } }, dateTxt || "",
        { content: "설치위치", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } }, placeLabel || "",
      ]],
      columnStyles: {
        0: { cellWidth: 16 }, 1: { cellWidth: 32 },
        2: { cellWidth: 16 }, 3: { cellWidth: 32 },
        4: { cellWidth: 16 }, 5: { cellWidth: 34 },
      },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } }
  );

  const rows = [
    ["", "• 유지관리 점검표", "○"],
    ["", "• 노후 및 부식 상태", "○"],
    ["", "• 전동밸브 정상 작동 상태", "○"],
    ["", "• 조닝 설정 상태", "○"],
    ["", "• 팬코일 유닛 풍코일 조절 상태", "○"],
    ["", "• 필터 오염 상태", "○"],
  ];
  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 4,
      head: [["구 분", "점검내용", "점검결과"]],
      body: rows,
      columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 16 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 2,
      head: [["조치사항", ""]],
      body: [["<조치필요사항>", "• 없음"]],
      columnStyles: { 0: { cellWidth: 22 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 2,
      head: [["추진사항 목록", ""]],
      body: [
        ["1.", "팬코일 유닛 성능 점검 단계 및 점검 기준"],
        ["2.", "팬코일 유닛 측정 점검표(사진)"],
        ["3.", "팬코일유닛 점검 후 소음/풍속 데이터"],
      ],
      columnStyles: { 0: { cellWidth: 10 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  const guide =
    "1. 유지관리지침서와 기계설비 유지관리 및 성능 점검 대상 현황표의 적합 여부를 참고하여 점검결과를 작성한다.\n" +
    "2. 점검결과에는 [적합 ○, 부적합 ×, 해당없음 /]을 표기한다.\n" +
    "3. 현장사진에는 ‘점검표 + 사진’이 1페이지 이상 포함되도록 작성한다.\n" +
    "4. 팬코일 유닛은 호수/강의실 단위로 생성하여 작성한다.";

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || 0) + 2,
      head: [["작성 방법", ""]],
      body: [["", guide]],
      columnStyles: { 0: { cellWidth: 22 } },
    },
    { styles: { fontSize: 9.2, cellPadding: 2.6 } }
  );

  footerNo(doc, pageNo);
}

/* ==================== 페이지: 기준 + 현황/배치 사진(2단) ==================== */
async function renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto, layoutPhoto }) {
  pageChrome(doc, { title: "1. 팬코일 유닛 성능 점검 단계 및 점검 기준", page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검", "• 유지관리 점검표 접수 및 내용 확인\n• 노후 및 부식 상태\n• 전동밸브 정상 작동 상태\n• 조닝 설정 상태\n• 풍코일 조절 상태\n• 필터 오염 상태"],
      ["2. 측정 점검", "• 팬코일 유닛 흡입, 토출 공기 온도\n• 소음/풍속 측정(현장 조건에 따름)"],
      ["3. 점검 방법", "• 육안 점검: 현장 사진으로 정리\n• 측정 점검: 점검 기기로 측정"],
      ["4. 점검 기준", "• 국토부 별지 제3호 서식 점검표 기준(측정 항목은 현장 적용 기준 포함)"],
    ],
  });

  const baseY = doc.lastAutoTable?.finalY || (FRAME.T + 6);
  const H = doc.internal.pageSize.getHeight();

  const top = baseY + 8;
  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("현황/배치 사진", SAFE.L, top);
  doc.setFont("NotoSansKR", "normal");

  const boxY = top + 2;
  const boxW = innerWidth(doc);
  const footerReserve = 18;
  const boxH = Math.max(60, (H - FRAME.B) - footerReserve - boxY);

  const gap = 4;
  const halfW = (boxW - gap) / 2;
  const leftX = SAFE.L;
  const rightX = SAFE.L + halfW + gap;

  const pad = 3.0;
  const capH = 7;

  // 왼쪽: criteria_photo
  doc.setLineWidth(0.6);
  doc.rect(leftX, boxY, halfW, boxH, "S");
  doc.setLineWidth(0.2);

  const L_imgX = leftX + pad;
  const L_imgY = boxY + pad;
  const L_imgW = halfW - pad * 2;
  const L_imgH = boxH - capH - pad * 2;

  try {
    if (criteriaPhoto) addImageSafe(doc, criteriaPhoto, L_imgX, L_imgY, L_imgW, L_imgH);
    else throw new Error();
  } catch {
    doc.setDrawColor(190);
    doc.setLineDash([1, 1], 0);
    doc.rect(L_imgX, L_imgY, L_imgW, L_imgH, "S");
    doc.setLineDash();
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text("이미지 없음", L_imgX + L_imgW / 2, L_imgY + L_imgH / 2, { align: "center", baseline: "middle" });
    setKR(doc);
  }

  const L_capY = boxY + boxH - capH;
  doc.setDrawColor(210);
  doc.line(leftX, L_capY, leftX + halfW, L_capY);
  doc.setFontSize(9.6);
  doc.text("• 현황 사진", leftX + pad, L_capY + 4.6);

  // 오른쪽: layout(선택)
  doc.setLineWidth(0.6);
  doc.rect(rightX, boxY, halfW, boxH, "S");
  doc.setLineWidth(0.2);

  const R_imgX = rightX + pad;
  const R_imgY = boxY + pad;
  const R_imgW = halfW - pad * 2;
  const R_imgH = boxH - capH - pad * 2;

  try {
    if (layoutPhoto) addImageSafe(doc, layoutPhoto, R_imgX, R_imgY, R_imgW, R_imgH);
    else throw new Error();
  } catch {
    doc.setDrawColor(190);
    doc.setLineDash([1, 1], 0);
    doc.rect(R_imgX, R_imgY, R_imgW, R_imgH, "S");
    doc.setLineDash();
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text("배치도(선택)", R_imgX + R_imgW / 2, R_imgY + R_imgH / 2, { align: "center", baseline: "middle" });
    setKR(doc);
  }

  const R_capY = boxY + boxH - capH;
  doc.setDrawColor(210);
  doc.line(rightX, R_capY, rightX + halfW, R_capY);
  doc.setFontSize(9.6);
  doc.text("• 배치도/도면(선택)", rightX + pad, R_capY + 4.6);

  footerNo(doc, pageNo);
}

/* ==================== 페이지: 호수별 “사진만” 테이블 ==================== */
async function renderUnitPhotoTablePage(doc, { title, pageNo, totalPages, units, slotIds }) {
  pageChrome(doc, { title, page: pageNo, total: totalPages });

  const imageMap = []; // row index -> {room, noise, wind, graph}
  const rows = [];

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const ps = u?.photoSlots || {};
    const roomImg = await firstSlotUrl(ps, slotIds.room);
    const noiseImg = await firstSlotUrl(ps, slotIds.noise);
    const windImg = await firstSlotUrl(ps, slotIds.wind);
    const graphImg = await firstSlotUrl(ps, slotIds.graph);

    imageMap.push({ roomImg, noiseImg, windImg, graphImg });

    rows.push([
      S(u._seq),
      S(u.no),
      "", "", "", "", // 이미지 4칸(텍스트 제거)
      S(u.fields?.note || ""),
    ]);
  }

  const startY = FRAME.T + 10;

  autoTable(doc, {
    startY,
    theme: "grid",
    tableWidth: innerWidth(doc),
    margin: { left: SAFE.L, right: SAFE.R },
    pageBreak: "avoid",
    styles: { font: "NotoSansKR", fontSize: 9.0, textColor: 0, lineWidth: 0.2, cellPadding: 1.6, valign: "middle" },
    headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: 0 },
    head: [[
      "순번",
      "호수",
      "호수사진",
      "소음사진",
      "풍속사진",
      "그래프",
      "비고",
    ]],
    body: rows,
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 34 },
      6: { cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index >= 2 && data.column.index <= 5) {
        data.cell.text = "";
        data.cell.styles.minCellHeight = 30;
        data.cell.styles.cellPadding = 1.2;
      }
      if (data.section === "body" && data.column.index === 6) {
        data.cell.styles.fontSize = 8.6;
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;

      const r = data.row.index;
      const col = data.column.index;
      if (col < 2 || col > 5) return;

      const cell = data.cell;
      const pad = 1.2;
      const imgX = cell.x + pad;
      const imgY = cell.y + pad;
      const imgW = cell.width - pad * 2;
      const imgH = cell.height - pad * 2;

      const map = imageMap[r] || {};
      let img = null;
      if (col === 2) img = map.roomImg;
      if (col === 3) img = map.noiseImg;
      if (col === 4) img = map.windImg;
      if (col === 5) img = map.graphImg;

      try {
        if (img) addImageSafe(doc, img, imgX, imgY, imgW, imgH);
        else {
          doc.setDrawColor(190);
          doc.setLineDash([1, 1], 0);
          doc.rect(imgX, imgY, imgW, imgH, "S");
          doc.setLineDash();
          doc.setTextColor(120);
          doc.setFontSize(8.3);
          doc.text("이미지 없음", imgX + imgW / 2, imgY + imgH / 2, { align: "center", baseline: "middle" });
          setKR(doc);
        }
      } catch {
        // ignore
      }
    },
  });

  footerNo(doc, pageNo);
}

/* ==================== 페이지: 전체 데이터 요약(수치 전용) ==================== */
function renderSummaryPage(doc, { pageNo, totalPages, units }) {
  pageChrome(doc, { title: "팬코일유닛 점검 후 소음/풍속 데이터", page: pageNo, total: totalPages });

  const half = Math.ceil(units.length / 2);
  const left = units.slice(0, half);
  const right = units.slice(half);

  // ✅ 오른쪽이 비면 1단(6칸)으로 출력 → "순번"이 두 번 안 뜸
  if (right.length === 0) {
    const rows = left.map((a) => [
      a ? S(a._seq) : "",
      a ? S(a.no) : "",
      a ? S(a.fields?.noiseDb) : "",
      a ? S(a.fields?.wind1) : "",
      a ? S(a.fields?.wind2) : "",
      a ? S(a.fields?.wind3) : "",
    ]);

    autoTable(doc, {
      startY: FRAME.T + 10,
      theme: "grid",
      tableWidth: innerWidth(doc),
      margin: { left: SAFE.L, right: SAFE.R },
      pageBreak: "avoid",
      styles: { font: "NotoSansKR", fontSize: 8.0, cellPadding: 1.2, textColor: 0, lineWidth: 0.2, valign: "middle" },
      headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: 0 },
      head: [["순번", "호수", "소음(dB)", "풍속1", "풍속2", "풍속3"]],
      body: rows,
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
      },
    });

    footerNo(doc, pageNo);
    return;
  }

  // ✅ 2단(12칸)
  const rows = [];
  const max = Math.max(left.length, right.length);

  for (let i = 0; i < max; i++) {
    const a = left[i];
    const b = right[i];
    rows.push([
      a ? S(a._seq) : "",
      a ? S(a.no) : "",
      a ? S(a.fields?.noiseDb) : "",
      a ? S(a.fields?.wind1) : "",
      a ? S(a.fields?.wind2) : "",
      a ? S(a.fields?.wind3) : "",

      b ? S(b._seq) : "",
      b ? S(b.no) : "",
      b ? S(b.fields?.noiseDb) : "",
      b ? S(b.fields?.wind1) : "",
      b ? S(b.fields?.wind2) : "",
      b ? S(b.fields?.wind3) : "",
    ]);
  }

  autoTable(doc, {
    startY: FRAME.T + 10,
    theme: "grid",
    tableWidth: innerWidth(doc),
    margin: { left: SAFE.L, right: SAFE.R },
    pageBreak: "avoid",
    styles: { font: "NotoSansKR", fontSize: 8.0, cellPadding: 1.2, textColor: 0, lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: 0 },
    head: [[
      "순번", "호수", "소음(dB)", "풍속1", "풍속2", "풍속3",
      "순번", "호수", "소음(dB)", "풍속1", "풍속2", "풍속3",
    ]],
    body: rows,
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 13, halign: "center" },
      2: { cellWidth: 13, halign: "center" },
      3: { cellWidth: 11, halign: "center" },
      4: { cellWidth: 11, halign: "center" },
      5: { cellWidth: 11, halign: "center" },
      6: { cellWidth: 9, halign: "center" },
      7: { cellWidth: 13, halign: "center" },
      8: { cellWidth: 13, halign: "center" },
      9: { cellWidth: 11, halign: "center" },
      10: { cellWidth: 11, halign: "center" },
      11: { cellWidth: 11, halign: "center" },
    },
  });

  footerNo(doc, pageNo);
}

/* ==================== helpers ==================== */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeUnits(v) {
  const unitsRaw = Array.isArray(v?.units) ? v.units : [];
  return unitsRaw.map((u, i) => ({
    ...u,
    _seq: i + 1,
    no: S(u?.no),
    fields: u?.fields || {},
    photoSlots: u?.photoSlots || {},
  }));
}

function pickMetaPlace(building, reportMeta, report) {
  return building?.place || reportMeta?.placeLabel || report?.meta?.label || "";
}

/* ==================== ✅ 마스터용 렌더러 ==================== */
export async function renderFcu(doc, { building, reportMeta, report, schema, __page } = {}) {
  if (!doc) throw new Error("renderFcu: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const v = report?.fcu ?? report ?? {};
  const units = normalizeUnits(v);

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const unitsPerPage = N(schema?.pdf?.unitsPerPage) > 0 ? N(schema.pdf.unitsPerPage) : 5;
  const unitPages = Math.max(1, Math.ceil(units.length / Math.max(1, unitsPerPage)));

  const totalPages =
    __page?.totalPages ||
    (1 + 1 + unitPages + 1); // cover + criteria + unit photo pages + summary

  let pageNo = __page?.pageNoStart || 1;

  // 1) 표지(현재 페이지)
  renderCover(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel: pickMetaPlace(building, reportMeta, report),
    engineerName: reportMeta?.engineer || "",
  });

  // 2) 기준 + 현황/배치도
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  const topSlots = v.photoSlots || {};
  const criteriaPhoto = await firstSlotUrl(topSlots, "criteria_photo");
  const layoutPhoto = await firstSlotUrl(topSlots, "layout_photo"); // 옵션
  await renderCriteriaWithPhoto(doc, { pageNo, totalPages, criteriaPhoto, layoutPhoto });

  // 3) 호수별 사진 테이블(수치 X)
  const pages = chunk(units, Math.max(1, unitsPerPage));
  for (let i = 0; i < pages.length; i++) {
    const group = pages[i];
    pageNo += 1;
    doc.addPage();
    await ensureFonts(doc);
    setKR(doc);

    const startSeq = group[0]?._seq ?? 1;
    const endSeq = group[group.length - 1]?._seq ?? startSeq;

    await renderUnitPhotoTablePage(doc, {
      title: `2. 팬코일유닛 측정 점검표 #${startSeq}~${endSeq}`,
      pageNo,
      totalPages,
      units: group,
      // ✅ fcuSchema 기준 slot id에 맞춤 (사진 안나오던 원인 해결)
      slotIds: {
        room: "roomSign", // 객실번호/호수
        noise: "noise",   // 소음 측정
        wind: "wind",     // 풍속 측정
        graph: "graph",   // 그래프
      },
    });
  }

  // 4) 요약(수치만)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  renderSummaryPage(doc, { pageNo, totalPages, units });

  return pageNo;
}

/* ==================== 단독 빌더 ==================== */
export async function buildFcuPdf({ building, reportMeta, report, schema } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  const v = report?.fcu ?? report ?? {};
  const units = normalizeUnits(v);

  const unitsPerPage = N(schema?.pdf?.unitsPerPage) > 0 ? N(schema.pdf.unitsPerPage) : 5;
  const unitPages = Math.max(1, Math.ceil(units.length / Math.max(1, unitsPerPage)));
  const totalPages = 1 + 1 + unitPages + 1;

  await renderFcu(doc, {
    building,
    reportMeta,
    report,
    schema,
    __page: { pageNoStart: 1, totalPages },
  });

  return doc.output("blob");
}
