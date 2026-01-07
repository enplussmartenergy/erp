// src/pages/Reports/Create/Components/pdf/buildEnergyUsagePage.js
import autoTable from "jspdf-autotable";

const BLACK = 0;

// 기본 프레임/세이프 (마스터에서 __layout 넘기면 그걸 우선 사용)
const DEFAULT_FRAME = { L: 10, R: 10, T: 20, B: 8 };
const DEFAULT_SAFE = { L: DEFAULT_FRAME.L + 4, R: DEFAULT_FRAME.R + 4 };

function setKR(doc) {
  doc.setFont("NotoSansKR", "normal");
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
}

function pageChrome(doc, title, frame, pageInfo = "") {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(14.5);
  doc.text(title, frame.L + 8, 16);

  if (pageInfo) {
    doc.setFont("NotoSansKR", "normal");
    doc.setFontSize(10);
    doc.text(pageInfo, W - (frame.R + 8), 16, { align: "right" });
  }

  doc.setLineWidth(0.6);
  doc.rect(frame.L, frame.T, W - frame.L - frame.R, H - frame.T - frame.B, "S");
  doc.setLineWidth(0.2);
}

function footerNo(doc, pageNo = 1) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);
  doc.setFontSize(9);
  doc.text(String(pageNo), W / 2, H - 10, { align: "center" });
}

/* ───────── util ───────── */
const N = (x) => {
  const n = +String(x ?? "").replaceAll(",", "").trim();
  return Number.isFinite(n) ? n : 0;
};

const fmt0 = (n) => (Number.isFinite(+n) ? `${Math.round(+n)}` : "");
const fmt1 = (n) => (Number.isFinite(+n) ? `${(+n).toFixed(1)}` : "");
const fmt2 = (n) => (Number.isFinite(+n) ? `${(+n).toFixed(2)}` : "");
const fmt3 = (n) => (Number.isFinite(+n) ? `${(+n).toFixed(3)}` : "");
const fmt4 = (n) => (Number.isFinite(+n) ? `${(+n).toFixed(4)}` : "");

const fmtComma = (n) => {
  const v = +n;
  return Number.isFinite(v) ? v.toLocaleString("ko-KR") : "";
};
const fmtComma2 = (n) => {
  const v = +n;
  return Number.isFinite(v)
    ? v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function drawBox(doc, x, y, w, h) {
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, "S");
}

/* ─────────────────────────────────────────────────────────────
   ✅ 에너지 데이터 resolve
───────────────────────────────────────────────────────────── */
function resolveEnergy(report, building, baseYearFallback = new Date().getFullYear()) {
  const src =
    report?.energy ||
    report?.energyUsage ||
    report?.body?.energy ||
    report?.body?.energyUsage ||
    building?.energy ||
    building?.energyUsage ||
    null;

  const years = src?.years || src || {};

  const yearKeys = Object.keys(years || {})
    .map((k) => String(k).trim())
    .map((k) => (k.startsWith("y") || k.startsWith("Y") ? k.slice(1) : k))
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 1900 && n < 3000);

  let baseYear =
    N(src?.baseYear) ||
    N(report?.baseYear) ||
    N(report?.body?.baseYear) ||
    N(building?.baseYear) ||
    baseYearFallback;

  let y2 = baseYear - 1;
  let y1 = baseYear - 2;

  if (yearKeys.length >= 2) {
    yearKeys.sort((a, b) => a - b);
    const last2 = yearKeys.slice(-2);
    y1 = last2[0];
    y2 = last2[1];
    baseYear = y2 + 1;
  }

  const pickYearRaw = (y) => years[String(y)] || years[y] || years[`y${y}`] || years[`Y${y}`] || {};
  const y1raw = pickYearRaw(y1);
  const y2raw = pickYearRaw(y2);

  const pad12 = (arr) => {
    const out = Array.isArray(arr) ? arr.slice(0, 12) : [];
    while (out.length < 12) out.push("");
    return out;
  };

  const isBlank = (v) => {
    const s = String(v ?? "").replaceAll(",", "").trim();
    return s === "";
  };
  const toNumOr0 = (v) => (isBlank(v) ? 0 : N(v));

  const pickElectric = (y) => {
    const e = y?.electric || y || {};
    const monthlyKwhRaw = pad12(e?.monthlyKwh);
    const monthlyCostRaw = pad12(e?.monthlyCost);

    const totalKwh =
      N(e?.totalKwh ?? e?.kwh ?? e?.total_kwh) || monthlyKwhRaw.reduce((a, b) => a + toNumOr0(b), 0);

    const totalWon =
      N(e?.totalCost ?? e?.costWon ?? e?.total_won ?? e?.cost) ||
      monthlyCostRaw.reduce((a, b) => a + toNumOr0(b), 0);

    return { monthlyKwhRaw, monthlyCostRaw, totalKwh, totalWon };
  };

  const e1 = pickElectric(y1raw);
  const e2 = pickElectric(y2raw);

  const mwh1 = e1.totalKwh ? e1.totalKwh / 1000 : 0;
  const mwh2 = e2.totalKwh ? e2.totalKwh / 1000 : 0;

  const costM1 = e1.totalWon ? e1.totalWon / 1_000_000 : 0;
  const costM2 = e2.totalWon ? e2.totalWon / 1_000_000 : 0;

  const pickGas = (y) => {
    const g = y?.gas || {};
    const enabled = !!g.enabled;
    const unitLabel = g.unitLabel || "Nm³";
    const monthlyUseRaw = pad12(g.monthlyUse);
    const monthlyCostRaw = pad12(g.monthlyCost);

    const totalUse = N(g.totalUse) || (enabled ? monthlyUseRaw.reduce((a, b) => a + toNumOr0(b), 0) : 0);
    const totalWon = N(g.totalCost) || (enabled ? monthlyCostRaw.reduce((a, b) => a + toNumOr0(b), 0) : 0);

    return { enabled, unitLabel, monthlyUseRaw, monthlyCostRaw, totalUse, totalWon };
  };

  const g1 = pickGas(y1raw);
  const g2 = pickGas(y2raw);

  return {
    baseYear,
    y1,
    y2,

    kwh1: e1.totalKwh,
    kwh2: e2.totalKwh,
    won1: e1.totalWon,
    won2: e2.totalWon,

    mwh1,
    mwh2,
    costM1,
    costM2,

    monthlyKwhRaw1: e1.monthlyKwhRaw,
    monthlyKwhRaw2: e2.monthlyKwhRaw,
    monthlyCostRaw1: e1.monthlyCostRaw,
    monthlyCostRaw2: e2.monthlyCostRaw,

    monthlyKwh1: e1.monthlyKwhRaw.map(toNumOr0),
    monthlyKwh2: e2.monthlyKwhRaw.map(toNumOr0),
    monthlyCost1: e1.monthlyCostRaw.map(toNumOr0),
    monthlyCost2: e2.monthlyCostRaw.map(toNumOr0),

    gas1: g1,
    gas2: g2,
  };
}

/* ─────────────────────────────────────────────────────────────
   ✅ 연면적 resolve
───────────────────────────────────────────────────────────── */
function resolveAreaM2(building, report) {
  const v =
    N(building?.grossFloorArea) ||
    N(building?.grossAreaM2) ||
    N(building?.areaM2) ||
    N(building?.area) ||
    N(building?.grossArea) ||
    N(report?.buildingAreaM2) ||
    N(report?.areaM2) ||
    0;

  return v;
}

/* ───────── base table style ───────── */
function baseTableStyle() {
  return {
    theme: "grid",
    styles: {
      font: "NotoSansKR",
      fontSize: 9.2,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      cellPadding: { top: 2.0, right: 2.0, bottom: 2.0, left: 2.0 },
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [235, 235, 235],
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      fontStyle: "bold",
      halign: "center",
    },
  };
}

/* ───────── simple bars ───────── */
function drawBarPair(doc, { x, y, w, h, title, unitLabel, v1, v2, y1, y2 }) {
  setKR(doc);
  drawBox(doc, x, y, w, h);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, x + w / 2, y + 10, { align: "center" });

  const pad = 14;
  const px = x + pad;
  const py = y + 18;
  const pw = w - pad * 2;
  const ph = h - 34;

  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.line(px, py + ph, px + pw, py + ph);

  const maxV = Math.max(v1, v2, 1);
  const barW = pw * 0.22;
  const gap = pw * 0.22;
  const b1x = px + gap * 0.7;
  const b2x = b1x + barW + gap;

  const usableH = ph * 0.78;
  const b1h = (v1 / maxV) * usableH;
  const b2h = (v2 / maxV) * usableH;

  doc.setFillColor(200);
  doc.rect(b1x, py + ph - b1h, barW, b1h, "F");
  doc.setFillColor(140);
  doc.rect(b2x, py + ph - b2h, barW, b2h, "F");

  doc.setTextColor(0);
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10);

  const t1y = clamp(py + ph - b1h + 10, py + 14, py + ph - 6);
  const t2y = clamp(py + ph - b2h + 10, py + 14, py + ph - 6);

  doc.text(fmt0(v1), b1x + barW / 2, t1y, { align: "center" });
  doc.text(fmt0(v2), b2x + barW / 2, t2y, { align: "center" });

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);
  doc.text(`${y1}년`, b1x + barW / 2, py + ph + 10, { align: "center" });
  doc.text(`${y2}년`, b2x + barW / 2, py + ph + 10, { align: "center" });

  doc.setFontSize(9);
  doc.text(unitLabel || "", x + w - 8, y + 12, { align: "right" });
}

/* ───────── 월별 라인 차트 (2년) ───────── */
function drawMonthlyLineChart2(doc, { x, y, w, h, title, y1, y2, v1, v2 }) {
  setKR(doc);
  drawBox(doc, x, y, w, h);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, x + w / 2, y + 10, { align: "center" });

  const padL = 28;
  const padR = 10;
  const padT = 18;
  const padB = 22;

  const px = x + padL;
  const py = y + padT;
  const pw = w - padL - padR;
  const ph = h - padT - padB;

  const a1 = Array.isArray(v1) ? v1.slice(0, 12) : [];
  const a2 = Array.isArray(v2) ? v2.slice(0, 12) : [];
  while (a1.length < 12) a1.push(0);
  while (a2.length < 12) a2.push(0);

  const all = [...a1, ...a2].map((vv) => N(vv));
  const maxV0 = Math.max(...all, 1);

  const niceMax = (() => {
    const raw = maxV0;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    let m = 1;
    if (n <= 1.2) m = 1.2;
    else if (n <= 2) m = 2;
    else if (n <= 3) m = 3;
    else if (n <= 4) m = 4;
    else if (n <= 5) m = 5;
    else if (n <= 6) m = 6;
    else if (n <= 8) m = 8;
    else m = 10;
    return m * p;
  })();

  const minV = 0;
  const toX = (i) => px + (pw * i) / 11;
  const toY = (vv) => py + ph - ((N(vv) - minV) / (niceMax - minV || 1)) * ph;

  const ticks = 5;
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(8.5);
  doc.setLineWidth(0.2);

  for (let t = 0; t <= ticks; t++) {
    const val = (niceMax * t) / ticks;
    const yy = toY(val);

    doc.setDrawColor(210);
    doc.line(px, yy, px + pw, yy);

    doc.setDrawColor(0);
    doc.setTextColor(0);
    doc.text(fmtComma(Math.round(val)), px - 6, yy + 2.5, { align: "right" });
  }

  doc.setDrawColor(0);
  doc.line(px, py, px, py + ph);
  doc.line(px, py + ph, px + pw, py + ph);

  doc.setFontSize(8.5);
  for (let i = 0; i < 12; i++) {
    doc.text(`${i + 1}월`, toX(i), py + ph + 10, { align: "center" });
  }

  const drawLine = (arr, strokeGray, pointGray, lw) => {
    doc.setDrawColor(strokeGray);
    doc.setLineWidth(lw);

    for (let i = 0; i < 11; i++) {
      doc.line(toX(i), toY(arr[i]), toX(i + 1), toY(arr[i + 1]));
    }

    for (let i = 0; i < 12; i++) {
      doc.setFillColor(pointGray);
      doc.circle(toX(i), toY(arr[i]), 1.0, "F");
    }
  };

  drawLine(a1, 170, 170, 0.25);
  drawLine(a2, 60, 60, 0.35);

  const legendY = y + h - 8;
  const itemW = 52;
  const centerX = x + w / 2;

  const drawLegendItem = (cx, year, strokeGray, pointGray) => {
    const lineX1 = cx - 18;
    const lineX2 = cx - 4;
    doc.setDrawColor(strokeGray);
    doc.setLineWidth(0.35);
    doc.line(lineX1, legendY - 1.5, lineX2, legendY - 1.5);
    doc.setFillColor(pointGray);
    doc.circle((lineX1 + lineX2) / 2, legendY - 1.5, 1.0, "F");

    doc.setTextColor(0);
    doc.setFont("NotoSansKR", "normal");
    doc.setFontSize(9);
    doc.text(`${year}년`, cx + 2, legendY, { align: "left" });
  };

  drawLegendItem(centerX - itemW / 2, y1, 170, 170);
  drawLegendItem(centerX + itemW / 2, y2, 60, 60);

  doc.setDrawColor(0);
  doc.setTextColor(0);
}

/* ───────── 원단위 콤보 차트 (막대 + 선) ───────── */
function drawUnitComboChart(doc, { x, y, w, h, title, bar1, bar2, line1, line2, y1, y2 }) {
  setKR(doc);
  drawBox(doc, x, y, w, h);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, x + w / 2, y + 10, { align: "center" });

  const pad = 14;
  const px = x + pad;
  const py = y + 18;
  const pw = w - pad * 2;
  const ph = h - 34;

  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.line(px, py + ph, px + pw, py + ph);

  const maxBar = Math.max(bar1, bar2, 1);
  const barW = pw * 0.22;
  const gap = pw * 0.26;
  const b1x = px + gap * 0.8;
  const b2x = b1x + barW + gap;

  const usableH = ph * 0.78;
  const b1h = (bar1 / maxBar) * usableH;
  const b2h = (bar2 / maxBar) * usableH;

  doc.setFillColor(180);
  doc.rect(b1x, py + ph - b1h, barW, b1h, "F");
  doc.setFillColor(120);
  doc.rect(b2x, py + ph - b2h, barW, b2h, "F");

  const maxLine = Math.max(line1, line2, 1);
  const toLineY = (v) => py + ph - (v / maxLine) * (ph * 0.76);
  const p1x = b1x + barW / 2;
  const p2x = b2x + barW / 2;
  const p1y = toLineY(line1);
  const p2y = toLineY(line2);

  doc.setDrawColor(0);
  doc.setLineWidth(0.35);
  doc.line(p1x, p1y, p2x, p2y);

  doc.setFillColor(0);
  doc.circle(p1x, p1y, 1.1, "F");
  doc.circle(p2x, p2y, 1.1, "F");

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);

  doc.text(fmt2(bar1), b1x + barW / 2, clamp(py + ph - b1h + 10, py + 14, py + ph - 6), {
    align: "center",
  });
  doc.text(fmt2(bar2), b2x + barW / 2, clamp(py + ph - b2h + 10, py + 14, py + ph - 6), {
    align: "center",
  });

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);
  doc.text(fmtComma2(line1), p1x, p1y - 6, { align: "center" });
  doc.text(fmtComma2(line2), p2x, p2y - 6, { align: "center" });

  doc.text(`${y1}년`, b1x + barW / 2, py + ph + 10, { align: "center" });
  doc.text(`${y2}년`, b2x + barW / 2, py + ph + 10, { align: "center" });

  doc.setFillColor(180);
  doc.rect(x + 10, y + h - 10, 6, 3, "F");
  doc.text("[kWh/㎡] (막대)", x + 18, y + h - 7);

  doc.setFillColor(0);
  doc.rect(x + 78, y + h - 10, 6, 3, "F");
  doc.text("[원/㎡] (선)", x + 86, y + h - 7);
}

/* ============================================================
   ✅ 계산용 계수(절대 변경 금지)
============================================================ */
const GHG_RULES = {
  tjPerMwh: 0.0096,
  toePerMwh: 0.229,
  co2_tPerMwh: 0.5,
  ch4_kgPerMwh: 0.000125,
  n2o_kgPerMwh: 0.00001,
  tco2eqPerMwh: 0.459410593191394,
};

/* ─────────────────────────────────────────────────────────────
   ✅ 1페이지
───────────────────────────────────────────────────────────── */
export function renderEnergyUsagePage(
  doc,
  { building, report, pageNo = 1, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  const frame = __layout?.FRAME || DEFAULT_FRAME;
  const safe = __layout?.SAFE || DEFAULT_SAFE;

  const W = doc.internal.pageSize.getWidth();
  const left = safe.L;
  const right = W - safe.R;
  const width = right - left;

  setKR(doc);
  pageChrome(
    doc,
    `라. 에너지 사용 현황${titleSuffix ? ` ${titleSuffix}` : ""}`,
    frame,
    `페이지 ${pageNo}/${totalPages}`,
  );

  const e = resolveEnergy(report, building, new Date().getFullYear());
  const base = baseTableStyle();

  const incMwh = e.mwh1 > 0 ? ((e.mwh2 - e.mwh1) / e.mwh1) * 100 : null;

  let y = frame.T + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("1) 최근 2년간 에너지 사용 현황", left + 1.5, y);
  y += 4;

  autoTable(doc, {
    ...base,
    startY: y + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    head: [
      [
        { content: "구분", rowSpan: 2 },
        { content: "단위", rowSpan: 2 },
        { content: `${e.y1}`, colSpan: 2 },
        { content: `${e.y2}`, colSpan: 2 },
      ],
      ["사용량", "비용 [백만원]", "사용량", "비용 [백만원]"],
    ],
    body: [
      [
        { content: "전력 / 수전" },
        { content: "MWh/년" },
        { content: fmtComma(e.mwh1) },
        { content: fmtComma(e.costM1), rowSpan: 2 },
        { content: fmtComma(e.mwh2) },
        { content: fmtComma(e.costM2), rowSpan: 2 },
      ],
      [
        { content: "전력 / 수전" },
        { content: "toe/년" },
        { content: fmt2(e.mwh1 * GHG_RULES.toePerMwh) },
        null,
        { content: fmt2(e.mwh2 * GHG_RULES.toePerMwh) },
        null,
      ],
    ],
    columnStyles: {
      0: { cellWidth: width * 0.18, halign: "center" },
      1: { cellWidth: width * 0.12, halign: "center" },
      2: { cellWidth: width * 0.17, halign: "center" },
      3: { cellWidth: width * 0.16, halign: "center" },
      4: { cellWidth: width * 0.17, halign: "center" },
      5: { cellWidth: width * 0.20, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.cell.raw == null) data.cell.text = [""];
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  const boxW = (width - 10) / 2;
  const boxH = 70;

  drawBarPair(doc, {
    x: left,
    y,
    w: boxW,
    h: boxH,
    title: "2년간 전기사용량[toe]",
    unitLabel: "",
    v1: e.mwh1 * GHG_RULES.toePerMwh,
    v2: e.mwh2 * GHG_RULES.toePerMwh,
    y1: e.y1,
    y2: e.y2,
  });

  drawBarPair(doc, {
    x: left + boxW + 10,
    y,
    w: boxW,
    h: boxH,
    title: "2년간 전력 요금[백만원]",
    unitLabel: "",
    v1: e.costM1,
    v2: e.costM2,
    y1: e.y1,
    y2: e.y2,
  });

  y += boxH + 10;

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9.5);
  doc.text(`※ ${e.y1}년 대비 ${e.y2}년 에너지 사용량 증감율`, left, y);
  y += 6;

  if (incMwh == null) {
    doc.text("… 전력 [MWh/년] : (입력값 부족) → 증감율 산출 불가", left + 2, y);
    y += 10;
  } else {
    const formula = `… 전력 [MWh/년] : (${fmtComma(e.mwh2)} - ${fmtComma(e.mwh1)}) ÷ ${fmtComma(
      e.mwh1,
    )} × 100 = ${fmt2(incMwh)} [%]`;
    doc.text(formula, left + 2, y);
    y += 10;
  }

  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: left, right: W - (left + boxW) },
    tableWidth: boxW,
    head: [[{ content: "구분", rowSpan: 2 }, { content: "사용량 [toe]", colSpan: 1 }], ["전력"]],
    body: [
      [`${e.y1}`, fmt2(e.mwh1 * GHG_RULES.toePerMwh)],
      [`${e.y2}`, fmt2(e.mwh2 * GHG_RULES.toePerMwh)],
    ],
    columnStyles: {
      0: { cellWidth: boxW * 0.32, halign: "center" },
      1: { cellWidth: boxW * 0.68, halign: "center" },
    },
  });

  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: left + boxW + 10, right: safe.R },
    tableWidth: boxW,
    head: [[{ content: "구분", rowSpan: 2 }, { content: "사용금액 [백만원]", colSpan: 1 }], ["전력"]],
    body: [
      [`${e.y1}`, fmtComma(e.costM1)],
      [`${e.y2}`, fmtComma(e.costM2)],
    ],
    columnStyles: {
      0: { cellWidth: boxW * 0.32, halign: "center" },
      1: { cellWidth: boxW * 0.68, halign: "center" },
    },
  });

  footerNo(doc, pageNo);
}

/* ─────────────────────────────────────────────────────────────
   ✅ 2페이지: 라-2/라-3 (계산 로직 유지 + 배출계수 표만 변경)
───────────────────────────────────────────────────────────── */
export function renderEnergyUsageGhGPage(
  doc,
  { building, report, pageNo = 2, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  const frame = __layout?.FRAME || DEFAULT_FRAME;
  const safe = __layout?.SAFE || DEFAULT_SAFE;

  const W = doc.internal.pageSize.getWidth();
  const left = safe.L;
  const right = W - safe.R;
  const width = right - left;

  setKR(doc);
  pageChrome(
    doc,
    `라. 에너지 사용 현황${titleSuffix ? ` ${titleSuffix}` : ""}`,
    frame,
    `페이지 ${pageNo}/${totalPages}`,
  );

  const e = resolveEnergy(report, building, new Date().getFullYear());
  const base = baseTableStyle();

  const yearLabel = e.y2;

  const mwh = e.kwh2 > 0 ? e.kwh2 / 1000 : 0;
  const costM = e.won2 > 0 ? e.won2 / 1_000_000 : e.costM2;

  // ✅ 계산(그대로 유지)
  const tj = mwh * GHG_RULES.tjPerMwh;
  const toe = mwh * GHG_RULES.toePerMwh;

  const co2 = mwh * GHG_RULES.co2_tPerMwh;
  const ch4 = mwh * GHG_RULES.ch4_kgPerMwh;
  const n2o = mwh * GHG_RULES.n2o_kgPerMwh;
  const tco2eq = mwh * GHG_RULES.tco2eqPerMwh;

  const unitWonPerKwh = e.kwh2 > 0 ? e.won2 / e.kwh2 : 0;

  let curY = frame.T + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(`2) ${yearLabel}년 에너지 사용 및 온실가스 배출 현황`, left + 1.5, curY);
  curY += 4;

  autoTable(doc, {
    ...base,
    startY: curY + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    head: [[{ content: "구분" }, { content: "단위" }, { content: "사용량(배출량)" }, { content: "비용[백만원]" }, { content: "연료 단가" }]],
    body: [
      [
        { content: "전력 / 수전" },
        { content: "MWh/년" },
        { content: fmtComma(mwh) },
        { content: fmtComma(costM), rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: `${fmt2(unitWonPerKwh)} [원/kWh]`, rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      ],
      ["", "TJ/년", fmt3(tj), null, null],
      [{ content: "합계", styles: { fillColor: [255, 255, 140] } }, "TJ/년", fmt3(tj), fmtComma(costM), "—"],
      ["온실가스배출량", "tCO2eq/년", fmt1(tco2eq), "—", "—"],
    ],
    columnStyles: {
      0: { cellWidth: width * 0.26, halign: "center" },
      1: { cellWidth: width * 0.14, halign: "center" },
      2: { cellWidth: width * 0.22, halign: "center" },
      3: { cellWidth: width * 0.18, halign: "center" },
      4: { cellWidth: width * 0.20, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.cell.raw == null) data.cell.text = [""];
    },
  });

  curY = doc.lastAutoTable.finalY + 8;

  // ✅ 계산식 박스(유지)
  const formulaH = 30;
  drawBox(doc, left, curY, width, formulaH);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);

  doc.text(`※ TJ/년 = MWh/년 × 0.0096  |  toe/년 = MWh/년 × 0.229`, left + 4, curY + 10);
  doc.text(`※ CO2 = MWh×0.5000,  CH4 = MWh×0.000125,  N2O = MWh×0.000010`, left + 4, curY + 18);
  doc.text(`※ tCO2eq(합계) = MWh×0.459410593191394`, left + 4, curY + 26);

  curY += formulaH + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(`3) ${yearLabel}년 에너지 사용 및 온실가스 배출량 표기`, left + 1.5, curY);
  curY += 4;

  autoTable(doc, {
    ...base,
    startY: curY + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    head: [
      [{ content: "연료" }, { content: "에너지 사용량", colSpan: 3 }, { content: "온실가스 배출량", colSpan: 3 }, { content: "합계" }],
      ["연료", "단위/년[MWh]", "toe/년", "TJ/년", "CO2(tCO2/년)", "CH4(kgCH4/년)", "N2O(kgN2O/년)", "tCO2eq/년"],
    ],
    body: [["전 력", fmtComma(mwh), fmt2(toe), fmt3(tj), fmt1(co2), fmt3(ch4), fmt3(n2o), fmt1(tco2eq)]],
    columnStyles: {
      0: { cellWidth: width * 0.10, halign: "center" },
      1: { cellWidth: width * 0.12, halign: "center" },
      2: { cellWidth: width * 0.10, halign: "center" },
      3: { cellWidth: width * 0.10, halign: "center" },
      4: { cellWidth: width * 0.14, halign: "center" },
      5: { cellWidth: width * 0.14, halign: "center" },
      6: { cellWidth: width * 0.14, halign: "center" },
      7: { cellWidth: width * 0.16, halign: "center" },
    },
    styles: { ...base.styles, fontSize: 8.8 },
  });

  curY = doc.lastAutoTable.finalY + 8;

// ✅ 표시용 값
const DISPLAY_COEF = {
  tjPerMwh: 0.0036,
  co2_tPerMwh: 0.4556,
  ch4_kgPerMwh: 0.0018,
  n2o_kgPerMwh: 0.0018,
};

autoTable(doc, {
  ...base,
  startY: curY,
  margin: { left: safe.L, right: safe.R },
  tableWidth: width,
  head: [],
  body: [
    // --- 1행 ---
    [
      { content: "간접 배출", rowSpan: 5, styles: { fillColor: [235, 235, 235], fontStyle: "bold" } },
      { content: "전기(소비기준)", rowSpan: 5, styles: { fontStyle: "bold" } },
      { content: "열량 계수", rowSpan: 2, styles: { fontStyle: "bold" } },
      { content: "순발열량" },
      { content: "TJ/MWh" },
      { content: String(DISPLAY_COEF.tjPerMwh) },
    ],
    // --- 2행 (이미 위에서 3칸이 차지함. 나머지 3칸만 작성) ---
    [
      { content: "총발열량" },
      { content: "TJ/MWh" },
      { content: String(DISPLAY_COEF.tjPerMwh) },
    ],
    // --- 3행 (앞 2칸은 rowSpan으로 차지됨. 3번째 칸부터 작성) ---
    [
      { content: "온실가스 배출계수", rowSpan: 3, styles: { fontStyle: "bold" } },
      { content: "CO2" },
      { content: "tCO2/MWh" },
      { content: String(DISPLAY_COEF.co2_tPerMwh) },
    ],
    // --- 4행 ---
    [
      { content: "CH4" },
      { content: "kgCH4/MWh" },
      { content: String(DISPLAY_COEF.ch4_kgPerMwh) },
    ],
    // --- 5행 ---
    [
      { content: "N2O" },
      { content: "kgN2O/MWh" },
      { content: String(DISPLAY_COEF.n2o_kgPerMwh) },
    ],
  ],

  columnStyles: {
    0: { cellWidth: width * 0.16 },
    1: { cellWidth: width * 0.18 },
    2: { cellWidth: width * 0.20 },
    3: { cellWidth: width * 0.16 },
    4: { cellWidth: width * 0.15 },
    5: { cellWidth: width * 0.15 },
  },

  styles: { 
    ...base.styles, 
    fontSize: 9, 
    halign: "center", 
    valign: "middle",
    textColor: [0, 0, 0],
    lineWidth: 0.1,
    lineColor: [0, 0, 0] // 테두리 선명하게
  },
});

  footerNo(doc, pageNo);
}

/* ─────────────────────────────────────────────────────────────
   ✅ 3페이지
───────────────────────────────────────────────────────────── */
export function renderEnergyMonthlyUsageCostPage(
  doc,
  { building, report, pageNo = 3, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  const frame = __layout?.FRAME || DEFAULT_FRAME;
  const safe = __layout?.SAFE || DEFAULT_SAFE;

  const W = doc.internal.pageSize.getWidth();
  const left = safe.L;
  const right = W - safe.R;
  const width = right - left;

  setKR(doc);
  pageChrome(
    doc,
    `마. 에너지월별 사용현황${titleSuffix ? ` ${titleSuffix}` : ""}`,
    frame,
    `페이지 ${pageNo}/${totalPages}`,
  );

  const e = resolveEnergy(report, building, new Date().getFullYear());
  const base = baseTableStyle();

  let y = frame.T + 10;
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("1) 전력 2년간 사용량 추이", left + 1.5, y);
  y += 4;

  const chartH = 52;
  drawMonthlyLineChart2(doc, {
    x: left,
    y: y + 2,
    w: width,
    h: chartH,
    title: `최근 2년간 전력 사용량 추이 [kWh]`,
    y1: e.y1,
    y2: e.y2,
    v1: e.monthlyKwh1,
    v2: e.monthlyKwh2,
  });
  y += chartH + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("바. 에너지비용 사용현황", left + 1.5, y);
  y += 6;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(10.5);
  doc.text("1) 전력 2년간 사용금액", left + 1.5, y);
  y += 4;

  const months = Array.from({ length: 12 }).map((_, i) => `${i + 1}월`);

  const isBlank = (v) => {
    const s = String(v ?? "").replaceAll(",", "").trim();
    return s === "";
  };
  const cell = (raw) => (isBlank(raw) ? "" : fmtComma(N(raw)));

  const totalKwh1 = e.monthlyKwh1.reduce((a, b) => a + N(b), 0) || e.kwh1;
  const totalKwh2 = e.monthlyKwh2.reduce((a, b) => a + N(b), 0) || e.kwh2;
  const totalWon1 = e.monthlyCost1.reduce((a, b) => a + N(b), 0) || e.won1;
  const totalWon2 = e.monthlyCost2.reduce((a, b) => a + N(b), 0) || e.won2;

  autoTable(doc, {
    ...base,
    startY: y + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    head: [
      [
        { content: "연월", rowSpan: 2 },
        { content: `${e.y1}년`, colSpan: 2 },
        { content: `${e.y2}년`, colSpan: 2 },
      ],
      ["사용전력량(kWh)", "전기요금(원)", "사용전력량(kWh)", "전기요금(원)"],
    ],
    body: [
      ...months.map((m, i) => [
        m,
        cell(e.monthlyKwhRaw1?.[i]),
        cell(e.monthlyCostRaw1?.[i]),
        cell(e.monthlyKwhRaw2?.[i]),
        cell(e.monthlyCostRaw2?.[i]),
      ]),
      [
        { content: "합계", styles: { fillColor: [255, 255, 140], fontStyle: "bold" } },
        { content: fmtComma(totalKwh1), styles: { fillColor: [255, 255, 140], fontStyle: "bold" } },
        { content: fmtComma(totalWon1), styles: { fillColor: [255, 255, 140], fontStyle: "bold" } },
        { content: fmtComma(totalKwh2), styles: { fillColor: [255, 255, 140], fontStyle: "bold" } },
        { content: fmtComma(totalWon2), styles: { fillColor: [255, 255, 140], fontStyle: "bold" } },
      ],
    ],
    columnStyles: {
      0: { cellWidth: width * 0.12, halign: "center" },
      1: { cellWidth: width * 0.22, halign: "center" },
      2: { cellWidth: width * 0.22, halign: "center" },
      3: { cellWidth: width * 0.22, halign: "center" },
      4: { cellWidth: width * 0.22, halign: "center" },
    },
    styles: { ...base.styles, fontSize: 8.8 },
  });

  footerNo(doc, pageNo);
}

/* ─────────────────────────────────────────────────────────────
   ✅ 4페이지
───────────────────────────────────────────────────────────── */
export function renderEnergyUnitIntensitySummaryPage(
  doc,
  { building, report, pageNo = 4, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  const frame = __layout?.FRAME || DEFAULT_FRAME;
  const safe = __layout?.SAFE || DEFAULT_SAFE;

  const W = doc.internal.pageSize.getWidth();
  const left = safe.L;
  const right = W - safe.R;
  const width = right - left;

  setKR(doc);
  pageChrome(
    doc,
    `사. 에너지 원단위 분석${titleSuffix ? ` ${titleSuffix}` : ""}`,
    frame,
    `페이지 ${pageNo}/${totalPages}`,
  );

  const e = resolveEnergy(report, building, new Date().getFullYear());
  const base = baseTableStyle();

  const areaM2 = resolveAreaM2(building, report);

  const totalKwh1 = e.kwh1 || e.monthlyKwh1.reduce((a, b) => a + N(b), 0);
  const totalKwh2 = e.kwh2 || e.monthlyKwh2.reduce((a, b) => a + N(b), 0);
  const totalWon1 = e.won1 || e.monthlyCost1.reduce((a, b) => a + N(b), 0);
  const totalWon2 = e.won2 || e.monthlyCost2.reduce((a, b) => a + N(b), 0);

  const intensity1 = areaM2 > 0 ? totalKwh1 / areaM2 : 0;
  const intensity2 = areaM2 > 0 ? totalKwh2 / areaM2 : 0;
  const wonPerM21 = areaM2 > 0 ? totalWon1 / areaM2 : 0;
  const wonPerM22 = areaM2 > 0 ? totalWon2 / areaM2 : 0;

  const incIntensity = intensity1 > 0 ? ((intensity2 - intensity1) / intensity1) * 100 : 0;
  const incWonPerM2 = wonPerM21 > 0 ? ((wonPerM22 - wonPerM21) / wonPerM21) * 100 : 0;

  const mwh1 = totalKwh1 / 1000;
  const mwh2 = totalKwh2 / 1000;
  const costM1 = totalWon1 / 1_000_000;
  const costM2 = totalWon2 / 1_000_000;

  const unitWonPerKwh1 = totalKwh1 > 0 ? totalWon1 / totalKwh1 : 0;
  const unitWonPerKwh2 = totalKwh2 > 0 ? totalWon2 / totalKwh2 : 0;

  const incMwh = mwh1 > 0 ? ((mwh2 - mwh1) / mwh1) * 100 : 0;
  const incCostM = costM1 > 0 ? ((costM2 - costM1) / costM1) * 100 : 0;
  const incUnitWonPerKwh =
    unitWonPerKwh1 > 0 ? ((unitWonPerKwh2 - unitWonPerKwh1) / unitWonPerKwh1) * 100 : 0;

  const toe1 = mwh1 * GHG_RULES.toePerMwh;
  const toe2 = mwh2 * GHG_RULES.toePerMwh;
  const incToe = toe1 > 0 ? ((toe2 - toe1) / toe1) * 100 : 0;

  const kgoePerM21 = areaM2 > 0 ? (toe1 * 1000) / areaM2 : 0;
  const kgoePerM22 = areaM2 > 0 ? (toe2 * 1000) / areaM2 : 0;
  const incKgoe = kgoePerM21 > 0 ? ((kgoePerM22 - kgoePerM21) / kgoePerM21) * 100 : 0;

  let y = frame.T + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("1) 2년간 에너지사용 원단위 분석", left + 1.5, y);
  y += 4;

  const chartH = 58;
  drawUnitComboChart(doc, {
    x: left,
    y: y + 2,
    w: width,
    h: chartH,
    title: "최근 2년간 전기 원단위 분석",
    bar1: intensity1,
    bar2: intensity2,
    line1: wonPerM21,
    line2: wonPerM22,
    y1: e.y1,
    y2: e.y2,
  });
  y += chartH + 10;

  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    head: [
      [
        { content: "구분", rowSpan: 2 },
        { content: "단위", rowSpan: 2 },
        { content: `${e.y1}` },
        { content: `${e.y2}` },
        { content: `비교(${e.y1}대비)`, rowSpan: 2 },
      ],
      ["", "", "", "", ""],
    ],
    body: [
      ["전력", "[kWh/㎡]", fmt2(intensity1), fmt2(intensity2), `${fmt2(incIntensity)} [%]`],
      ["원단위", "[원/㎡]", fmtComma2(wonPerM21), fmtComma2(wonPerM22), `${fmt2(incWonPerM2)} [%]`],
    ],
    columnStyles: {
      0: { cellWidth: width * 0.18, halign: "center" },
      1: { cellWidth: width * 0.16, halign: "center" },
      2: { cellWidth: width * 0.18, halign: "center" },
      3: { cellWidth: width * 0.18, halign: "center" },
      4: { cellWidth: width * 0.30, halign: "center" },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("아. 에너지 사용현황 종합", left + 1.5, y);
  y += 4;

  autoTable(doc, {
    ...base,
    startY: y + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    head: [[{ content: "항목" }, { content: "단위" }, { content: `${e.y1}` }, { content: `${e.y2}` }, { content: `비교(${e.y1}대비)` }]],
    body: [
      ["건물 면적", "[㎡]", areaM2 ? fmtComma2(areaM2) : "—", areaM2 ? fmtComma2(areaM2) : "—", "—"],
      ["사용량", "[MWh/년]", fmtComma(mwh1), fmtComma(mwh2), `${fmt2(incMwh)} [%]`],
      ["요금", "[백만원/년]", fmtComma(costM1), fmtComma(costM2), `${fmt2(incCostM)} [%]`],
      ["단가", "[원/kWh]", fmt2(unitWonPerKwh1), fmt2(unitWonPerKwh2), `${fmt2(incUnitWonPerKwh)} [%]`],
      ["단위사용량", "[kWh/㎡]", fmt2(intensity1), fmt2(intensity2), `${fmt2(incIntensity)} [%]`],
      ["원단위", "[원/㎡]", fmtComma2(wonPerM21), fmtComma2(wonPerM22), `${fmt2(incWonPerM2)} [%]`],
      ["석유환산톤", "[toe/년]", fmt2(toe1), fmt2(toe2), `${fmt2(incToe)} [%]`],
      ["단위 석유환산톤", "[kgoe/㎡]", fmt2(kgoePerM21), fmt2(kgoePerM22), `${fmt2(incKgoe)} [%]`],
      ["단위 온실가스배출량", "[kgCO2eq/㎡]", "—", "—", "—"],
    ],
    columnStyles: {
      0: { cellWidth: width * 0.26, halign: "center" },
      1: { cellWidth: width * 0.18, halign: "center" },
      2: { cellWidth: width * 0.18, halign: "center" },
      3: { cellWidth: width * 0.18, halign: "center" },
      4: { cellWidth: width * 0.20, halign: "center" },
    },
    styles: { ...base.styles, fontSize: 9.0 },
  });

  footerNo(doc, pageNo);
}
