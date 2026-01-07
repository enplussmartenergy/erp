// src/features/report/pdf2/buildWasteWaterPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────────────── 공통 상수/유틸 ───────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ==== 한글 폰트 로더 (drainVent와 동일) ==== */
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
  if (!_cached.regular)
    _cached.regular = await fetchFontB64("/fonts/NotoSansKR-Regular.ttf");
  if (!_cached.bold)
    _cached.bold = await fetchFontB64("/fonts/NotoSansKR-Bold.ttf");

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

/* ==================== 이미지 유틸 (drainVent와 동일) ==================== */
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
    if (typeof FileList !== "undefined" && src instanceof FileList)
      return await toDataUrlFlexible(src[0]);
    if (
      typeof HTMLImageElement !== "undefined" &&
      src instanceof HTMLImageElement
    )
      return src.src ? await toDataUrlFlexible(src.src) : null;
    if (
      typeof HTMLCanvasElement !== "undefined" &&
      src instanceof HTMLCanvasElement
    )
      return src.toDataURL("image/jpeg", 0.92);
    if (typeof src === "object" && !(src instanceof Blob))
      return await toDataUrlFlexible(
        src.dataUrl || src.file || src.url || src.src
      );
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
      if (src.type && /image\/hei(c|f)/i.test(src.type))
        throw new Error("HEIC_NOT_SUPPORTED");
      return await blobToDataUrl(src);
    }
    if (typeof src === "string") {
      const r = await fetch(src, { cache: "no-store" });
      if (!r.ok) return null;
      const b = await r.blob();
      if (b.type && /image\/hei(c|f)/i.test(b.type))
        throw new Error("HEIC_NOT_SUPPORTED");
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

async function toUrls(schemaSlots, photoSlots) {
  return Promise.all(
    (schemaSlots || []).map(async (s) => {
      let v = photoSlots?.[s.id];
      if (
        typeof HTMLInputElement !== "undefined" &&
        v instanceof HTMLInputElement
      )
        v = v.files?.[0] ?? null;

      let src = v;
      if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
      if (Array.isArray(v)) src = v[0];
      if (src && typeof src === "object" && !(src instanceof Blob))
        src = src.dataUrl || src.file || src.url || src.src || src;

      const raw = await toDataUrlFlexible(src);
      return raw ? await downscaleDataUrl(raw) : null;
    })
  );
}

async function firstPhotoUrl(photoSlots, id) {
  let v = photoSlots?.[id];
  if (
    typeof HTMLInputElement !== "undefined" &&
    v instanceof HTMLInputElement
  )
    v = v.files?.[0] ?? null;

  let src = v;
  if (typeof FileList !== "undefined" && v instanceof FileList) src = v[0];
  if (Array.isArray(v)) src = v[0];
  if (src && typeof src === "object" && !(src instanceof Blob))
    src = src.dataUrl || src.file || src.url || src.src || src;

  let raw = await toDataUrlFlexible(src);
  if (!raw) {
    const any = Object.values(photoSlots || {}).flat();
    if (any.length)
      raw = await toDataUrlFlexible(
        any[0]?.dataUrl || any[0]?.file || any[0]?.url || any[0]?.src || any[0]
      );
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
  doc.text(`페이지 ${page}/${total}`, W - (FRAME.R + 8), 16, {
    align: "right",
  });
  doc.setLineWidth(0.6);
  doc.rect(
    FRAME.L,
    FRAME.T,
    W - (FRAME.L + FRAME.R),
    H - (FRAME.T + FRAME.B),
    "S"
  );
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
      textColor: 0,
      lineWidth: 0.2,
      overflow: "linebreak",
      cellWidth: "wrap",
      valign: "middle",
    },
    headStyles: {
      fillColor: [243, 244, 246],
      fontStyle: "bold",
      textColor: 0,
    },
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
    margin: opt?.margin ? opt.margin : { left: SAFE.L, right: SAFE.R },
    tableWidth: opt?.tableWidth ? opt.tableWidth : innerWidth(doc),
  });
}

/* ==================== 사진 그리드 ==================== */
function photoGrid(
  doc,
  {
    title = "육안 점검",
    top = 32,
    rows = 2,
    cols = 2,
    gap = 5,
    captionH = 6,
    items = [],
    images = [],
    resultLines = [],
  }
) {
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, SAFE.L + 2, top - 4);
  doc.setFont("NotoSansKR", "normal");

  const lines = Math.max(
    1,
    resultLines && resultLines.length ? resultLines.length : 1
  );
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
      doc.text("이미지 없음", imgX + imgW / 2, imgY + imgH / 2, {
        align: "center",
        baseline: "middle",
      });
      setKR(doc);
    }

    const capY = y + cellH - captionH;
    doc.text(`• ${it?.label || ""}`, x + 2.2, capY + 4.2);
  }

  headBodyTable(doc, {
    startY: top + gridH + 4,
    head: [["점검", "결과 사항"]],
    body: [
      ["•", resultLines.length ? resultLines.join("\n") : "특이사항 없음"],
    ],
    columnStyles: { 0: { cellWidth: 18 } },
    pageBreak: "avoid",
  });
}

/* ==================== 표지 페이지 ==================== */
function renderCover(doc, { pageNo, totalPages, dateTxt, placeLabel, engineer }) {
  pageChrome(doc, {
    title: "오수 정화 설비 성능 점검표",
    page: pageNo,
    total: totalPages,
  });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      head: [["점검자", "점검일자", "설치위치"]],
      body: [[engineer || "", dateTxt || "", placeLabel || ""]],
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 34 },
        2: { cellWidth: "auto" },
      },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } }
  );

  const rows = [
    ["", "• 유지관리 점검표 확인", "○"],
    ["", "• 컨트롤 판넬, 수위제어, 계기류 상태", "○"],
    ["", "• 처리시스템의 정상 운전 상태", "○"],
    ["", "• 정보장치 상태", "○"],
    ["", "• 정화조 방류수 수질검사서 상태", "○"],
  ];

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 20) + 4,
      head: [["구 분", "점검내용", "점검결과"]],
      body: rows,
      columnStyles: { 0: { cellWidth: 16 }, 2: { cellWidth: 18 } },
    },
    { styles: { fontSize: 9.6, cellPadding: 2 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 50) + 2,
      head: [["조치사항", "내용"]],
      body: [
        ["<미조치사항>", "없음"],
        ["<조치필요사항>", "없음"],
      ],
      columnStyles: { 0: { cellWidth: 26 } },
    },
    { styles: { fontSize: 9.6, cellPadding: 2 } }
  );

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 80) + 2,
      head: [["추진사항 목록", "내용"]],
      body: [
        ["1.", "오수 정화 설비 성능 점검 단계 및 기준"],
        ["2.", "오수 정화 설비 육안 점검"],
        ["3.", "오수 정화 설비 방류수 검사 결과 확인"],
      ],
      columnStyles: { 0: { cellWidth: 10 } },
    },
    { styles: { fontSize: 9.6, cellPadding: 2 } }
  );

  const guide = [
    "1. 유지관리점검서와 기계설비 유지관리 및 성능점검 대상 현황표의 적합여부를 참고하여 점검결과를 작성한다.",
    "2. 점검결과에는 [적합 ○, 부적합 ×, 해당없음 /]을 표기한다.",
    "3. 방류수 검사 결과는 관련 법령 및 지침의 기준에 적합한지 여부를 함께 기재한다.",
  ].join("\n");

  headBodyTable(
    doc,
    {
      startY: (doc.lastAutoTable?.finalY || FRAME.T + 110) + 2,
      head: [["작성 방법", "내용"]],
      body: [["", guide]],
      columnStyles: { 0: { cellWidth: 26 } },
    },
    {
      styles: { fontSize: 9.4, cellPadding: 2.6 },
      headStyles: { fillColor: [243, 244, 246] },
    }
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

/* ==================== 기준 + 현황 사진 ==================== */
function renderCriteria(doc, { pageNo, totalPages, criteriaPhoto }) {
  pageChrome(doc, {
    title: "1. 오수 정화 설비 성능 점검 단계 및 점검 기준",
    page: pageNo,
    total: totalPages,
  });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 6,
      head: [["점검 단계", "점검 항목"]],
      body: [
        [
          "1. 육안 점검 (외관 확인)",
          "• 유지관리 점검표 확인\n" +
            "• 컨트롤 판넬, 수위제어, 계기류 상태\n" +
            "• 처리시스템 정상 운전 상태\n" +
            "• 정보장치 상태\n" +
            "• 정화조 방류수 수질검사서 확인",
        ],
        ["2. 측정 점검 (필요 시)", "• 방류수 샘플 채취 및 수질 측정 결과 확인"],
        ["3. 점검 방법", "• 현장 사진 및 점검표로 기록·보존"],
        ["4. 점검 기준", "• 관계 법령 및 국토부 등 관련 지침에 따른 기준 준수"],
      ],
    },
    { styles: { fontSize: 9.6, cellPadding: 2 } }
  );

  const H = doc.internal.pageSize.getHeight();
  const baseY = (doc.lastAutoTable?.finalY || FRAME.T + 50) + 6;
  const boxH = Math.max(60, H - FRAME.B - 6 - baseY);
  const pad = 3;
  const x = SAFE.L;
  const w = innerWidth(doc);

  doc.setLineWidth(0.6);
  doc.rect(x, baseY, w, boxH, "S");
  doc.setLineWidth(0.2);

  const imgX = x + pad;
  const imgY = baseY + pad;
  const imgW = w - pad * 2;
  const imgH = boxH - pad * 2 - 7;

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
    doc.text("현황 사진 없음", imgX + imgW / 2, imgY + imgH / 2, {
      align: "center",
      baseline: "middle",
    });
  }

  setKR(doc);
  doc.setFontSize(9.6);
  doc.text("• 현황 사진", x + pad, baseY + boxH - 4);

  footerNo(doc, pageNo);
}

/* ==================== 페이지 수 계산 ==================== */
function computeWasteWaterTotalPages(schema = []) {
  const sectionCount = Math.min(4, schema?.length || 0);
  return 2 + sectionCount; // 1(표지)+1(기준)+섹션
}

/* ==================== ✅ 합본용 렌더러 ==================== */
export async function renderWasteWater(doc, { building, reportMeta, report, schema = [], __page } = {}) {
  if (!doc) throw new Error("renderWasteWater: doc is required");

  await ensureFonts(doc);
  setKR(doc);

  const totalPages = __page?.totalPages || computeWasteWaterTotalPages(schema);
  let pageNo = __page?.pageNoStart || 1;

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  // PhotoOnlyForm 구조 호환
  const R = report?.photoOnly ?? report ?? {};
  const photoSlots = R.photoSlots ?? {};
  const notes = R.sectionNotes ?? {};

  const placeLabel = report?.meta?.label || building?.name || "";

  /* PAGE 1 : 표지 */
  renderCover(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel,
    engineer: reportMeta?.engineer || "",
  });

  /* PAGE 2 : 기준/현황 */
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);

  const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
  renderCriteria(doc, { pageNo, totalPages, criteriaPhoto });

  /* PAGE 3~ : 섹션 */
  const sectionCount = Math.min(4, schema?.length || 0);
  for (let i = 0; i < sectionCount; i++) {
    const sec = schema[i];
    const urls = await toUrls(sec?.slots, photoSlots);

    pageNo += 1;
    doc.addPage();
    await ensureFonts(doc);
    setKR(doc);

    pageChrome(doc, {
      title: sec?.title || "오수 정화 설비 육안 점검표",
      page: pageNo,
      total: totalPages,
    });

    const rawNote = notes?.[sec?.id] ?? notes?.[sec?.noteKey] ?? "";
    const resultLines = String(rawNote)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    photoGrid(doc, {
      title: "육안 점검",
      rows: sec?.rows ?? 2,
      cols: sec?.cols ?? 2,
      items: sec?.slots || [],
      images: urls,
      resultLines,
    });

    footerNo(doc, pageNo);
  }

  return pageNo;
}

/* ==================== 단독 빌더 ==================== */
export async function buildWasteWaterPdf({ building, reportMeta, report, schema = [] } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  await renderWasteWater(doc, {
    building,
    reportMeta,
    report,
    schema,
    __page: { pageNoStart: 1, totalPages: computeWasteWaterTotalPages(schema) },
  });

  return doc.output("blob");
}
