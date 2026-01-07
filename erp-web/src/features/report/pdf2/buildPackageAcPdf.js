// src/features/report/pdf2/buildPackageAcPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  // ✅ 이 형태는 너 프로젝트에서 계속 쓰던 방식(유지)
  doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal", "Identity-H");
  doc.addFont("NotoSansKR-Bold.ttf", "NotoSansKR", "bold", "Identity-H");
}

function setKR(doc) {
  doc.setFont("NotoSansKR", "normal");
  doc.setTextColor(0);
  doc.setDrawColor(0);
}

/* ───────────────── 설치위치 resolve (건물명 강제 방지) ───────────────── */
function resolveInstallLocation({ building, reportMeta, report, v }) {
  const rm = reportMeta || {};
  const r = report || {};
  const meta = r.meta || v?.meta || {};

  const pick =
    rm.installLocation ||
    rm.location ||
    rm.place ||
    meta.installLocation ||
    meta.location ||
    meta.place ||
    (typeof meta.label === "string" ? meta.label : "") ||
    building?.location ||
    building?.address ||
    ""; // ✅ 마지막 fallback에서도 building.name은 쓰지 않게 (원하면 맨 끝에 building.name 추가 가능)

  return String(pick || "");
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

async function firstPhotoUrlWithFallback(photoSlots, primaryId, fallbackIds = []) {
  const p = await firstPhotoUrl(photoSlots, primaryId);
  if (p) return p;
  for (const id of fallbackIds) {
    const x = await firstPhotoUrl(photoSlots, id);
    if (x) return x;
  }
  return null;
}

async function toUrls(schema = [], photoSlots = {}) {
  return Promise.all(
    schema.map(async (s) => {
      let v = photoSlots?.[s.id];
      if (typeof HTMLInputElement !== "undefined" && v instanceof HTMLInputElement) v = v.files?.[0] ?? null;

      let src = v;
      if (typeof FileList !== "undefined" && src instanceof FileList) src = src[0];
      if (Array.isArray(src)) src = src[0];
      if (src && typeof src === "object" && !(src instanceof Blob)) src = src.dataUrl || src.file || src.url || src.src || src;

      const raw = await toDataUrlFlexible(src);
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

/* ✅ 핵심 수정: autoTable 옵션 병합을 "깊은 병합"으로 (font 안 날아가게) */
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
        bodyStyles: { ...base.bodyStyles, ...(styleOverride.bodyStyles || {}) },
      }
    : base;

  const finalOpt = {
    ...merged,
    ...opt,
    // ✅ styles류는 반드시 깊게 합치기 (opt.styles가 font를 덮어쓰지 못하게)
    styles: { ...merged.styles, ...(opt?.styles || {}) },
    headStyles: { ...merged.headStyles, ...(opt?.headStyles || {}) },
    bodyStyles: { ...merged.bodyStyles, ...(opt?.bodyStyles || {}) },
    margin: { left: SAFE.L, right: SAFE.R },
    tableWidth: innerWidth(doc),
    didDrawPage: (data) => {
      // ✅ 페이지 넘어갈 때도 폰트 유지
      setKR(doc);
      if (typeof opt?.didDrawPage === "function") opt.didDrawPage(data);
    },
  };

  autoTable(doc, finalOpt);
}

/* ───────────────── 공통 메타(3컬럼) ───────────────── */
function renderMeta3(doc, { startY, engineer, dateTxt, installLocation }) {
  headBodyTable(doc, {
    startY,
    head: [["점검자", "점검일자", "설치위치"]],
    body: [[engineer || "", dateTxt || "", installLocation || ""]],
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: innerWidth(doc) - 60 },
    },
    styles: { fontSize: 9.2, cellPadding: 2.0 },
    pageBreak: "avoid",
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

/* ───────────────── 사진 슬롯 정의 ───────────────── */
const PK_VISUAL = [
  { id: "pk_maint_table", label: "유지 관리 점검표" },
  { id: "pk_outdoor_status", label: "실외기 외관/고정 상태" },
  { id: "pk_indoor_status", label: "실내기 필터 점검" },
  { id: "pk_overheat_status", label: "과열차단기 작동상태" },
];

const PK_MEASURE = [
  { id: "pk_filter", label: "실외기 가동 시 소음 측정" },
  { id: "pk_noise_meas", label: "실내기 가동 시 소음 측정" },
  { id: "pk_flow_meas", label: "실내기 풍량 측정" },
  { id: "pk_flow_graph", label: "풍량 조절 측정 결과" },
];

/* ───────────────── 전동기 소음도 표 ───────────────── */
const MOTOR_NOISE_TABLE = [
  { kw: "0.2", p2: 66, p4: 59, p6: "-", p8: "-" },
  { kw: "0.4", p2: 69, p4: 61, p6: 60, p8: 60 },
  { kw: "0.75", p2: 73, p4: 63, p6: 61, p8: 60 },
  { kw: "1.5", p2: 75, p4: 67, p6: 61, p8: 61 },
  { kw: "2.2", p2: 77, p4: 68, p6: 63, p8: 62 },
  { kw: "3.7", p2: 80, p4: 72, p6: 65, p8: 64 },
  { kw: "5.5", p2: 83, p4: 74, p6: 68, p8: 67 },
  { kw: "7.5", p2: 84, p4: 77, p6: 70, p8: 69 },
  { kw: "11", p2: 87, p4: 78, p6: 72, p8: 71 },
  { kw: "15", p2: 87, p4: 82, p6: 74, p8: 72 },
  { kw: "18.5", p2: 90, p4: 82, p6: 77, p8: 76 },
  { kw: "22", p2: 90, p4: 82, p6: 79, p8: 77 },
  { kw: "30", p2: 91, p4: 84, p6: 81, p8: 77 },
  { kw: "37", p2: 91, p4: 85, p6: 81, p8: 77 },
  { kw: "45", p2: 93, p4: 86, p6: 83, p8: 79 },
];

/* ───────────────── PAGE1: 점검표 ───────────────── */
function renderChecklistPage(doc, { pageNo, totalPages, dateTxt, installLocation, engineer, suffixNo = 1 }) {
  pageChrome(doc, { title: `패키지 에어컨 성능 점검표 #${suffixNo}`, page: pageNo, total: totalPages });

  // ✅ 메타 3컬럼(폰트 절대 안 깨지게 headBodyTable 수정됨)
  renderMeta3(doc, {
    startY: FRAME.T + 4,
    engineer: engineer || "",
    dateTxt: dateTxt || "",
    installLocation: installLocation || "",
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 22) + 2,
    head: [["구분", "점검내용", "점검결과"]],
    body: [
      ["점검항목", "• 유지 관리 점검표", "○"],
      ["", "• 실내기 및 실외기 소음 상태", "○"],
      ["", "• 실외기 고정 상태", "○"],
      ["", "• 과열차단기 작동 상태", "○"],
      ["", "• 송풍기 풍량 상태", "○"],
    ],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 26 } },
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 70) + 2,
    head: [["조치사항", "내용"]],
    body: [
      ["<미조치사항>", "• 없음"],
      ["<조치필요사항>", "• 없음"],
    ],
    columnStyles: { 0: { cellWidth: 26 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  headBodyTable(doc, {
    startY: (doc.lastAutoTable?.finalY || FRAME.T + 95) + 2,
    head: [["추진사항 목록", "내용"]],
    body: [
      ["1.", "패키지에어컨 성능 점검 단계 및 점검 기준"],
      ["2.", "패키지에어컨 육안 점검표"],
      ["3.", "패키지에어컨 측정 점검표"],
    ],
    columnStyles: { 0: { cellWidth: 16 } },
    styles: { fontSize: 9.4, cellPadding: 2.0 },
  });

  // 비고 + 작성방법 (하단 채우기)
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
    "5. 에어컨, 시스템에어컨, EHP, CDU 등을 포함하여 작성한다.",
  ];
  const inner = doc.splitTextToSize(lines.join("\n"), frameW - 10);
  doc.text(inner, FRAME.L + 5, writeTop + 13);

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE2: 단계/기준 + 현황사진 ───────────────── */
function renderCriteriaPage(doc, { pageNo, totalPages, outdoorPhoto, indoorPhoto, suffixNo = 1 }) {
  const H = doc.internal.pageSize.getHeight();

  pageChrome(doc, {
    title: `패키지 에어컨 성능 점검 단계 및 점검 기준 #${suffixNo}`,
    page: pageNo,
    total: totalPages,
  });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검", "• 유지관리 점검표 점수 및 내용 확인\n• 실외기 고정 상태\n• 과열차단기 작동 상태"],
      ["2. 측정 점검", "• 실내기 및 실외기 소음 상태"],
      ["3. 점검 방법", "• 현장 사진으로 정리\n• 점검기기로 측정"],
      ["4. 점검 기준", "• 국토부 별지 제3호 서식 점검표 기준\n• (측정) 국토부 별지 제3호 서식 점검표 기준에 의한 측정장비 활용"],
    ],
    styles: { fontSize: 9.6, cellPadding: 2.0 },
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 10) + 6;

  const boxW = innerWidth(doc);
  const gap = 6;
  const captionH = 7;
  const pad = 3;
  const footerReserve = 18;

  const availH = H - FRAME.B - footerReserve - startY;
  const boxH = Math.max(70, (availH - gap) / 2);

  const blocks = [
    { y: startY, photo: outdoorPhoto, cap: "• 현황 사진(실외기)" },
    { y: startY + boxH + gap, photo: indoorPhoto, cap: "• 현황 사진(실내기)" },
  ];

  blocks.forEach(({ y, photo, cap }) => {
    doc.setLineWidth(0.6);
    doc.rect(SAFE.L, y, boxW, boxH, "S");
    doc.setLineWidth(0.2);

    const imgX = SAFE.L + pad;
    const imgY = y + pad;
    const imgW = boxW - pad * 2;
    const imgH = boxH - pad * 2 - captionH;

    try {
      if (photo) addImageSafe(doc, photo, imgX, imgY, imgW, imgH);
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

    const capY = y + boxH - captionH;
    doc.setDrawColor(210);
    doc.line(SAFE.L, capY, SAFE.L + boxW, capY);
    setKR(doc);
    doc.setFontSize(9.6);
    doc.text(cap, SAFE.L + pad, capY + 4.5);
  });

  footerNo(doc, pageNo);
}

/* ───────────────── PAGE5: 결과 수치표(소음 + 전동기소음도만) ───────────────── */
function renderResultPage(doc, { pageNo, totalPages, meta, installLocation, data, suffixNo = 2 }) {
  pageChrome(doc, { title: `패키지에어컨 성능 점검 결과 수치표 #${suffixNo}`, page: pageNo, total: totalPages });

  const fullW = innerWidth(doc);

  // ✅ PAGE5도 메타 3컬럼으로 통일
  renderMeta3(doc, {
    startY: FRAME.T + 6,
    engineer: meta?.engineer || "",
    dateTxt: meta?.dateTxt || "",
    installLocation: installLocation || "",
  });

  const startY = (doc.lastAutoTable?.finalY || FRAME.T + 22) + 10;

  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("• 소음 측정", SAFE.L + 2, startY);

  headBodyTable(doc, {
    startY: startY + 4,
    head: [["측정 위치", "정격전력(kW)", "소음 기준[±10%]", "측정 소음값(dB)", "소음 상태"]],
    body: [
      ["실내기", data.indoorRatedKw || "", data.indoorStd || "49~69", data.indoorDb || "", data.indoorState || "양호"],
      ["실외기", data.outdoorRatedKw || "", data.outdoorStd || "75~95", data.outdoorDb || "", data.outdoorState || "양호"],
    ],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 36 },
      3: { cellWidth: 30 },
      4: { cellWidth: fullW - (22 + 24 + 36 + 30) },
    },
    styles: { fontSize: 9.0, cellPadding: 1.8 },
    pageBreak: "avoid",
  });

  const noiseTableY = (doc.lastAutoTable?.finalY || startY + 32) + 12;
  setKR(doc);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10.8);
  doc.text("전동기의 소음도", SAFE.L + 2, noiseTableY);

  headBodyTable(doc, {
    startY: noiseTableY + 3,
    head: [["정격출력[kW]", "2극", "4극", "6극", "8극"]],
    body: MOTOR_NOISE_TABLE.map((r) => [r.kw, r.p2, r.p4, r.p6, r.p8]),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: fullW - (28 + 22 + 22 + 22) },
    },
    styles: { fontSize: 9.0, cellPadding: 1.6 },
    pageBreak: "avoid",
  });

  footerNo(doc, pageNo);
}

/* ==================== ✅ 마스터용 렌더러 ==================== */
export async function renderPackageAc(doc, { building, reportMeta, report, __page } = {}) {
  if (!doc) throw new Error("renderPackageAc: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const totalPages = __page?.totalPages || 9999;
  let pageNo = __page?.pageNoStart || 1;

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  // ✅ report 포인터 보정
  const v = report?.packageAc ?? report ?? {};
  const noise = v.noise || {};
  const notes = v.notes || {};
  const photoSlots = v.photoSlots || report?.photoSlots || {};

  // ✅ 설치위치(건물명 고정 제거)
  const installLocation = resolveInstallLocation({ building, reportMeta, report, v });

  // PAGE1
  renderChecklistPage(doc, {
    pageNo,
    totalPages,
    dateTxt,
    installLocation,
    engineer: reportMeta?.engineer || "",
    suffixNo: 1,
  });

  // PAGE2
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  const outdoorPhoto = await firstPhotoUrlWithFallback(photoSlots, "criteria_outdoor", ["pk_outdoor_status", "criteria_photo"]);
  const indoorPhoto = await firstPhotoUrlWithFallback(photoSlots, "criteria_indoor", ["pk_indoor_status", "criteria_photo"]);

  renderCriteriaPage(doc, { pageNo, totalPages, outdoorPhoto, indoorPhoto, suffixNo: 1 });

  // PAGE3 (육안)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "패키지에어컨 육안 점검표 #1", page: pageNo, total: totalPages });
  const visualUrls = await toUrls(PK_VISUAL, photoSlots);
  const visualLines = String(notes.pk_visual_note || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  photoGrid(doc, { title: "육안 점검", items: PK_VISUAL, images: visualUrls, resultLines: visualLines });
  footerNo(doc, pageNo);

  // PAGE4 (측정)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  pageChrome(doc, { title: "패키지에어컨 측정 점검표 #1", page: pageNo, total: totalPages });
  const measureUrls = await toUrls(PK_MEASURE, photoSlots);
  const measureLines = String(notes.pk_measure_note || "특이사항 없음")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  photoGrid(doc, { title: "측정 점검", items: PK_MEASURE, images: measureUrls, resultLines: measureLines });
  footerNo(doc, pageNo);

  // PAGE5 (결과 수치표)
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  renderResultPage(doc, {
    pageNo,
    totalPages,
    meta: { engineer: reportMeta?.engineer || "", dateTxt },
    installLocation,
    suffixNo: 2,
    data: {
      indoorRatedKw: noise.indoorRatedKw ?? "",
      outdoorRatedKw: noise.outdoorRatedKw ?? "",
      indoorStd: noise.indoorStd ?? "49~69",
      outdoorStd: noise.outdoorStd ?? "75~95",
      indoorDb: noise.indoorDb ?? "",
      outdoorDb: noise.outdoorDb ?? "",
      indoorState: noise.indoorState ?? "양호",
      outdoorState: noise.outdoorState ?? "양호",
    },
  });

  return pageNo;
}

/* ───────────────── 단독 빌더 ───────────────── */
export async function buildPackageAcPdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  await ensureFonts(doc);
  setKR(doc);

  await renderPackageAc(doc, {
    building,
    reportMeta,
    report,
    __page: { pageNoStart: 1, totalPages: 5 },
  });

  return doc.output("blob");
}
