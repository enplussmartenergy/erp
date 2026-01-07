// src/pages/Reports/Create/Components/pdf/buildEnergyUsagePage.js
import autoTable from "jspdf-autotable";

const BLACK = 0;

// 기본 프레임/세이프 (마스터에서 __layout 넘기면 그걸 우선 사용)
const DEFAULT_FRAME = { L: 10, R: 10, T: 20, B: 8 };
const DEFAULT_SAFE = { L: DEFAULT_FRAME.L + 4, R: DEFAULT_FRAME.R + 4 };

/* =========================
   ✅ 페이지 안전 유틸 (빈 페이지 방지)
========================= */
function gotoLastPage(doc) {
  const n = doc.getNumberOfPages();
  doc.setPage(n);
}

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

const fmtComma = (n) => {
  const v = +n;
  return Number.isFinite(v) ? v.toLocaleString("ko-KR") : "";
};
const fmtComma2 = (n) => {
  const v = +n;
  return Number.isFinite(v)
    ? v.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
};

const pct = (base, next) => {
  const b = +base;
  const n = +next;
  if (!Number.isFinite(b) || b === 0 || !Number.isFinite(n)) return null;
  return ((n - b) / b) * 100;
};
const fmtPct = (p) => (p == null ? "—" : `${fmt2(p)} [%]`);

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function drawBox(doc, x, y, w, h) {
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, "S");
}

/* =========================
   ✅ 컬러(가독성용 / 텍스트는 검정)
========================= */
const COLOR = {
  head: [240, 240, 240],
  sum: [255, 255, 140],
  gas: [255, 235, 235],
  elec: [235, 242, 255],
  note: [245, 245, 245],
};

/* ─────────────────────────────────────────────────────────────
   ✅ 에너지 데이터 resolve (전기 + 가스)
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

  const e1 = pickElectric(y1raw);
  const e2 = pickElectric(y2raw);
  const g1 = pickGas(y1raw);
  const g2 = pickGas(y2raw);

  const mwh1 = e1.totalKwh ? e1.totalKwh / 1000 : 0;
  const mwh2 = e2.totalKwh ? e2.totalKwh / 1000 : 0;

  const costM1 = e1.totalWon ? e1.totalWon / 1_000_000 : 0;
  const costM2 = e2.totalWon ? e2.totalWon / 1_000_000 : 0;

  const gasCostM1 = g1.totalWon ? g1.totalWon / 1_000_000 : 0;
  const gasCostM2 = g2.totalWon ? g2.totalWon / 1_000_000 : 0;

  return {
    baseYear,
    y1,
    y2,

    // 전기
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

    // 가스
    gas1: g1,
    gas2: g2,
    gasCostM1,
    gasCostM2,
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
      fontSize: 9.0,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      cellPadding: { top: 1.8, right: 2.0, bottom: 1.8, left: 2.0 },
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: COLOR.head,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      fontStyle: "bold",
      halign: "center",
    },
  };
}

/* ============================================================
   ✅ 계산용 계수(전기) - 기존 유지(절대 변경 금지)
============================================================ */
const GHG_RULES = {
  tjPerMwh: 0.0096,
  toePerMwh: 0.229,
  co2_tPerMwh: 0.5,
  ch4_kgPerMwh: 0.000125,
  n2o_kgPerMwh: 0.00001,
  tco2eqPerMwh: 0.459410593191394,
};

/* ============================================================
   ✅ 가스 계산(요청 규칙 그대로)
============================================================ */
const GAS_RULES = {
  toePerNm3: 1.0190,
  tjPerNm3: 0.0431,
  // tCO2 = use * 0.0389 * 56100 / 1000
  tco2_perNm3: (0.0389 * 56100) / 1000,
  // kgCH4 = use * 0.0389
  kgch4_perNm3: 0.0389,
  // kgN2O = use * 0.00389
  kgn2o_perNm3: 0.00389,
  // tCO2eq = tCO2 + (kgCH4*21)/1000 + (kgN2O*310)/1000
  toTco2eq: (tco2, kgch4, kgn2o) => tco2 + (kgch4 * 21) / 1000 + (kgn2o * 310) / 1000,
};

/* ───────── grouped bar: 2 fuels(가스/전기) x 2 years ───────── */
function drawGroupedBars2Fuel(doc, { x, y, w, h, title, y1, y2, gas1, elec1, gas2, elec2, unitLabel }) {
  setKR(doc);
  drawBox(doc, x, y, w, h);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, x + w / 2, y + 10, { align: "center" });

  const padL = 16;
  const padR = 12;
  const padT = 18;
  const padB = 18;

  const px = x + padL;
  const py = y + padT;
  const pw = w - padL - padR;
  const ph = h - padT - padB;

  const maxV = Math.max(gas1, elec1, gas2, elec2, 1);

  // 그룹 2개(연도), 각 그룹에 2개 막대(가스/전기)
  const groupW = pw / 2;
  const barW = groupW * 0.26;
  const gap = groupW * 0.10;

  const xG1 = px + groupW * 0.5;
  const xG2 = px + groupW * 1.5;

  const barH = (v) => (v / maxV) * (ph * 0.78);

  // 축선
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.line(px, py + ph, px + pw, py + ph);

  // 색(배경만 살짝): 가스=연분홍, 전기=연파랑
  const GAS_FILL = [255, 210, 210];
  const ELEC_FILL = [210, 225, 255];

  const drawPair = (cx, gasV, elecV) => {
    const gx = cx - (barW + gap / 2);
    const ex = cx + gap / 2;

    const gh = barH(gasV);
    const eh = barH(elecV);

    doc.setFillColor(...GAS_FILL);
    doc.rect(gx, py + ph - gh, barW, gh, "F");

    doc.setFillColor(...ELEC_FILL);
    doc.rect(ex, py + ph - eh, barW, eh, "F");

    doc.setTextColor(0);
    doc.setFont("NotoSansKR", "bold");
    doc.setFontSize(9);

    doc.text(fmtComma2(gasV), gx + barW / 2, clamp(py + ph - gh + 9, py + 14, py + ph - 3), {
      align: "center",
    });
    doc.text(fmtComma2(elecV), ex + barW / 2, clamp(py + ph - eh + 9, py + 14, py + ph - 3), {
      align: "center",
    });
  };

  drawPair(xG1, gas1, elec1);
  drawPair(xG2, gas2, elec2);

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);
  doc.text(`${y1}년`, xG1, py + ph + 10, { align: "center" });
  doc.text(`${y2}년`, xG2, py + ph + 10, { align: "center" });

  // legend
  const ly = y + h - 8;
  doc.setFillColor(255, 210, 210);
  doc.rect(x + 14, ly - 3, 7, 3, "F");
  doc.setTextColor(0);
  doc.text("도시가스(LNG)", x + 24, ly);

  doc.setFillColor(210, 225, 255);
  doc.rect(x + 84, ly - 3, 7, 3, "F");
  doc.text("전력", x + 94, ly);

  doc.setFontSize(9);
  doc.text(unitLabel || "", x + w - 8, y + 12, { align: "right" });
}

/* ───────── 월별 라인 차트 (2년) ───────── */
function drawMonthlyLineChart2(doc, { x, y, w, h, title, y1, y2, v1, v2, unitLabel = "" }) {
  setKR(doc);
  drawBox(doc, x, y, w, h);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, x + w / 2, y + 10, { align: "center" });

  if (unitLabel) {
    doc.setFont("NotoSansKR", "normal");
    doc.setFontSize(9);
    doc.text(`[${unitLabel}]`, x + 10, y + 13);
  }

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

/* ───────── 원단위(막대+선) 콤보 차트 (2년 비교) ─────────
   - bar: 단위사용량(좌축)
   - line: 원단위(우축)
*/
function drawUnitComboChart2Years(doc, { x, y, w, h, title, y1, y2, barUnit, lineUnit, bar1, bar2, line1, line2 }) {
  setKR(doc);
  drawBox(doc, x, y, w, h);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(title, x + w / 2, y + 10, { align: "center" });

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(8.8);
  doc.text(`[${barUnit}]`, x + 8, y + 13);
  doc.text(`[${lineUnit}]`, x + w - 8, y + 13, { align: "right" });

  const padL = 22;
  const padR = 22;
  const padT = 18;
  const padB = 18;

  const px = x + padL;
  const py = y + padT;
  const pw = w - padL - padR;
  const ph = h - padT - padB;

  const maxBar = Math.max(bar1, bar2, 1);
  const maxLine = Math.max(line1, line2, 1);

  // 축/그리드
  doc.setLineWidth(0.2);
  doc.setDrawColor(210);
  for (let t = 0; t <= 4; t++) {
    const yy = py + (ph * t) / 4;
    doc.line(px, yy, px + pw, yy);
  }
  doc.setDrawColor(0);
  doc.line(px, py, px, py + ph);
  doc.line(px, py + ph, px + pw, py + ph);

  // bar 2개 (연도)
  const barW = pw * 0.18;
  const gap = pw * 0.18;
  const cx1 = px + pw * 0.33;
  const cx2 = px + pw * 0.67;

  const bh = (v) => (v / maxBar) * (ph * 0.85);
  const ly = (v) => py + ph - (v / maxLine) * (ph * 0.85);

  // bar fill (살짝 컬러)
  doc.setFillColor(255, 120, 120); // red-ish
  doc.rect(cx1 - barW / 2, py + ph - bh(bar1), barW, bh(bar1), "F");
  doc.rect(cx2 - barW / 2, py + ph - bh(bar2), barW, bh(bar2), "F");

  // line (navy-ish)
  doc.setDrawColor(20, 40, 90);
  doc.setLineWidth(0.6);
  doc.line(cx1, ly(line1), cx2, ly(line2));
  doc.setFillColor(20, 40, 90);
  doc.circle(cx1, ly(line1), 1.2, "F");
  doc.circle(cx2, ly(line2), 1.2, "F");

  // labels
  doc.setTextColor(0);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);
  doc.text(`${y1}`, cx1, y + h - 8, { align: "center" });
  doc.text(`${y2}`, cx2, y + h - 8, { align: "center" });

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(8.8);
  doc.text(fmt2(bar1), cx1, clamp(py + ph - bh(bar1) + 9, py + 14, py + ph - 3), { align: "center" });
  doc.text(fmt2(bar2), cx2, clamp(py + ph - bh(bar2) + 9, py + 14, py + ph - 3), { align: "center" });

  doc.setFont("NotoSansKR", "normal");
  doc.text(fmtComma2(line1), cx1, clamp(ly(line1) - 3, py + 10, py + ph - 10), { align: "center" });
  doc.text(fmtComma2(line2), cx2, clamp(ly(line2) - 3, py + 10, py + ph - 10), { align: "center" });

  // legend
  const legY = y + h - 4;
  doc.setFillColor(255, 120, 120);
  doc.rect(x + 10, legY - 3, 7, 3, "F");
  doc.setTextColor(0);
  doc.setFontSize(8.8);
  doc.text("단위사용량", x + 20, legY);

  doc.setDrawColor(20, 40, 90);
  doc.setLineWidth(0.6);
  doc.line(x + 68, legY - 1.5, x + 82, legY - 1.5);
  doc.setFillColor(20, 40, 90);
  doc.circle(x + 75, legY - 1.5, 1.0, "F");
  doc.setTextColor(0);
  doc.text("원단위", x + 86, legY);
}

/* ============================================================
   ✅ 1페이지: 라. 에너지 사용 현황 (가스+전기)
============================================================ */
export function renderEnergyUsagePage(
  doc,
  { building, report, pageNo = 1, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  gotoLastPage(doc);

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

  // 전기 toe
  const elecToe1 = e.mwh1 * GHG_RULES.toePerMwh;
  const elecToe2 = e.mwh2 * GHG_RULES.toePerMwh;

  // 가스 toe (요청)
  const gasUse1 = e.gas1?.enabled ? e.gas1.totalUse : 0;
  const gasUse2 = e.gas2?.enabled ? e.gas2.totalUse : 0;
  const gasToe1 = gasUse1 * GAS_RULES.toePerNm3;
  const gasToe2 = gasUse2 * GAS_RULES.toePerNm3;

  const sumToe1 = elecToe1 + gasToe1;
  const sumToe2 = elecToe2 + gasToe2;

  const sumCostM1 = e.costM1 + (e.gas1?.enabled ? e.gasCostM1 : 0);
  const sumCostM2 = e.costM2 + (e.gas2?.enabled ? e.gasCostM2 : 0);

  const incSumToe = pct(sumToe1, sumToe2);

  let y = frame.T + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("1) 최근 2년간 에너지 사용 현황", left + 1.5, y);
  y += 4;

  const hasGas = !!(e.gas1?.enabled || e.gas2?.enabled);

  // ✅ 표: 가스+전기 모두
  const bodyRows = [];

  if (hasGas) {
    bodyRows.push(
      [
        { content: "연료" },
        { content: "도시가스(LNG)", styles: { fillColor: COLOR.gas } },
        { content: "천Nm3/년" },
        { content: fmt2(gasUse1 / 1000) },
        { content: fmtComma(e.gasCostM1), rowSpan: 2 },
        { content: fmt2(gasUse2 / 1000) },
        { content: fmtComma(e.gasCostM2), rowSpan: 2 },
      ],
      [
        { content: "연료" },
        { content: "도시가스(LNG)", styles: { fillColor: COLOR.gas } },
        { content: "toe/년" },
        { content: fmt2(gasToe1) },
        null,
        { content: fmt2(gasToe2) },
        null,
      ],
    );
  }

  bodyRows.push(
    [
      { content: "전력" },
      { content: "수전", styles: { fillColor: COLOR.elec } },
      { content: "MWh/년" },
      { content: fmtComma(e.mwh1) },
      { content: fmtComma(e.costM1), rowSpan: 2 },
      { content: fmtComma(e.mwh2) },
      { content: fmtComma(e.costM2), rowSpan: 2 },
    ],
    [
      { content: "전력" },
      { content: "수전", styles: { fillColor: COLOR.elec } },
      { content: "toe/년" },
      { content: fmt2(elecToe1) },
      null,
      { content: fmt2(elecToe2) },
      null,
    ],
    [
      { content: "합계", styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      { content: "", styles: { fillColor: COLOR.sum } },
      { content: "toe/년", styles: { fillColor: COLOR.sum } },
      { content: fmt2(sumToe1), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      { content: fmtComma(sumCostM1), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      { content: fmt2(sumToe2), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      { content: fmtComma(sumCostM2), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
    ],
  );

  autoTable(doc, {
    ...base,
    startY: y + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    head: [
      [
        { content: "구분", rowSpan: 2 },
        { content: "세부", rowSpan: 2 },
        { content: "단위", rowSpan: 2 },
        { content: `${e.y1}`, colSpan: 2 },
        { content: `${e.y2}`, colSpan: 2 },
      ],
      ["사용량", "비용 [백만원]", "사용량", "비용 [백만원]"],
    ],
    body: bodyRows,
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.cell.raw == null) data.cell.text = [""];
    },
    // ✅ 깨짐 방지: 열 폭 고정(합=width)
    columnStyles: {
      0: { cellWidth: width * 0.14 },
      1: { cellWidth: width * 0.16 },
      2: { cellWidth: width * 0.12 },
      3: { cellWidth: width * 0.18 },
      4: { cellWidth: width * 0.20 },
      5: { cellWidth: width * 0.18 },
      6: { cellWidth: width * 0.20 },
    },
    styles: { ...base.styles, fontSize: 8.7 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ✅ 차트(한 페이지에 무조건 들어오게 높이 축소)
  const boxW = (width - 10) / 2;
  const boxH = 52;

  // (1) toe 차트: 가스/전기 구분
  drawGroupedBars2Fuel(doc, {
    x: left,
    y,
    w: boxW,
    h: boxH,
    title: "2년간 에너지 사용량 [toe]",
    y1: e.y1,
    y2: e.y2,
    gas1: gasToe1,
    elec1: elecToe1,
    gas2: gasToe2,
    elec2: elecToe2,
    unitLabel: "",
  });

  // (2) 비용 차트(백만원): 가스/전기 구분
  drawGroupedBars2Fuel(doc, {
    x: left + boxW + 10,
    y,
    w: boxW,
    h: boxH,
    title: "2년간 에너지 사용금액 [백만원]",
    y1: e.y1,
    y2: e.y2,
    gas1: e.gas1?.enabled ? e.gasCostM1 : 0,
    elec1: e.costM1,
    gas2: e.gas2?.enabled ? e.gasCostM2 : 0,
    elec2: e.costM2,
    unitLabel: "",
  });

  y += boxH + 6;

  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9.2);
  doc.text(`※ ${e.y1}년 대비 ${e.y2}년 에너지 사용량 증감율`, left, y);
  y += 5;

  doc.text(
    `… 합계 [toe/년] : (${fmt2(sumToe2)} - ${fmt2(sumToe1)}) ÷ ${fmt2(sumToe1)} × 100 = ${fmt2(incSumToe ?? 0)} [%]`,
    left + 2,
    y,
  );
  y += 7;

  // ✅ 하단 요약표 2개(좌: toe, 우: 비용) - 작게
  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: left, right: W - (left + boxW) },
    tableWidth: boxW,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    head: [[{ content: "구분" }, { content: "사용량 [toe]" }]],
    body: [
      [`${e.y1}`, fmt2(sumToe1)],
      [`${e.y2}`, fmt2(sumToe2)],
    ],
    styles: { ...base.styles, fontSize: 8.8 },
    columnStyles: { 0: { cellWidth: boxW * 0.38 }, 1: { cellWidth: boxW * 0.62 } },
  });

  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: left + boxW + 10, right: safe.R },
    tableWidth: boxW,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    head: [[{ content: "구분" }, { content: "사용금액 [백만원]" }]],
    body: [
      [`${e.y1}`, fmtComma(sumCostM1)],
      [`${e.y2}`, fmtComma(sumCostM2)],
    ],
    styles: { ...base.styles, fontSize: 8.8 },
    columnStyles: { 0: { cellWidth: boxW * 0.38 }, 1: { cellWidth: boxW * 0.62 } },
  });

  footerNo(doc, pageNo);
}

/* ============================================================
   ✅ 2페이지: 에너지 사용 및 온실가스 배출 (전기+가스)
============================================================ */
export function renderEnergyUsageGhGPage(
  doc,
  { building, report, pageNo = 2, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  gotoLastPage(doc);

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

  // 전기(간접)
  const mwh = e.kwh2 > 0 ? e.kwh2 / 1000 : 0;
  const costM_e = e.won2 > 0 ? e.won2 / 1_000_000 : e.costM2;
  const unitWonPerKwh = e.kwh2 > 0 ? e.won2 / e.kwh2 : 0;

  const tj_e = mwh * GHG_RULES.tjPerMwh;
  const toe_e = mwh * GHG_RULES.toePerMwh;

  const co2_e = mwh * GHG_RULES.co2_tPerMwh;
  const ch4_e = mwh * GHG_RULES.ch4_kgPerMwh;
  const n2o_e = mwh * GHG_RULES.n2o_kgPerMwh;
  const tco2eq_e = mwh * GHG_RULES.tco2eqPerMwh;

  // 가스(직접) - 요청 공식
  const gasUse = e.gas2?.enabled ? e.gas2.totalUse : 0;
  const costM_g = e.gas2?.enabled ? e.gasCostM2 : 0;
  const unitWonPerNm3 = gasUse > 0 ? (e.gas2.totalWon || 0) / gasUse : 0;

  const toe_g = gasUse * GAS_RULES.toePerNm3;
  const tj_g = gasUse * GAS_RULES.tjPerNm3;

  const tco2_g = gasUse * GAS_RULES.tco2_perNm3;
  const kgch4_g = gasUse * GAS_RULES.kgch4_perNm3;
  const kgn2o_g = gasUse * GAS_RULES.kgn2o_perNm3;
  const tco2eq_g = GAS_RULES.toTco2eq(tco2_g, kgch4_g, kgn2o_g);

  // 합계
  const tj_sum = tj_e + tj_g;
  const tco2eq_sum = tco2eq_e + tco2eq_g;
  const costM_sum = costM_e + costM_g;

  let curY = frame.T + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(`2) ${yearLabel}년 에너지 사용 및 온실가스 배출 현황`, left + 1.5, curY);
  curY += 4;

  const rows = [];

  if (e.gas2?.enabled) {
    rows.push(
      [
        { content: "연료 / 도시가스(LNG)", styles: { fillColor: COLOR.gas } },
        "천Nm3/년",
        fmt2(gasUse / 1000),
        fmtComma(costM_g),
        `${fmt2(unitWonPerNm3)} [원/Nm3]`,
      ],
      ["", "TJ/년", fmt3(tj_g), "", ""],
    );
  }

  rows.push(
    [
      { content: "전력 / 수전", styles: { fillColor: COLOR.elec } },
      "MWh/년",
      fmtComma(mwh),
      fmtComma(costM_e),
      `${fmt2(unitWonPerKwh)} [원/kWh]`,
    ],
    ["", "TJ/년", fmt3(tj_e), "", ""],
    [{ content: "합계", styles: { fillColor: COLOR.sum, fontStyle: "bold" } }, "TJ/년", fmt3(tj_sum), fmtComma(costM_sum), "—"],
    ["온실가스배출량", "tCO2eq/년", fmt1(tco2eq_sum), "—", "—"],
  );

  autoTable(doc, {
    ...base,
    startY: curY + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    head: [[{ content: "구분" }, { content: "단위" }, { content: "사용량(배출량)" }, { content: "비용[백만원]" }, { content: "현재 연료 단가" }]],
    body: rows,
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.cell.raw == null) data.cell.text = [""];
    },
    columnStyles: {
      0: { cellWidth: width * 0.32 },
      1: { cellWidth: width * 0.14 },
      2: { cellWidth: width * 0.20 },
      3: { cellWidth: width * 0.16 },
      4: { cellWidth: width * 0.18 },
    },
    styles: { ...base.styles, fontSize: 8.8 },
  });

  curY = doc.lastAutoTable.finalY + 6;

  // ✅ 계산식 박스(유지)
  const formulaH = 32;
  drawBox(doc, left, curY, width, formulaH);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(8.8);

  doc.text(`※ 전기: TJ/년 = MWh/년 × 0.0096  |  toe/년 = MWh/년 × 0.229`, left + 4, curY + 10);
  doc.text(`※ 가스: toe = 사용량×1.0190  |  TJ/년 = 사용량×0.0431`, left + 4, curY + 18);
  doc.text(`※ 가스 tCO2eq = tCO2 + (kgCH4×21)/1000 + (kgN2O×310)/1000`, left + 4, curY + 26);

  curY += formulaH + 8;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text(`3) ${yearLabel}년 에너지 사용 및 온실가스 배출량 표기`, left + 1.5, curY);
  curY += 4;

  const tableRows = [];
  if (e.gas2?.enabled) {
    tableRows.push([
      "도시가스(LNG)",
      fmt2(gasUse / 1000),
      fmt2(toe_g),
      fmt3(tj_g),
      fmt2(tco2_g),
      fmt2(kgch4_g),
      fmt2(kgn2o_g),
      fmt2(tco2eq_g),
    ]);
  }
  tableRows.push([
    "전 력",
    fmtComma(mwh),
    fmt2(toe_e),
    fmt3(tj_e),
    fmt1(co2_e),
    fmt3(ch4_e),
    fmt3(n2o_e),
    fmt1(tco2eq_e),
  ]);

  // 합계행
  tableRows.push([
    { content: "합계", styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
    "",
    { content: fmt2(toe_e + toe_g), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
    { content: fmt3(tj_sum), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
    "",
    "",
    "",
    { content: fmt1(tco2eq_sum), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
  ]);

  autoTable(doc, {
    ...base,
    startY: curY + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    head: [
      [
        { content: "연료명" },
        { content: "단위/년" },
        { content: "toe/년" },
        { content: "TJ/년" },
        { content: "CO2" },
        { content: "CH4" },
        { content: "N2O" },
        { content: "합계(tCO2eq)" },
      ],
    ],
    body: tableRows,
    columnStyles: {
      0: { cellWidth: width * 0.18 },
      1: { cellWidth: width * 0.12 },
      2: { cellWidth: width * 0.10 },
      3: { cellWidth: width * 0.10 },
      4: { cellWidth: width * 0.12 },
      5: { cellWidth: width * 0.12 },
      6: { cellWidth: width * 0.12 },
      7: { cellWidth: width * 0.14 },
    },
    styles: { ...base.styles, fontSize: 8.4 },
  });

  footerNo(doc, pageNo);
}

/* ============================================================
   ✅ 3페이지: 월별 사용/비용 (전기/가스 둘 다 표시)
============================================================ */
export function renderEnergyMonthlyUsageCostPage(
  doc,
  { building, report, pageNo = 3, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  gotoLastPage(doc);

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

  // ✅ 가스(있으면) 라인차트
  if (e.gas1?.enabled || e.gas2?.enabled) {
    doc.setFont("NotoSansKR", "bold");
    doc.setFontSize(11);
    doc.text("1) 도시가스(LNG) 2년간 사용량 추이", left + 1.5, y);
    y += 4;

    const chartH = 44;
    drawMonthlyLineChart2(doc, {
      x: left,
      y: y + 2,
      w: width,
      h: chartH,
      title: `최근 2년간 LNG(도시가스) 사용량 추이`,
      y1: e.y1,
      y2: e.y2,
      v1: e.gas1.monthlyUseRaw.map((v) => N(v)),
      v2: e.gas2.monthlyUseRaw.map((v) => N(v)),
      unitLabel: "Nm³/월",
    });
    y += chartH + 8;
  }

  // ✅ 전기 라인차트
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("2) 전력 2년간 사용량 추이", left + 1.5, y);
  y += 4;

  {
    const chartH = 44;
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
      unitLabel: "kWh/월",
    });
    y += chartH + 8;
  }

  // ✅ 월별 표(가스 + 전기)
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("바. 에너지비용 사용현황", left + 1.5, y);
  y += 6;

  const months = Array.from({ length: 12 }).map((_, i) => `${i + 1}월`);
  const isBlank = (v) => String(v ?? "").replaceAll(",", "").trim() === "";
  const cell = (raw) => (isBlank(raw) ? "" : fmtComma(N(raw)));

  // 가스 표
  if (e.gas1?.enabled || e.gas2?.enabled) {
    doc.setFontSize(10.5);
    doc.text("1) 도시가스(LNG) 2년간 사용금액", left + 1.5, y);
    y += 3;

    autoTable(doc, {
      ...base,
      startY: y + 2,
      margin: { left: safe.L, right: safe.R },
      tableWidth: width,
      pageBreak: "avoid",
      rowPageBreak: "avoid",
      head: [
        [
          { content: "구분", rowSpan: 2 },
          { content: `${e.y1}년`, colSpan: 2 },
          { content: `${e.y2}년`, colSpan: 2 },
        ],
        ["사용량", "요금(원)", "사용량", "요금(원)"],
      ],
      body: [
        ...months.map((m, i) => [
          m,
          cell(e.gas1.monthlyUseRaw?.[i]),
          cell(e.gas1.monthlyCostRaw?.[i]),
          cell(e.gas2.monthlyUseRaw?.[i]),
          cell(e.gas2.monthlyCostRaw?.[i]),
        ]),
        [
          { content: "합계", styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
          { content: cell(e.gas1.totalUse), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
          { content: cell(e.gas1.totalWon), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
          { content: cell(e.gas2.totalUse), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
          { content: cell(e.gas2.totalWon), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
        ],
      ],
      styles: { ...base.styles, fontSize: 8.2 },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // 전기 표
  doc.setFontSize(10.5);
  doc.text("2) 전력 2년간 사용금액", left + 1.5, y);
  y += 3;

  const totalKwh1 = e.monthlyKwh1.reduce((a, b) => a + N(b), 0) || e.kwh1;
  const totalKwh2 = e.monthlyKwh2.reduce((a, b) => a + N(b), 0) || e.kwh2;
  const totalWon1 = e.monthlyCost1.reduce((a, b) => a + N(b), 0) || e.won1;
  const totalWon2 = e.monthlyCost2.reduce((a, b) => a + N(b), 0) || e.won2;

  autoTable(doc, {
    ...base,
    startY: y + 2,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
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
        { content: "합계", styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
        { content: fmtComma(totalKwh1), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
        { content: fmtComma(totalWon1), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
        { content: fmtComma(totalKwh2), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
        { content: fmtComma(totalWon2), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      ],
    ],
    styles: { ...base.styles, fontSize: 8.2 },
  });

  footerNo(doc, pageNo);
}

/* ============================================================
   ✅ 4페이지: 원단위 분석/종합 (전기 + 가스 있으면 상세 종합표)
============================================================ */
export function renderEnergyUnitIntensitySummaryPage(
  doc,
  { building, report, pageNo = 4, totalPages = 1, titleSuffix = "", __layout } = {},
) {
  gotoLastPage(doc);

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

  const hasGas = !!(e.gas1?.enabled || e.gas2?.enabled);

  // ===== 전기 totals =====
  const totalKwh1 = e.kwh1 || e.monthlyKwh1.reduce((a, b) => a + N(b), 0);
  const totalKwh2 = e.kwh2 || e.monthlyKwh2.reduce((a, b) => a + N(b), 0);
  const totalWon1 = e.won1 || e.monthlyCost1.reduce((a, b) => a + N(b), 0);
  const totalWon2 = e.won2 || e.monthlyCost2.reduce((a, b) => a + N(b), 0);

  const mwh1 = totalKwh1 / 1000;
  const mwh2 = totalKwh2 / 1000;

  const costM1 = totalWon1 / 1_000_000;
  const costM2 = totalWon2 / 1_000_000;

  const unitWonPerKwh1 = totalKwh1 > 0 ? totalWon1 / totalKwh1 : 0;
  const unitWonPerKwh2 = totalKwh2 > 0 ? totalWon2 / totalKwh2 : 0;

  // ===== 가스 totals =====
  const gasUse1 = e.gas1?.enabled ? e.gas1.totalUse : 0; // Nm3/년
  const gasUse2 = e.gas2?.enabled ? e.gas2.totalUse : 0;

  const gasWon1 = e.gas1?.enabled ? (e.gas1.totalWon || 0) : 0;
  const gasWon2 = e.gas2?.enabled ? (e.gas2.totalWon || 0) : 0;

  const gasCostM1 = gasWon1 / 1_000_000;
  const gasCostM2 = gasWon2 / 1_000_000;

  const gasUnitWonPerNm31 = gasUse1 > 0 ? gasWon1 / gasUse1 : 0;
  const gasUnitWonPerNm32 = gasUse2 > 0 ? gasWon2 / gasUse2 : 0;

  // ===== 원단위(면적 기준) =====
  const elecUsePerM21 = areaM2 > 0 ? totalKwh1 / areaM2 : 0; // kWh/m2
  const elecUsePerM22 = areaM2 > 0 ? totalKwh2 / areaM2 : 0;

  const elecWonPerM21 = areaM2 > 0 ? totalWon1 / areaM2 : 0; // 원/m2
  const elecWonPerM22 = areaM2 > 0 ? totalWon2 / areaM2 : 0;

  const gasUsePerM21 = areaM2 > 0 ? gasUse1 / areaM2 : 0; // Nm3/m2
  const gasUsePerM22 = areaM2 > 0 ? gasUse2 / areaM2 : 0;

  const gasWonPerM21 = areaM2 > 0 ? gasWon1 / areaM2 : 0;
  const gasWonPerM22 = areaM2 > 0 ? gasWon2 / areaM2 : 0;

  // ===== toe / kgoe =====
  const toe1_e = mwh1 * GHG_RULES.toePerMwh;
  const toe2_e = mwh2 * GHG_RULES.toePerMwh;

  const toe1_g = gasUse1 * GAS_RULES.toePerNm3;
  const toe2_g = gasUse2 * GAS_RULES.toePerNm3;

  const toe1_sum = toe1_e + toe1_g;
  const toe2_sum = toe2_e + toe2_g;

  const kgoePerM21 = areaM2 > 0 ? (toe1_sum * 1000) / areaM2 : 0;
  const kgoePerM22 = areaM2 > 0 ? (toe2_sum * 1000) / areaM2 : 0;

  // ===== 증감율 =====
  const pElecUse = pct(elecUsePerM21, elecUsePerM22);
  const pElecWon = pct(elecWonPerM21, elecWonPerM22);
  const pToeSum = pct(toe1_sum, toe2_sum);
  const pKgoe = pct(kgoePerM21, kgoePerM22);

  let y = frame.T + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("1) 2년간 에너지사용 원단위 분석", left + 1.5, y);
  y += 4;

  // ✅ 그래프(원단위) - 전기 / (가스 있으면 가스도)
  const chartW = width;
  const chartH = hasGas ? 44 : 52;

  if (hasGas) {
    drawUnitComboChart2Years(doc, {
      x: left,
      y: y + 2,
      w: chartW,
      h: chartH,
      title: `최근 2년간 LNG 원단위 분석`,
      y1: e.y1,
      y2: e.y2,
      barUnit: "Nm³/㎡",
      lineUnit: "원/㎡",
      bar1: gasUsePerM21,
      bar2: gasUsePerM22,
      line1: gasWonPerM21,
      line2: gasWonPerM22,
    });
    y += chartH + 8;
  }

  drawUnitComboChart2Years(doc, {
    x: left,
    y: y + 2,
    w: chartW,
    h: hasGas ? 44 : 52,
    title: `최근 2년간 전기 원단위 분석`,
    y1: e.y1,
    y2: e.y2,
    barUnit: "kWh/㎡",
    lineUnit: "원/㎡",
    bar1: elecUsePerM21,
    bar2: elecUsePerM22,
    line1: elecWonPerM21,
    line2: elecWonPerM22,
  });
  y += (hasGas ? 44 : 52) + 8;

  // ✅ 원단위 분석 표(요청한 형태)
  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: safe.L, right: safe.R },
    tableWidth: width,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    head: [[{ content: "구분" }, { content: "단위" }, { content: `${e.y1}` }, { content: `${e.y2}` }, { content: `비고(${e.y1}대비)` }]],
    body: [
      ["전력 단위사용량", "[kWh/㎡]", fmt2(elecUsePerM21), fmt2(elecUsePerM22), fmtPct(pElecUse)],
      ["전력 원단위", "[원/㎡]", fmtComma2(elecWonPerM21), fmtComma2(elecWonPerM22), fmtPct(pElecWon)],
      ["석유환산톤(합계)", "[toe/년]", fmt2(toe1_sum), fmt2(toe2_sum), fmtPct(pToeSum)],
      ["단위 석유환산톤(합계)", "[kgoe/㎡]", fmt2(kgoePerM21), fmt2(kgoePerM22), fmtPct(pKgoe)],
    ],
    styles: { ...base.styles, fontSize: 9.0 },
    columnStyles: {
      0: { cellWidth: width * 0.32 },
      1: { cellWidth: width * 0.16 },
      2: { cellWidth: width * 0.17 },
      3: { cellWidth: width * 0.17 },
      4: { cellWidth: width * 0.18 },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("아. 에너지 사용현황 종합", left + 1.5, y);
  y += 4;

  // ✅ 가스가 있으면: 5번째 스크린샷 스타일(상세 종합표)
  if (hasGas) {
    const body = [];

    // 도시가스(LNG) 그룹 (rowSpan=5)
    body.push(
      [
        { content: "도시가스(LNG)", rowSpan: 5, styles: { fillColor: COLOR.gas, fontStyle: "bold" } },
        { content: "사용량", styles: { fillColor: COLOR.gas } },
        "[Nm³/년]",
        fmtComma2(gasUse1),
        fmtComma2(gasUse2),
        fmtPct(pct(gasUse1, gasUse2)),
      ],
      [
        null,
        { content: "요금", styles: { fillColor: COLOR.gas } },
        "[백만원/년]",
        fmtComma2(gasCostM1),
        fmtComma2(gasCostM2),
        fmtPct(pct(gasCostM1, gasCostM2)),
      ],
      [
        null,
        { content: "단가", styles: { fillColor: COLOR.gas } },
        "[원/Nm³]",
        fmt2(gasUnitWonPerNm31),
        fmt2(gasUnitWonPerNm32),
        fmtPct(pct(gasUnitWonPerNm31, gasUnitWonPerNm32)),
      ],
      [
        null,
        { content: "단위사용량", styles: { fillColor: COLOR.gas } },
        "[Nm³/㎡]",
        fmt2(gasUsePerM21),
        fmt2(gasUsePerM22),
        fmtPct(pct(gasUsePerM21, gasUsePerM22)),
      ],
      [
        null,
        { content: "원단위", styles: { fillColor: COLOR.gas } },
        "[원/㎡]",
        fmtComma2(gasWonPerM21),
        fmtComma2(gasWonPerM22),
        fmtPct(pct(gasWonPerM21, gasWonPerM22)),
      ],
    );

    // 전력 그룹 (rowSpan=5)
    body.push(
      [
        { content: "전력", rowSpan: 5, styles: { fillColor: COLOR.elec, fontStyle: "bold" } },
        { content: "사용량", styles: { fillColor: COLOR.elec } },
        "[MWh/년]",
        fmtComma2(mwh1),
        fmtComma2(mwh2),
        fmtPct(pct(mwh1, mwh2)),
      ],
      [
        null,
        { content: "요금", styles: { fillColor: COLOR.elec } },
        "[백만원/년]",
        fmtComma2(costM1),
        fmtComma2(costM2),
        fmtPct(pct(costM1, costM2)),
      ],
      [
        null,
        { content: "단가", styles: { fillColor: COLOR.elec } },
        "[원/kWh]",
        fmt2(unitWonPerKwh1),
        fmt2(unitWonPerKwh2),
        fmtPct(pct(unitWonPerKwh1, unitWonPerKwh2)),
      ],
      [
        null,
        { content: "단위사용량", styles: { fillColor: COLOR.elec } },
        "[kWh/㎡]",
        fmt2(elecUsePerM21),
        fmt2(elecUsePerM22),
        fmtPct(pElecUse),
      ],
      [
        null,
        { content: "원단위", styles: { fillColor: COLOR.elec } },
        "[원/㎡]",
        fmtComma2(elecWonPerM21),
        fmtComma2(elecWonPerM22),
        fmtPct(pElecWon),
      ],
    );

    // 석유환산톤 그룹 (rowSpan=3)
    body.push(
      [
        { content: "석유환산톤", rowSpan: 3, styles: { fillColor: COLOR.note, fontStyle: "bold" } },
        "도시가스(LNG)",
        "[toe/년]",
        fmt2(toe1_g),
        fmt2(toe2_g),
        fmtPct(pct(toe1_g, toe2_g)),
      ],
      [null, "전력", "[toe/년]", fmt2(toe1_e), fmt2(toe2_e), fmtPct(pct(toe1_e, toe2_e))],
      [
        null,
        { content: "소계", styles: { fontStyle: "bold" } },
        "[toe/년]",
        { content: fmt2(toe1_sum), styles: { fontStyle: "bold" } },
        { content: fmt2(toe2_sum), styles: { fontStyle: "bold" } },
        fmtPct(pToeSum),
      ],
    );

    // 단위 석유환산톤 (1행 강조)
    body.push([
      { content: "단위 석유환산톤", styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      "",
      "[kgoe/㎡]",
      { content: fmt2(kgoePerM21), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      { content: fmt2(kgoePerM22), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
      { content: fmtPct(pKgoe), styles: { fillColor: COLOR.sum, fontStyle: "bold" } },
    ]);

    autoTable(doc, {
      ...base,
      startY: y + 2,
      margin: { left: safe.L, right: safe.R },
      tableWidth: width,
      pageBreak: "avoid",
      rowPageBreak: "avoid",
      head: [[{ content: "항목" }, { content: "세부" }, { content: "단위" }, { content: `${e.y1}` }, { content: `${e.y2}` }, { content: `비고(${e.y1}대비)` }]],
      body,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.cell.raw == null) data.cell.text = [""];
      },
      styles: { ...base.styles, fontSize: 8.6 },
      columnStyles: {
        0: { cellWidth: width * 0.20 },
        1: { cellWidth: width * 0.20 },
        2: { cellWidth: width * 0.14 },
        3: { cellWidth: width * 0.16 },
        4: { cellWidth: width * 0.16 },
        5: { cellWidth: width * 0.14 },
      },
    });
  } else {
    // ✅ 가스 없으면: 간단 종합표(기존 유지 + 컬러/폭만 안정화)
    autoTable(doc, {
      ...base,
      startY: y + 2,
      margin: { left: safe.L, right: safe.R },
      tableWidth: width,
      pageBreak: "avoid",
      rowPageBreak: "avoid",
      head: [[{ content: "항목" }, { content: "단위" }, { content: `${e.y1}` }, { content: `${e.y2}` }, { content: `비교(${e.y1}대비)` }]],
      body: [
        ["건물 면적", "[㎡]", areaM2 ? fmtComma2(areaM2) : "—", areaM2 ? fmtComma2(areaM2) : "—", "—"],
        ["전력 사용량", "[MWh/년]", fmtComma(mwh1), fmtComma(mwh2), fmtPct(pct(mwh1, mwh2))],
        ["전력 요금", "[백만원/년]", fmtComma(costM1), fmtComma(costM2), fmtPct(pct(costM1, costM2))],
        ["전기 단가", "[원/kWh]", fmt2(unitWonPerKwh1), fmt2(unitWonPerKwh2), fmtPct(pct(unitWonPerKwh1, unitWonPerKwh2))],
        ["석유환산톤(합계)", "[toe/년]", fmt2(toe1_sum), fmt2(toe2_sum), fmtPct(pToeSum)],
        ["단위 석유환산톤(합계)", "[kgoe/㎡]", fmt2(kgoePerM21), fmt2(kgoePerM22), fmtPct(pKgoe)],
      ],
      styles: { ...base.styles, fontSize: 9.0 },
      columnStyles: {
        0: { cellWidth: width * 0.32 },
        1: { cellWidth: width * 0.18 },
        2: { cellWidth: width * 0.17 },
        3: { cellWidth: width * 0.17 },
        4: { cellWidth: width * 0.16 },
      },
    });
  }

  footerNo(doc, pageNo);
}
