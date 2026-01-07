// src/features/report/pdf2/buildMasterReportPdf.js
import jsPDF from "jspdf";

/* ============================== */
/* ========== 공통 상수 ========== */
/* ============================== */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 4, R: FRAME.R + 4 };

/* ============================== */
/* ========== 페이지 안전 ========= */
/* ============================== */
function gotoLastPage(doc) {
  const n = doc.getNumberOfPages();
  if (n >= 1) doc.setPage(n);
}
function addPageSafe(doc) {
  gotoLastPage(doc);
  doc.addPage();
  gotoLastPage(doc);
}

/* ============================== */
/* ========== 폰트/컬러 ========== */
/* ============================== */
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

/* ============================== */
/* ======= 외부 렌더러 임포트 ===== */
/* ============================== */
import { renderBuildingProfilePage } from "./buildBuildingProfilePage";
import { renderEquipmentStatusPage } from "./buildEquipmentStatusPage";

/* ✅ 설비 렌더러: “doc에 그려주는 함수”만 가져온다 */
import { renderCoolTower } from "./buildCoolTowerPdf";
import { renderAirComp } from "./buildAirCompPdf";
import { renderHeatEx } from "./buildHeatExPdf";
import { renderPackageAc } from "./buildPackageAcPdf";
import { renderPipe } from "./buildPipePdf";
import { renderVent } from "./buildVentPdf";
import { renderDrainVent } from "./buildDrainVentPdf";
import { renderWaterHot } from "./buildWaterHotPdf";
import { renderWaterTank } from "./buildWaterTankPdf";
import { renderPumpChw } from "./buildPumpChwPdf";
import { renderWasteWater } from "./buildWasteWaterPdf";
import { renderSanitaryFixture } from "./buildSanitaryFixturePdf";

/* ✅ FCU */
import { renderFcu } from "./buildFcuPdf";

/* ✅ 냉온수기 */
import { renderColdHot } from "./buildColdHotPdf";
import { coldHotSchema } from "../../../domain/schemas/coldHotSchema";

/* ✅ ✅ 오·배수 스키마 (여기가 포인트)
   - 파일: src/domain/equipment/schemas/drainVentSchema.js
   - 따라서 pdf2에서 3단계 위로: ../../../domain/equipment/schemas/drainVentSchema
*/
import { drainVentSchema } from "../../../domain/schemas/drainVent";

/* ✅ 에너지 사용현황 렌더러 (4페이지) */
import {
  renderEnergyUsagePage,
  renderEnergyUsageGhGPage,
  renderEnergyMonthlyUsageCostPage,
  renderEnergyUnitIntensitySummaryPage,
} from "../../../pages/Reports/Create/Components/pdf/buildEnergyUsagePage";

/* ============================== */
/* ========== 유틸 ========== */
/* ============================== */
function resolveEquipments({ equipments, report }) {
  if (Array.isArray(equipments)) return equipments;
  if (Array.isArray(report?.equipments)) return report.equipments;
  if (Array.isArray(report?.equipment)) return report.equipment;
  return [];
}

function hasEnergy(report) {
  const e = report?.energy || report?.energyUsage || null;
  if (!e) return false;
  const years = e?.years || e;
  return !!(years?.["2023"] || years?.[2023] || years?.y2023 || years?.["2024"] || years?.[2024] || years?.y2024);
}

/* ✅ key 파싱/정규화: 여기로 통일 */
function splitEquipId(id) {
  const s = String(id || "");
  const [prefixRaw, noRaw] = s.split("#");
  const prefix = String(prefixRaw || "").trim();
  const no = Math.max(1, parseInt(String(noRaw || "1").trim(), 10) || 1);
  return { prefix, no };
}
function normPrefix(prefix) {
  return String(prefix || "").trim().toLowerCase();
}
function isColdHot(prefix) {
  const p = normPrefix(prefix);
  return p === "coldhot" || p === "cold_hot" || p === "cold-hot";
}

function parseIndexFromKey(k) {
  const m = /#(\d+)\s*$/.exec(String(k));
  return m ? Number(m[1]) : 0;
}

function byTypeThenIndex(a, b) {
  const ai = parseIndexFromKey(a);
  const bi = parseIndexFromKey(b);
  if (ai !== bi) return ai - bi;
  return String(a).localeCompare(String(b));
}

/* ============================== */
/* ========== 순서/페이지수 ========== */
/* ============================== */
const DEFAULT_EQUIP_ORDER_PREFIX = [
  "coolTower",
  "airComp",
  "heatEx",
  "packageAc",
  "pipe",
  "pumpChw",
  "vent",
  "drainVent",
  "waterHot",
  "waterTank",
  "wasteWater",
  "sanitaryFixture",
  "coldHot",
  "fcu",
];

const PAGES_BY_PREFIX = {
  airComp: 10,
  coolTower: 6,
  heatEx: 6,
  packageAc: 5,
  pumpChw: 7,
  pipe: 5,
  vent: 6,
  drainVent: 6,
  waterHot: 6,
  waterTank: 6,
  wasteWater: 6,
  sanitaryFixture: 6,
  coldHot: 8,
  fcu: 1,
};

function estimateEquipPages(keys = []) {
  let sum = 0;
  for (const k of keys) {
    const { prefix } = splitEquipId(k);
    if (isColdHot(prefix)) {
      sum += PAGES_BY_PREFIX.coldHot;
      continue;
    }
    sum += PAGES_BY_PREFIX[prefix] || 1;
  }
  return sum;
}

function buildRenderQueue({ equipReports, equipOrder }) {
  const allKeys = Object.keys(equipReports || {});
  if (!allKeys.length) return [];

  if (Array.isArray(equipOrder) && equipOrder.length) {
    return equipOrder.filter((k) => equipReports?.[k]);
  }

  const buckets = new Map();
  for (const k of allKeys) {
    const { prefix } = splitEquipId(k);
    const pNorm = isColdHot(prefix) ? "coldHot" : prefix;
    if (!buckets.has(pNorm)) buckets.set(pNorm, []);
    buckets.get(pNorm).push(k);
  }

  for (const [p, arr] of buckets.entries()) {
    arr.sort(byTypeThenIndex);
    buckets.set(p, arr);
  }

  const out = [];
  for (const p of DEFAULT_EQUIP_ORDER_PREFIX) {
    const arr = buckets.get(p);
    if (arr?.length) out.push(...arr);
  }

  for (const [p, arr] of buckets.entries()) {
    if (!DEFAULT_EQUIP_ORDER_PREFIX.includes(p)) out.push(...arr.sort(byTypeThenIndex));
  }

  return out;
}

/* ============================== */
/* ========== 메인 빌더 ========== */
/* ============================== */
export async function buildMasterReportPdf({
  building,
  reportMeta,
  report,
  equipments,
  equipReports,
  equipOrder,
} = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFonts(doc);
  setKR(doc);

  const queue = buildRenderQueue({ equipReports, equipOrder });

  const energyPages = hasEnergy(report) ? 4 : 0;

  const totalPages =
    1 + // 건물 현황
    1 + // 설비 현황
    energyPages +
    estimateEquipPages(queue);

  let pageNo = 1;

  /* 1) 건물 현황 */
  gotoLastPage(doc);
  renderBuildingProfilePage(doc, {
    building,
    floors: report?.floors || report?.buildingFloors || [],
    titleSuffix: reportMeta?.suffixNo ? `#${reportMeta.suffixNo}` : "",
    pageNo,
    totalPages,
    __layout: { FRAME, SAFE },
  });

  /* 2) 설비 현황 */
  pageNo += 1;
  addPageSafe(doc);
  await ensureFonts(doc);
  setKR(doc);

  const eqList = resolveEquipments({ equipments, report });

  renderEquipmentStatusPage(doc, {
    equipments: eqList,
    pageNo,
    totalPages,
    titleSuffix: reportMeta?.suffixNo ? `#${reportMeta.suffixNo}` : "",
    __layout: { FRAME, SAFE },
  });

  /* 3) 에너지 사용 현황(옵션, 4페이지) */
  if (hasEnergy(report)) {
    const suffix = reportMeta?.suffixNo ? `#${reportMeta.suffixNo}` : "";

    pageNo += 1;
    addPageSafe(doc);
    await ensureFonts(doc);
    setKR(doc);
    renderEnergyUsagePage(doc, { building, report, pageNo, totalPages, titleSuffix: suffix, __layout: { FRAME, SAFE } });

    pageNo += 1;
    addPageSafe(doc);
    await ensureFonts(doc);
    setKR(doc);
    renderEnergyUsageGhGPage(doc, { building, report, pageNo, totalPages, titleSuffix: suffix, __layout: { FRAME, SAFE } });

    pageNo += 1;
    addPageSafe(doc);
    await ensureFonts(doc);
    setKR(doc);
    renderEnergyMonthlyUsageCostPage(doc, { building, report, pageNo, totalPages, titleSuffix: suffix, __layout: { FRAME, SAFE } });

    pageNo += 1;
    addPageSafe(doc);
    await ensureFonts(doc);
    setKR(doc);
    renderEnergyUnitIntensitySummaryPage(doc, { building, report, pageNo, totalPages, titleSuffix: suffix, __layout: { FRAME, SAFE } });
  }

  /* 4) 설비별 렌더 */
  for (const key of queue) {
    const v = equipReports?.[key];
    if (!v) continue;

    const { prefix, no } = splitEquipId(key);
    const pNorm = isColdHot(prefix) ? "coldHot" : prefix;

    pageNo += 1;
    addPageSafe(doc);
    await ensureFonts(doc);
    setKR(doc);

    const ctx = {
      building,
      reportMeta,
      report: v,

      // ✅ ✅ 여기서 설비별 schema 주입
      schema:
        pNorm === "coldHot"
          ? coldHotSchema
          : pNorm === "drainVent"
            ? (drainVentSchema?.sections || [])
            : undefined,

      __page: { pageNoStart: pageNo, totalPages },
      __layout: { FRAME, SAFE },
      suffixNo: `#${no}`,
    };

    gotoLastPage(doc);

    if (pNorm === "coolTower") { pageNo = await renderCoolTower(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "airComp") { pageNo = await renderAirComp(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "heatEx") { pageNo = await renderHeatEx(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "packageAc") { pageNo = await renderPackageAc(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "pipe") { pageNo = await renderPipe(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "pumpChw") { pageNo = await renderPumpChw(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "vent") { pageNo = await renderVent(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "drainVent") { pageNo = await renderDrainVent(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "waterHot") { pageNo = await renderWaterHot(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "waterTank") { pageNo = await renderWaterTank(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "wasteWater") { pageNo = await renderWasteWater(doc, ctx); gotoLastPage(doc); continue; }
    if (pNorm === "sanitaryFixture") { pageNo = await renderSanitaryFixture(doc, ctx); gotoLastPage(doc); continue; }

    if (pNorm === "coldHot") {
      pageNo = await renderColdHot(doc, ctx);
      gotoLastPage(doc);
      continue;
    }

    if (pNorm === "fcu") { pageNo = await renderFcu(doc, ctx); gotoLastPage(doc); continue; }

    // 미연결 설비: 빈페이지 방지
    doc.setFont("NotoSansKR", "bold");
    doc.setFontSize(14);
    doc.text("미연결 설비", FRAME.L + 8, 16);

    doc.setFont("NotoSansKR", "normal");
    doc.setFontSize(11);
    doc.text(`render 미구현: ${String(key)}`, FRAME.L + 8, FRAME.T + 12);
    gotoLastPage(doc);
  }

  return doc.output("blob");
}
