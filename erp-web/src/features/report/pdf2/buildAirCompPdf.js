import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ── 프레임/안전마진 ───────────────────────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 2, R: FRAME.R + 2 };

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ── 숫자/배열 유틸 ───────────────────────── */
const N = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
const mean = (arr = []) => {
  const v = arr.map(N).filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};
const ensure6 = (arr) => {
  const out = Array.isArray(arr) ? arr.slice(0, 6) : [];
  while (out.length < 6) out.push("");
  return out;
};

/* ── 한글 폰트 ───────────────────────────── */
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

/* ── 이미지 유틸 ─────────────────────────── */
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
  } catch (e) {
    console.warn("[toDataUrlFlexible] 실패:", e);
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
    schema.map(async (s) => {
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

/* ── 프레임/풋터 ─────────────────────────── */
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

/* ── 표 공통 ───────────────────────────── */
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

  autoTable(doc, {
    ...opt,
    ...merged,
    margin: { left: SAFE.L, right: SAFE.R },
    tableWidth: innerWidth(doc),
  });
}

/* ── 작성 방법 박스 ───────────────────────── */
function paragraphBoxFit(doc, { title, lines, left = SAFE.L, top, bottom = 16 }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const maxOuterH = Math.max(20, H - FRAME.B - bottom - top);

  setKR(doc);
  const headFS = 10.6,
    bodyFS = 9.6;
  const padTop = 6,
    padBottom = 6,
    padSide = 3.2,
    lineGap = 2.2;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(headFS);
  doc.text(title, left, top);

  const boxY = top + 2.5;
  const innerX = left + padSide;
  const innerW = W - SAFE.L - SAFE.R - padSide * 2;

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
  doc.rect(SAFE.L, boxY, W - SAFE.L - SAFE.R, boxH, "S");
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

/* ── 사진 그리드 ─────────────────────────── */
function photoGrid(doc, { title = "측정 점검", top = 32, left = SAFE.L, rows = 2, cols = 2, gap = 5, captionH = 6, items = [], images = [], resultLines = [] }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, left + 2, top - 4);
  doc.setFont("NotoSansKR", "normal");

  const lines = Math.max(1, resultLines?.length ? resultLines.length : 1);
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

    const r = Math.floor(i / cols),
      c = i % cols;
    const x = left + (cellW + gap) * c;
    const y = top + (cellH + gap) * r;

    doc.setDrawColor(160);
    doc.rect(x, y, cellW, cellH, "S");

    const pad = 2.2,
      imgX = x + pad,
      imgY = y + pad,
      imgW = cellW - pad * 2,
      imgH = cellH - captionH - pad * 2;

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

/* ── 페이지 컴포넌트 ───────────────────────── */
function renderInspectionCriteriaPage(doc, { pageNo, totalPages, title, photoDataUrl = null }) {
  const H = doc.internal.pageSize.getHeight();

  pageChrome(doc, { title, page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    head: [["점검 단계", "점검 항목"]],
    body: [
      ["1. 육안 점검 / 서류 확인", "• 유지 관리 점검표\n• 외부 케이싱 부식, 손상, 변형 상태\n• 전동 댐퍼(OA, EA, RA) 작동 상태\n• 동파방지 장치 작동 상태\n• 폐열회수장치 작동 상태\n• 소음, 진동 상태\n• 필터 오염 상태"],
      ["2. 측정 점검", "• SA·RA 풍속 및 풍량 측정\n• 부하율 측정\n• 필터차압 점검"],
      ["3. 점검 방법", "• 육안 점검: 현장 사진으로 정리\n• 측정 점검: 점검 기기로 측정"],
      ["4. 점검 기준", "• 국토부 별지 서식 점검표 기준\n• 국토부 별지 서식 점검표 기준에 의한 측정장비값 활용"],
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
  const boxH = Math.max(40, H - FRAME.B - footerReserve - boxY);

  doc.setLineWidth(0.6);
  doc.rect(SAFE.L, boxY, boxW, boxH, "S");
  doc.setLineWidth(0.2);

  const pad = 3.2,
    captionH = 7;
  const imgX = SAFE.L + pad,
    imgY = boxY + pad,
    imgW = boxW - pad * 2,
    imgH = boxH - captionH - pad * 2;

  try {
    if (photoDataUrl) addImageSafe(doc, photoDataUrl, imgX, imgY, imgW, imgH);
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

/* ── #8 결과/계산식 ───────────────────────── */
function renderResultsAndFormula(doc, { pageNo, totalPages, dateTxt, placeLabel, ahuLabel, rated, measured, suffix }) {
  pageChrome(doc, { title: `8. 공기조화기 성능 점검 결과 수치표 ${suffix}`, page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    body: [
      [
        { content: "점검일자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
        dateTxt || "",
        { content: "설치위치", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
        placeLabel || "",
        { content: ahuLabel || "AHU", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
        "",
      ],
    ],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 38 },
      2: { cellWidth: 22 },
      3: { cellWidth: 58 },
      4: { cellWidth: 18 },
      5: { cellWidth: 28 },
    },
  });

  headBodyTable(doc, {
    startY: doc.lastAutoTable?.finalY + 4,
    head: [["구분", "풍량[m³/h]", "정압[mmAq]", "소비전력[kW]", "설치년도"]],
    body: [
      ["급기", rated?.supply?.flow || "", rated?.supply?.sp || "", rated?.supply?.power || "", rated?.supply?.year || ""],
      ["환기", rated?.exhaust?.flow || "", rated?.exhaust?.sp || "", rated?.exhaust?.power || "", rated?.exhaust?.year || ""],
    ],
    columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 28 }, 2: { cellWidth: 22 }, 3: { cellWidth: 26 }, 4: { cellWidth: 22 } },
  });

  const sPts = ensure6(measured?.supply?.velPts);
  const ePts = ensure6(measured?.exhaust?.velPts);
  const sAvg = mean(sPts);
  const eAvg = mean(ePts);

  headBodyTable(doc, {
    startY: doc.lastAutoTable?.finalY + 4,
    head: [["구분", "1포인트", "2포인트", "3포인트", "4포인트", "5포인트", "6포인트", "평균[m/s]"]],
    body: [
      ["급기", ...sPts, sAvg ? sAvg.toFixed(2) : ""],
      ["환기", ...ePts, eAvg ? eAvg.toFixed(2) : ""],
    ],
    columnStyles: { 0: { cellWidth: 16 }, 7: { cellWidth: 22 } },
  });

  const sArea = N(measured?.supply?.w) * N(measured?.supply?.h);
  const eArea = N(measured?.exhaust?.w) * N(measured?.exhaust?.h);
  const sFlow = Math.round(sAvg * 3600 * (sArea || 0)) || 0;
  const eFlow = Math.round(eAvg * 3600 * (eArea || 0)) || 0;

  const kwPerA = (Math.sqrt(3) * 380 * 0.9 * 0.9) / 1000;
  const sMeasKW = N(measured?.current_supply || measured?.current) * kwPerA;
  const eMeasKW = N(measured?.current_exh) * kwPerA;

  const sRatedFlow = N(rated?.supply?.flow);
  const eRatedFlow = N(rated?.exhaust?.flow);
  const sRatedKW = N(rated?.supply?.power);
  const eRatedKW = N(rated?.exhaust?.power);

  const sFlowPct = sRatedFlow ? (sFlow / sRatedFlow) * 100 : null;
  const eFlowPct = eRatedFlow ? (eFlow / eRatedFlow) * 100 : null;
  const sPowerPct = sRatedKW && sMeasKW ? (sMeasKW / sRatedKW) * 100 : null;
  const ePowerPct = eRatedKW && eMeasKW ? (eMeasKW / eRatedKW) * 100 : null;

  headBodyTable(doc, {
    startY: doc.lastAutoTable?.finalY + 4,
    head: [["구분", "풍량[m³/h]", "정압[mmAq]", "소비전력[kW]", "덕트면적[m²]", "정격 대비 풍량[%]", "정격 대비 소비전력[%]"]],
    body: [
      ["급기", sFlow || "", measured?.extSP || "", sMeasKW ? sMeasKW.toFixed(2) : "", sArea ? sArea.toFixed(2) : "", sFlowPct != null ? sFlowPct.toFixed(2) : "", sPowerPct != null ? sPowerPct.toFixed(2) : ""],
      ["환기", eFlow || "", "", eMeasKW ? eMeasKW.toFixed(2) : "", eArea ? eArea.toFixed(2) : "", eFlowPct != null ? eFlowPct.toFixed(2) : "", ePowerPct != null ? ePowerPct.toFixed(2) : ""],
    ],
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { cellWidth: 24 },
      4: { cellWidth: 26 },
      5: { cellWidth: 26 },
      6: { cellWidth: 28 },
    },
  });

  const lines = [
    "풍량[m³/h] 계산 = 평균 측정 풍속 [m/s] × 3,600 [s/h] × 측정 덕트 면적 [m²]",
    sRatedFlow || sFlow ? `급기 정격 풍량 / 급기 측정 풍량 : ${sRatedFlow ? sRatedFlow.toLocaleString() : "-"} / ${sFlow ? sFlow.toLocaleString() : "-"} [m³/h]` : "",
    sRatedKW || sMeasKW ? `급기 정격 소비전력 / 급기 측정 소비전력 : ${sRatedKW ? sRatedKW : "-"} / ${sMeasKW ? sMeasKW.toFixed(2) : "-"} [kW]` : "",
    sFlowPct != null ? `급기 정격 대비 풍량[%] = (측정 풍량 ÷ 정격 풍량) × 100 = ${sFlowPct.toFixed(2)} [%]` : "",
    sPowerPct != null ? `급기 부하율[%] = (측정 소비전력 ÷ 정격 소비전력) × 100 = ${sPowerPct.toFixed(2)} [%]` : "",
    eRatedFlow || eFlow ? `환기 정격 풍량 / 환기 측정 풍량 : ${eRatedFlow ? eRatedFlow.toLocaleString() : "-"} / ${eFlow ? eFlow.toLocaleString() : "-"} [m³/h]` : "",
    eRatedKW || eMeasKW ? `환기 정격 소비전력 / 환기 측정 소비전력 : ${eRatedKW ? eRatedKW : "-"} / ${eMeasKW ? eMeasKW.toFixed(2) : "-"} [kW]` : "",
    eFlowPct != null ? `환기 정격 대비 풍량[%] = (측정 풍량 ÷ 정격 풍량) × 100 = ${eFlowPct.toFixed(2)} [%]` : "",
    ePowerPct != null ? `환기 부하율[%] = (측정 소비전력 ÷ 정격 소비전력) × 100 = ${ePowerPct.toFixed(2)} [%]` : "",
  ].filter(Boolean);

  const calcBottom = paragraphBoxFit(doc, {
    title: "계산식 및 해석",
    lines,
    top: doc.lastAutoTable?.finalY + 4,
    bottom: 30,
  });

  const judge = (pct) => (pct ?? 0) >= 50 ? "이상없음" : "검토요망";
  const bodyRows = [];
  if (sFlowPct != null || sPowerPct != null) {
    bodyRows.push(["급기", sFlowPct != null ? sFlowPct.toFixed(2) : "-", judge(sFlowPct), sPowerPct != null ? sPowerPct.toFixed(2) : "-", judge(sPowerPct)]);
  }
  if (eFlowPct != null || ePowerPct != null) {
    bodyRows.push(["환기", eFlowPct != null ? eFlowPct.toFixed(2) : "-", judge(eFlowPct), ePowerPct != null ? ePowerPct.toFixed(2) : "-", judge(ePowerPct)]);
  }

  headBodyTable(doc, {
    startY: calcBottom + 3,
    head: [["구분", "정격 대비 풍량(%)", "판정(풍량)", "정격 대비 소비전력(%)", "판정(소비전력)"]],
    body: bodyRows.length ? bodyRows : [["-", "-", "-", "-", "-"]],
    columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 30 }, 2: { cellWidth: 24 }, 3: { cellWidth: 36 }, 4: { cellWidth: 24 } },
    pageBreak: "avoid",
  });

  footerNo(doc, pageNo);
}

/* ── #9 소음/진동 ───────────────────────── */
function renderNoiseVibrationPage(doc, { pageNo, totalPages, dateTxt, placeLabel, ahuLabel, noise, refs, suffix }) {
  pageChrome(doc, { title: `9. 공기조화기 성능 점검 결과 수치표 ${suffix}`, page: pageNo, total: totalPages });

  headBodyTable(doc, {
    startY: FRAME.T + 6,
    body: [
      [
        { content: "점검일자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
        dateTxt || "",
        { content: "설치위치", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
        placeLabel || "",
        { content: ahuLabel || "AHU", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
        "",
      ],
    ],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 38 },
      2: { cellWidth: 22 },
      3: { cellWidth: 58 },
      4: { cellWidth: 18 },
      5: { cellWidth: 28 },
    },
  });

  const rows = (noise?.rows || []).map((r) => [r.loc || "AHU", r.kw ?? "", r.noise_class ?? "", r.noise_val ?? "", r.vib_vel ?? "", r.vib_class ?? ""]);

  headBodyTable(doc, {
    startY: doc.lastAutoTable?.finalY + 4,
    head: [["측정 위치", "모터 용량[kW]", "소음군[dB]", "소음값[dB]", "진동속도[mm/s]", "진동 기준"]],
    body: rows.length ? rows : [["AHU", "", "", "", "", ""]],
    columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 28 }, 2: { cellWidth: 22 }, 3: { cellWidth: 22 }, 4: { cellWidth: 26 }, 5: { cellWidth: 28 } },
  });

  const baseY = doc.lastAutoTable?.finalY + 6;
  const W = doc.internal.pageSize.getWidth();
  const gridW = W - SAFE.L - SAFE.R;
  const colW = (gridW - 6) / 2;
  const boxH = 62;

  try {
    if (refs?.vibChart) addImageSafe(doc, refs.vibChart, SAFE.L, baseY, colW, boxH);
  } catch {}
  try {
    if (refs?.fanNoiseChart) addImageSafe(doc, refs.fanNoiseChart, SAFE.L + colW + 6, baseY, colW, boxH);
  } catch {}

  headBodyTable(doc, {
    startY: baseY + boxH + 4,
    head: [["점검내용", ""]],
    body: [["비고", noise?.note || ""]],
    columnStyles: { 0: { cellWidth: 18 } },
    pageBreak: "avoid",
  });

  footerNo(doc, pageNo);
}

/* ── 사진 슬롯 스키마 ───────────────────────── */
const PHOTO_SCHEMA_OVERVIEW = [
  { id: "doc_list", label: "유지 관리 점검표" },
  { id: "casing_state", label: "외부 케이싱 노후 부식 상태" },
  { id: "filter_dust", label: "필터 오염 상태" },
  { id: "anti_freeze", label: "동파방지장치 작동 상태" },
  { id: "panel_inside", label: "제어반 내부 상태" },
  { id: "panel_meter", label: "제어반 계기 상태" },
];

const PHOTO_SCHEMA_DAMPER = [
  { id: "bms", label: "공기조화기 자동제어 화면 상태" },
  { id: "ea_damper", label: "EA댐퍼 개도율 현황" },
  { id: "oa_damper", label: "OA댐퍼 개도율 현황" },
];

const PHOTO_SCHEMA_SA = [
  { id: "sa_noise", label: "SA 모터 측 소음 측정" },
  { id: "sa_vibration", label: "SA 모터 측 진동 측정" },
  { id: "sa_airflow", label: "SA 모터 측 풍량 측정" },
  { id: "sa_dp", label: "SA 모터 측 차압 측정" },
];

const PHOTO_SCHEMA_RA = [
  { id: "ra_noise", label: "RA 모터 측 소음 측정" },
  { id: "ra_vibration", label: "RA 모터 측 진동 측정" },
  { id: "ra_airflow", label: "RA 모터 측 풍량 측정" },
  { id: "ra_dp", label: "RA 모터 측 차압 측정" },
];

const PHOTO_SCHEMA_INVERTER_SA = [
  { id: "sa_voltage", label: "SA모터 전압 측정" },
  { id: "sa_current2", label: "SA모터 2차측 전류 측정" },
  { id: "sa_inverter", label: "SA모터 인버터 판넬 수치" },
];

const PHOTO_SCHEMA_INVERTER_RA = [
  { id: "ra_voltage", label: "RA모터 전압 측정" },
  { id: "ra_current2", label: "RA모터 2차측 전류 측정" },
  { id: "ra_inverter", label: "RA모터 인버터 판넬 수치" },
];

/* ============================================================
   ✅ 핵심: “doc에 직접 그리는 renderAirComp” (마스터가 호출)
   - 현재 페이지가 airComp 시작 페이지라고 가정
   - 내부에서 addPage() 하면서 10페이지를 완성
   - 마지막 페이지 번호(endPageNo) 반환
   ============================================================ */
export async function renderAirComp(doc, { building, reportMeta, report, __page } = {}) {
  await ensureFonts(doc);
  setKR(doc);

  const startPageNo = __page?.pageNoStart || 1;
  const totalPages = __page?.totalPages || 1;

  const suffix = reportMeta?.suffixNo ? `#${reportMeta.suffixNo}` : "#1";

  const date = reportMeta?.date ? new Date(reportMeta.date) : null;
  const dateTxt = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  const R = report?.ahu ?? report ?? {};
  const photoSlots = R.photoSlots ?? report?.photoSlots ?? {};
  const rated = R.rated ?? report?.rated ?? {};
  const measured = R.measured ?? report?.measured ?? {};
  const noise = R.noise ?? report?.noise ?? {};
  const refs = R.refs ?? report?.refs ?? {};

  let pageNo = startPageNo;

  // #1
  pageChrome(doc, { title: `공기조화기 성능 점검표 ${suffix}`, page: pageNo, total: totalPages });

  headBodyTable(
    doc,
    {
      startY: FRAME.T + 4,
      body: [
        [
          { content: "점검자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          reportMeta?.engineer || "",
          { content: "점검일자", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          dateTxt || "",
          { content: "설치위치", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          report?.meta?.label || "",
          { content: report?.meta?.ahu || building?.ahu || "AHU", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
          "(층·공간명)",
        ],
      ],
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 30 }, 2: { cellWidth: 18 }, 3: { cellWidth: 36 }, 4: { cellWidth: 18 }, 5: { cellWidth: 36 } },
    },
    { styles: { fontSize: 10, cellPadding: 2.2 } }
  );

  const checklist = report?.checklist || {};
  const rows = Object.values(checklist).length
    ? Object.values(checklist).map((it) => ["", `• ${it.title || ""}`, it.result || "○"])
    : [
        ["", "• 유지 관리 점검표", "○"],
        ["", "• 외부 케싱 부식, 손상, 변형 상태", "○"],
        ["", "• 전동 댐퍼(OA, EA, RA) 작동 상태", "○"],
        ["", "• 동파방지 장치 작동 상태", "/"],
        ["", "• 공기조화기(송풍기) 풍량 상태", "/"],
        ["", "• 폐열회수장치 작동 상태", "/"],
        ["", "• 소음, 진동 상태", "/"],
        ["", "• 필터 오염 상태", "/"],
      ];

  headBodyTable(
    doc,
    {
      startY: doc.lastAutoTable?.finalY + 4,
      head: [["구 분", "점검내용", "점검결과"]],
      body: rows,
      columnStyles: { 0: { cellWidth: 16 }, 2: { cellWidth: 18 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: doc.lastAutoTable?.finalY + 2,
      head: [["조치사항", ""]],
      body: [["<조치필요사항>", report?.actionsDetail || "• 없음"]],
      columnStyles: { 0: { cellWidth: 26 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: doc.lastAutoTable?.finalY + 2,
      head: [["추진사항 목록", ""]],
      body: [
        ["1.", "공기조화기 성능 점검 단계 및 점검 기준"],
        ["2.", "공기조화기 육안 점검표"],
        ["3.", "공기조화기 측정 점검표"],
        ["4.", "공기조화기 성능 점검 결과 수치표"],
      ],
      columnStyles: { 0: { cellWidth: 10 } },
    },
    { styles: { fontSize: 9.8, cellPadding: 2.0 } }
  );

  headBodyTable(
    doc,
    {
      startY: doc.lastAutoTable?.finalY + 2,
      head: [["비  고", "올해 설비 교체 예정"]],
      body: [["", ""]],
    },
    { styles: { fontSize: 9.8, cellPadding: 4.0 } }
  );

  paragraphBoxFit(doc, {
    title: "작성 방법",
    lines: [
      "유지관리점검서와 기계설비 유지관리 및 성능 점검 대상 항목표의 적합 여부를 참고하여 점검결과를 작성한다.",
      "점검결과 양호 ○, 조치필요 X, 해당없음 / 를 표기한다.",
      "현장사진은 실내 덕트 7지점으로 명패를 부착하고 측정데이터를 포함하여 첨부한다.",
      "전체 수량의 20% 이상 내에서 점검을 실시한다.",
    ],
    top: doc.lastAutoTable?.finalY + 2,
    bottom: 14,
  });

  footerNo(doc, pageNo);

  // #2 기준+현황
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  const criteriaPhoto = await firstPhotoUrl(photoSlots, "criteria_photo");
  renderInspectionCriteriaPage(doc, {
    pageNo,
    totalPages,
    title: `1. 공기조화기 성능 점검 단계 및 점검 기준 ${suffix}`,
    photoDataUrl: criteriaPhoto,
  });

  // #3 overview
  const ovUrls = await toUrls(PHOTO_SCHEMA_OVERVIEW, photoSlots);
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: `2. 공기조화기 육안 점검표 ${suffix}`, page: pageNo, total: totalPages });
  photoGrid(doc, {
    title: "측정 점검",
    rows: 3,
    cols: 2,
    items: PHOTO_SCHEMA_OVERVIEW,
    images: ovUrls,
    resultLines: (report?.notes_overview || "• 공기조화기 외관/내부 상태 양호")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  });
  footerNo(doc, pageNo);

  // #4 damper
  const dmUrls = await toUrls(PHOTO_SCHEMA_DAMPER, photoSlots);
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: `3. 공기조화기 측정 점검표 ${suffix}`, page: pageNo, total: totalPages });
  photoGrid(doc, {
    rows: 2,
    cols: 2,
    items: [PHOTO_SCHEMA_DAMPER[0], PHOTO_SCHEMA_DAMPER[1], PHOTO_SCHEMA_DAMPER[2]],
    images: [dmUrls[0], dmUrls[1], dmUrls[2]],
    resultLines: (report?.notes_damper || "• 급기, 배기팬 가동 시 이상 소음 없음").split(/\r?\n/).filter(Boolean),
  });
  footerNo(doc, pageNo);

  // #5 sa
  const saUrls = await toUrls(PHOTO_SCHEMA_SA, photoSlots);
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: `4. 공기조화기 측정 점검표 ${suffix}`, page: pageNo, total: totalPages });
  photoGrid(doc, {
    rows: 2,
    cols: 2,
    items: PHOTO_SCHEMA_SA,
    images: saUrls,
    resultLines: (report?.notes_sa || "• 공기팬 가동 시 이상 소음 없음").split(/\r?\n/).filter(Boolean),
  });
  footerNo(doc, pageNo);

  // #6 ra
  const raUrls = await toUrls(PHOTO_SCHEMA_RA, photoSlots);
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: `5. 공기조화기 측정 점검표 ${suffix}`, page: pageNo, total: totalPages });
  photoGrid(doc, {
    rows: 2,
    cols: 2,
    items: PHOTO_SCHEMA_RA,
    images: raUrls,
    resultLines: (report?.notes_ra || "• 공기팬 가동 시 이상 소음 없음").split(/\r?\n/).filter(Boolean),
  });
  footerNo(doc, pageNo);

  // #7 inverter sa
  const saInv = await toUrls(PHOTO_SCHEMA_INVERTER_SA, photoSlots);
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: `6. 공기조화기 측정 점검표 ${suffix}`, page: pageNo, total: totalPages });
  photoGrid(doc, {
    rows: 2,
    cols: 2,
    items: [PHOTO_SCHEMA_INVERTER_SA[0], PHOTO_SCHEMA_INVERTER_SA[1], PHOTO_SCHEMA_INVERTER_SA[2], { id: "_", label: "" }],
    images: [saInv[0], saInv[1], saInv[2], null],
    resultLines: (report?.notes_inv_sa || "").split(/\r?\n/).filter(Boolean),
  });
  footerNo(doc, pageNo);

  // #8 inverter ra
  const raInv = await toUrls(PHOTO_SCHEMA_INVERTER_RA, photoSlots);
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  pageChrome(doc, { title: `7. 공기조화기 측정 점검표 ${suffix}`, page: pageNo, total: totalPages });
  photoGrid(doc, {
    rows: 2,
    cols: 2,
    items: [PHOTO_SCHEMA_INVERTER_RA[0], PHOTO_SCHEMA_INVERTER_RA[1], PHOTO_SCHEMA_INVERTER_RA[2], { id: "_", label: "" }],
    images: [raInv[0], raInv[1], raInv[2], null],
    resultLines: (report?.notes_inv_ra || "").split(/\r?\n/).filter(Boolean),
  });
  footerNo(doc, pageNo);

  // #9 결과/계산식
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  renderResultsAndFormula(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel: report?.meta?.label || "",
    ahuLabel: report?.meta?.ahu || building?.ahu || "AHU",
    rated,
    measured,
    suffix,
  });

  // #10 소음/진동
  pageNo += 1;
  doc.addPage();
  await ensureFonts(doc);
  setKR(doc);
  renderNoiseVibrationPage(doc, {
    pageNo,
    totalPages,
    dateTxt,
    placeLabel: report?.meta?.label || "",
    ahuLabel: report?.meta?.ahu || building?.ahu || "AHU",
    noise,
    refs,
    suffix,
  });

  return pageNo; // ✅ 마지막 페이지 번호 반환
}

/* ============================================================
   기존 단독 PDF 생성도 유지(buildAirCompPdf)
   ============================================================ */
export async function buildAirCompPdf({ building, reportMeta, report } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  // 단독 문서라 totalPages는 10으로 표시
  const endNo = await renderAirComp(doc, {
    building,
    reportMeta,
    report,
    __page: { pageNoStart: 1, totalPages: 10 },
  });

  // endNo는 10이 나오는게 정상
  return doc.output("blob");
}
