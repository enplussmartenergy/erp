// src/pages/Reports/Create/ReportCreateAPage/ReportCreatePage.jsx
/** @jsxImportSource @emotion/react */
import { useMemo, useState } from "react";
import * as s from "../style";

import SelectBuildingStep from "../../../../features/components/SelectBuildingStep";
import EnergyUsageStep from "../Components/EnergyUsageStep";
import FloorProfileStep from "../Components/FloorProfileStep";
import EquipmentStep from "../Components/EquipmentStep";
import ReportBodyStep from "../../../../features/report/ReportBodyStep";

/* ✅ previews */
import PdfPreviewMasterJs from "../../../../features/report/pdf2/PdfPreviewMasterJs";

import PdfPreviewJS from "../../../../features/report/pdf2/PdfPreviewJs"; // airComp(AHU)
import PdfPreviewVentJs from "../../../../features/report/pdf2/PdfPreviewVentJs";
import PdfPreviewWaterHotJS from "../../../../features/report/pdf2/PdfPreviewWaterHotJs";
import PdfPreviewWaterTankJs from "../../../../features/report/pdf2/PdfPreviewWaterTankJs";
import PdfPreviewDrainVentJs from "../../../../features/report/pdf2/PdfPreviewDrainVentJs";
import PdfPreviewWasteWaterJs from "../../../../features/report/pdf2/PdfPreviewWasteWaterJs";
import PdfPreviewSanitaryFixtureJs from "../../../../features/report/pdf2/PdfPreviewSanitaryFixtureJs";
import PdfPreviewPackageAcJs from "../../../../features/report/pdf2/PdfPreviewPackageAcJs";
import PdfPreviewPumpChwJs from "../../../../features/report/pdf2/PdfPreviewPumpChwJs";
import PdfPreviewCoolTowerJs from "../../../../features/report/pdf2/PdfPreviewCoolTowerJs";
import PdfPreviewHeatExJs from "../../../../features/report/pdf2/PdfPreviewHeatExJs";
import PdfPreviewPipeJs from "../../../../features/report/pdf2/PdfPreviewPipeJs";
import PdfPreviewColdHotJs from "../../../../features/report/pdf2/PdfPreviewColdHotJs";

import { getSchema } from "../../../../domain/equipment/registry";

/* ============================== */
/* ========== 임시저장(B) ========= */
/* ============================== */
/**
 * ✅ B안(프론트 only): localStorage에 draft 저장
 * - 사진(File/Blob)은 직렬화 불가 → 저장 제외(텍스트/수치/구조만 저장)
 * - 키: reportDraft:v1:<buildingName>
 */
const DRAFT_NS = "reportDraft:v1";

const safeJsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const stripFilesDeep = (x) => {
  // File/Blob 제거 + 순환참조 방지용 단순 deep sanitize
  const seen = new WeakSet();

  const walk = (v) => {
    if (v == null) return v;

    if (typeof File !== "undefined" && v instanceof File) return null;
    if (typeof Blob !== "undefined" && v instanceof Blob) return null;

    if (Array.isArray(v)) return v.map(walk);

    if (typeof v === "object") {
      if (seen.has(v)) return null;
      seen.add(v);

      const out = {};
      for (const k of Object.keys(v)) {
        const vv = v[k];

        // photoSlots 안에 File이 있을 수 있으니 통째로 sanitize
        out[k] = walk(vv);
      }
      return out;
    }

    return v;
  };

  return walk(x);
};

const saveDraftLS = (draftKey, data) => {
  if (!draftKey) return { ok: false, error: "draftKey가 없습니다." };
  try {
    const payload = {
      v: 1,
      savedAt: Date.now(),
      data: stripFilesDeep(data),
    };
    localStorage.setItem(`${DRAFT_NS}:${draftKey}`, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `임시저장 실패: ${e?.message || String(e)}` };
  }
};

const loadDraftLS = (draftKey) => {
  if (!draftKey) return { ok: false, error: "draftKey가 없습니다." };
  const raw = localStorage.getItem(`${DRAFT_NS}:${draftKey}`);
  if (!raw) return { ok: false, error: "저장된 임시 데이터가 없습니다." };
  const parsed = safeJsonParse(raw);
  if (!parsed?.data) return { ok: false, error: "임시 데이터가 손상되었습니다." };
  return { ok: true, draft: parsed };
};

const deleteDraftLS = (draftKey) => {
  if (!draftKey) return { ok: false, error: "draftKey가 없습니다." };
  try {
    localStorage.removeItem(`${DRAFT_NS}:${draftKey}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `삭제 실패: ${e?.message || String(e)}` };
  }
};

/** airComp(AHU) 폴백 */
const AHU_DEFAULT = {
  photoSlots: { criteria_photo: [] },
  refs: { vibChart: null, fanNoiseChart: null },
  fanConfig: { supply: true, exhaust: true, inverter: true, freq: 60 },
  rated: {
    supply: { flow: "", sp: "", power: "", year: "" },
    exhaust: { flow: "", sp: "", power: "", year: "" },
  },
  measured: {
    extSP: "",
    current_supply: "",
    current_exh: "",
    supply: { w: "", h: "", velPts: ["", "", "", "", "", ""] },
    exhaust: { w: "", h: "", velPts: ["", "", "", "", "", ""] },
  },
  noise: { rows: [], note: "" },
};

function ReviewStep() {
  return (
    <section css={s.section}>
      <div css={s.h2}>검토/제출</div>
      <p css={s.hint}>제출 전 최종 확인 화면입니다. (임시)</p>
    </section>
  );
}

/* ───────────────── 공통 유틸(엔트리 검색) ───────────────── */
const pickFirstEntry = (equipReports, predicate) => {
  const map = equipReports || {};
  return Object.values(map).find(predicate) || null;
};
const asPhotoOnlyReport = (entry) => entry?.photoOnly || entry || null;
const asKeyReport = (entry, key) => entry?.[key] || entry || null;

/* ✅ default export 반드시 있어야 함 */
export default function ReportCreatePage() {
  const [step, setStep] = useState(0);

  const [building, setBuilding] = useState({
    // 기본
    name: "",
    ceo: "",

    // 주소/연락
    addressRoad: "",
    addressDetail: "",
    tel: "",
    fax: "",

    // 건축/용도
    buildingNo: "",
    useType: "주거",
    structure: "철근 콘크리트",

    // 면적/비율
    floorAreaRatio: "",
    buildingCoverage: "",
    siteArea: "",
    grossFloorArea: "",

    // 에너지(건물현황 페이지에 표기용)
    energyToe: "",
    energyCostM: "",

    // 업무담당자
    contactDept: "",
    contactName: "",
    contactPosition: "",
    contactEmail: "",

    // (추가적으로 네 프로젝트에서 쓰면 유지)
    manager: "",
    firstCheckAt: "",
    nextCheckAt: "",
  });

  const [floors, setFloors] = useState([{ level: 1, zones: "", use: "", area: "" }]);
  const [equipments, setEquipments] = useState([]);

  const [body, setBody] = useState({
    date: "",
    engineer: "",
    summary: "",
    recommend: "",
    equipReports: {},
    energy: null,
  });

  const [openPdf, setOpenPdf] = useState(false);

  /* ============================== */
  /* ========== 임시저장 키 ========= */
  /* ============================== */
  // ✅ building.name 기준. (원하면 date까지 섞어도 됨)
  const draftKey = useMemo(() => {
    const n = String(building?.name || "").trim();
    return n ? n : "no-building";
  }, [building?.name]);

  const onSaveDraft = () => {
    const snapshot = {
      step,
      building,
      floors,
      equipments,
      body,
    };
    const r = saveDraftLS(draftKey, snapshot);
    if (!r.ok) return alert(r.error);
    alert("임시저장 완료 (※ 사진은 저장되지 않음)");
  };

  const onLoadDraft = () => {
    const r = loadDraftLS(draftKey);
    if (!r.ok) return alert(r.error);

    const d = r.draft?.data || {};
    if (typeof d.step === "number") setStep(d.step);
    if (d.building) setBuilding(d.building);
    if (d.floors) setFloors(d.floors);
    if (d.equipments) setEquipments(d.equipments);
    if (d.body) setBody(d.body);

    alert("임시저장 불러오기 완료");
  };

  const onDeleteDraft = () => {
    const r = deleteDraftLS(draftKey);
    if (!r.ok) return alert(r.error);
    alert("임시저장 삭제 완료");
  };

  const equipReports = body?.equipReports || {};

  const airCompEntry = useMemo(() => {
    const fromBody = pickFirstEntry(equipReports, (v) => v?.meta?.key === "airComp" || v?.schema?.key === "airComp");
    if (fromBody) return fromBody;

    const ahuRow = (equipments || []).find((r) => r.key === "airComp" && r.owned && r.count > 0);
    if (!ahuRow) return null;

    const ahuFromDetails = ahuRow.details?.[0] || {};
    return { meta: { key: "airComp", label: "공기조화기" }, ahu: { ...AHU_DEFAULT, ...ahuFromDetails } };
  }, [equipReports, equipments]);

  const coldHotEntry = useMemo(
    () =>
      pickFirstEntry(
        equipReports,
        (v) => v?.meta?.key === "coldHot" || v?.schema?.key === "coldHot" || v?.schema?.id === "coldHot",
      ),
    [equipReports],
  );

  const coolTowerEntry = useMemo(
    () => pickFirstEntry(equipReports, (v) => v?.meta?.key === "coolTower" || v?.schema?.key === "coolTower"),
    [equipReports],
  );

  const heatExEntry = useMemo(
    () => pickFirstEntry(equipReports, (v) => v?.meta?.key === "heatEx" || v?.schema?.key === "heatEx"),
    [equipReports],
  );

  const pipeEntry = useMemo(
    () => pickFirstEntry(equipReports, (v) => v?.meta?.key === "pipe" || v?.schema?.key === "pipe"),
    [equipReports],
  );

  const ventEntry = useMemo(
    () => pickFirstEntry(equipReports, (v) => v?.meta?.key === "vent" || v?.schema?.key === "vent"),
    [equipReports],
  );

  const packageAcEntry = useMemo(
    () => pickFirstEntry(equipReports, (v) => v?.meta?.key === "packageAc" || v?.schema?.key === "packageAc"),
    [equipReports],
  );

  const pumpChwEntry = useMemo(
    () => pickFirstEntry(equipReports, (v) => v?.meta?.key === "pumpChw" || v?.schema?.key === "pumpChw"),
    [equipReports],
  );

  const sanitaryFixtureEntry = useMemo(
    () =>
      pickFirstEntry(
        equipReports,
        (v) =>
          v?.meta?.key === "sanitaryFixture" ||
          v?.schema?.id === "sanitaryFixture" ||
          v?.schema?.key === "sanitaryFixture",
      ),
    [equipReports],
  );

  const waterHotEntry = useMemo(
    () =>
      pickFirstEntry(
        equipReports,
        (v) => v?.schema?.mode === "photoOnly" && (v?.meta?.key === "waterHot" || v?.schema?.key === "waterHot"),
      ),
    [equipReports],
  );

  const waterTankEntry = useMemo(
    () =>
      pickFirstEntry(
        equipReports,
        (v) => v?.schema?.mode === "photoOnly" && (v?.meta?.key === "waterTank" || v?.schema?.key === "waterTank"),
      ),
    [equipReports],
  );

  const drainVentEntry = useMemo(
    () =>
      pickFirstEntry(
        equipReports,
        (v) => v?.schema?.mode === "photoOnly" && (v?.meta?.key === "drainVent" || v?.schema?.key === "drainVent"),
      ),
    [equipReports],
  );

  const wasteWaterEntry = useMemo(
    () =>
      pickFirstEntry(
        equipReports,
        (v) => v?.schema?.mode === "photoOnly" && (v?.meta?.key === "wasteWater" || v?.schema?.key === "wasteWater"),
      ),
    [equipReports],
  );

  const coldHotReport = useMemo(() => asKeyReport(coldHotEntry, "coldHot"), [coldHotEntry]);
  const coolTowerReport = useMemo(() => asKeyReport(coolTowerEntry, "coolTower"), [coolTowerEntry]);
  const heatExReport = useMemo(() => asKeyReport(heatExEntry, "heatEx"), [heatExEntry]);
  const pipeReport = useMemo(() => asKeyReport(pipeEntry, "pipe"), [pipeEntry]);
  const pumpChwReport = useMemo(() => asKeyReport(pumpChwEntry, "pumpChw"), [pumpChwEntry]);
  const packageAcReport = useMemo(() => asKeyReport(packageAcEntry, "packageAc"), [packageAcEntry]);
  const sanitaryReport = useMemo(() => asKeyReport(sanitaryFixtureEntry, "sanitaryFixture"), [sanitaryFixtureEntry]);

  const waterHotReport = useMemo(() => asPhotoOnlyReport(waterHotEntry), [waterHotEntry]);
  const waterTankReport = useMemo(() => asPhotoOnlyReport(waterTankEntry), [waterTankEntry]);
  const drainVentReport = useMemo(() => asPhotoOnlyReport(drainVentEntry), [drainVentEntry]);
  const wasteWaterReport = useMemo(() => asPhotoOnlyReport(wasteWaterEntry), [wasteWaterEntry]);

  const next = () => setStep((n) => Math.min(n + 1, 5));
  const prev = () => setStep((n) => Math.max(n - 1, 0));
  const canNext = step === 0 ? !!building?.name : step === 2 ? (floors || []).length >= 1 : true;

  const submit = () => {
    alert("제출 API 연결 필요 (현재는 임시)");
  };

  // ✅ 통합보고서 meta
  const reportMeta = { date: body?.date, engineer: body?.engineer };

  // ✅ 마스터는 body + floors/equipments를 함께 보냄
  const masterEquipReports = equipReports;
  const masterReport = { ...body, floors, equipments };

  const hasMaster =
    Object.keys(masterEquipReports || {}).length > 0 ||
    (equipments || []).some((e) => e?.owned && +e?.count > 0) ||
    !!body?.energy;

  const hasAnyPreview =
    !!airCompEntry ||
    !!coldHotEntry ||
    !!coolTowerEntry ||
    !!heatExEntry ||
    !!pipeEntry ||
    !!ventEntry ||
    !!waterHotEntry ||
    !!waterTankEntry ||
    !!drainVentEntry ||
    !!wasteWaterEntry ||
    !!sanitaryFixtureEntry ||
    !!packageAcEntry ||
    !!pumpChwEntry;

  return (
    <main css={s.page}>
      <h1 css={s.h1}>보고서 작성</h1>
      <p css={s.sub}>건물 선택/입력 → 에너지 사용 → 층별 프로필 → 설비 현황 → 본문 → 검토 순서로 작성합니다.</p>

      <div css={s.stepper}>
        <div css={s.step(step === 0, step > 0)}>건물 선택/등록</div>
        <div css={s.step(step === 1, step > 1)}>에너지 사용</div>
        <div css={s.step(step === 2, step > 2)}>층수/프로필</div>
        <div css={s.step(step === 3, step > 3)}>설비 현황</div>
        <div css={s.step(step === 4, step > 4)}>보고서 본문</div>
        <div css={s.step(step === 5, step > 5)}>검토</div>
      </div>

      {/* ✅ 중요: step 전환때만 언마운트/마운트 되게 "step만" key로 */}
      <div key={`step-${step}`}>
        {step === 0 && <SelectBuildingStep building={building} setBuilding={setBuilding} existing={[]} />}

        {step === 1 && (
          <EnergyUsageStep value={body.energy} onChange={(v) => setBody((b) => ({ ...b, energy: v }))} baseYear={2026} />
        )}

        {step === 2 && <FloorProfileStep floors={floors} setFloors={setFloors} />}
        {step === 3 && <EquipmentStep equipments={equipments} setEquipments={setEquipments} />}
        {step === 4 && <ReportBodyStep equipments={equipments} data={body} setData={setBody} />}
        {step === 5 && <ReviewStep />}
      </div>

      <div css={s.actions}>
        {/* ✅ 임시저장(B): 항상 노출 */}
        <button css={s.btnGhost} type="button" onClick={onSaveDraft} title={`저장키: ${draftKey}`}>
          임시저장
        </button>
        <button css={s.btnGhost} type="button" onClick={onLoadDraft} title={`저장키: ${draftKey}`}>
          불러오기
        </button>
        <button css={s.btnGhost} type="button" onClick={onDeleteDraft} title={`저장키: ${draftKey}`}>
          삭제
        </button>

        {step > 0 && (
          <button css={s.btnGhost} type="button" onClick={prev}>
            이전
          </button>
        )}

        {step < 5 ? (
          <button css={s.btn} type="button" onClick={next} disabled={!canNext}>
            다음
          </button>
        ) : (
          <>
            <button
              css={s.btnGhost}
              type="button"
              onClick={() => setOpenPdf(true)}
              disabled={!hasAnyPreview && !hasMaster}
              title={!hasAnyPreview && !hasMaster ? "미리보기 데이터가 없습니다." : ""}
            >
              PDF 미리보기
            </button>
            <button css={s.btn} type="button" onClick={submit}>
              제출
            </button>
          </>
        )}
      </div>

      {openPdf &&
        (hasMaster ? (
          <PdfPreviewMasterJs
            onClose={() => setOpenPdf(false)}
            fileName={`통합보고서_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={masterReport}
            equipReports={masterEquipReports}
            equipments={equipments}
          />
        ) : airCompEntry ? (
          <PdfPreviewJS
            onClose={() => setOpenPdf(false)}
            fileName={`공기조화기_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={airCompEntry}
          />
        ) : coldHotEntry ? (
          <PdfPreviewColdHotJs
            onClose={() => setOpenPdf(false)}
            fileName={`냉온수기_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={coldHotReport}
            schema={coldHotEntry?.schema || getSchema("coldHot")}
          />
        ) : coolTowerEntry ? (
          <PdfPreviewCoolTowerJs
            onClose={() => setOpenPdf(false)}
            fileName={`냉각탑_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={coolTowerReport}
          />
        ) : heatExEntry ? (
          <PdfPreviewHeatExJs
            onClose={() => setOpenPdf(false)}
            fileName={`열교환기_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={heatExReport}
          />
        ) : pipeEntry ? (
          <PdfPreviewPipeJs
            onClose={() => setOpenPdf(false)}
            fileName={`배관설비_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={pipeReport}
            schema={pipeEntry?.schema || getSchema("pipe")}
          />
        ) : ventEntry ? (
          <PdfPreviewVentJs
            onClose={() => setOpenPdf(false)}
            fileName={`환기설비_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={asKeyReport(ventEntry, "vent")}
          />
        ) : pumpChwEntry ? (
          <PdfPreviewPumpChwJs
            onClose={() => setOpenPdf(false)}
            fileName={`펌프(냉수)_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={pumpChwReport}
          />
        ) : waterHotEntry ? (
          <PdfPreviewWaterHotJS
            onClose={() => setOpenPdf(false)}
            fileName={`급수급탕_점검기록_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            schemaSections={waterHotEntry?.schema?.sections || getSchema("waterHot")?.sections || []}
            report={waterHotReport}
          />
        ) : waterTankEntry ? (
          <PdfPreviewWaterTankJs
            onClose={() => setOpenPdf(false)}
            fileName={`저수조_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            schema={waterTankEntry?.schema || getSchema("waterTank")}
            report={waterTankReport}
          />
        ) : drainVentEntry ? (
          <PdfPreviewDrainVentJs
            onClose={() => setOpenPdf(false)}
            fileName={`오배수_통기_우수배수_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            schema={drainVentEntry?.schema || getSchema("drainVent")}
            report={drainVentReport}
          />
        ) : wasteWaterEntry ? (
          <PdfPreviewWasteWaterJs
            onClose={() => setOpenPdf(false)}
            fileName={`오수정화설비_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            schema={wasteWaterEntry?.schema || getSchema("wasteWater")}
            report={wasteWaterReport}
          />
        ) : packageAcEntry ? (
          <PdfPreviewPackageAcJs
            onClose={() => setOpenPdf(false)}
            fileName={`패키지에어컨_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={packageAcReport}
          />
        ) : (
          <PdfPreviewSanitaryFixtureJs
            onClose={() => setOpenPdf(false)}
            fileName={`위생기구설비_성능점검표_${building?.name || ""}.pdf`}
            building={building}
            reportMeta={reportMeta}
            report={sanitaryReport}
            schema={sanitaryFixtureEntry?.schema || getSchema("sanitaryFixture")}
          />
        ))}
    </main>
  );
}
