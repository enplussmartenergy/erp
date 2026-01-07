/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useEffect, useMemo, useState } from "react";
import Card from "../../ui/Card";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";

import { getSchema } from "../../domain/equipment/registry";

/* forms */
import AHUForm from "./AHUForm";
import PhotoOnlyForm from "./PhotoOnlyForm";
import VentForm from "./VentForm";
import SanitaryFixtureForm from "./SanitaryFixtureForm";
import PackageAcForm from "./PackageAcForm";
import PumpChwForm from "./PumpChwForm";
import CoolTowerForm from "./CoolTowerForm";
import HeatExForm from "./HeatExForm";
import PipeForm from "./PipeForm";
import ColdHotForm from "./ColdHotForm";

/* ✅ FCU */
import FcuForm from "./FCUForm";

/* ───────────────── 스타일 ───────────────── */
const c = { primary: "#2563EB", line: "#E5E7EB", text: "#0F172A", ring: "rgba(37,99,235,.14)" };

const pillsWrap = css`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 8px 0 12px;
`;
const pill = css`
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${c.line};
  background: #fff;
  font-weight: 800;
  color: ${c.text};
`;
const pillActive = css`
  background: ${c.primary};
  color: #fff;
  border-color: ${c.primary};
`;
const textarea = css`
  width: 100%;
  min-height: 120px;
  border: 1px solid ${c.line};
  border-radius: 10px;
  padding: 10px;
  box-sizing: border-box;
`;

/* util */
const safeClone = (obj) => {
  try {
    return typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
  } catch {
    return { ...(obj || {}) };
  }
};

/* ───────────────── 폼 레지스트리 ───────────────── */
const FORM_BY_KEY = {
  airComp: AHUForm,
  vent: VentForm,
  sanitaryFixture: SanitaryFixtureForm,
  packageAc: PackageAcForm,
  pumpChw: PumpChwForm,
  coolTower: CoolTowerForm,
  heatEx: HeatExForm,
  pipe: PipeForm,
  coldHot: ColdHotForm,
  fcu: FcuForm,
};

/* ───────────────── seed helpers ───────────────── */
function pickEquipSeed(equipments, meta) {
  const eq = (equipments || []).find((e) => e?.key === meta?.key);
  const raw = eq?.details?.[(meta?.index || 1) - 1] || null;
  if (!raw) return null;

  // airComp는 AHUForm 구조 자체가 details에 들어갈 수 있으니 그대로 반환
  if (meta?.key === "airComp") return raw;

  // ✅ 공통 seed: 모델명 / 점검자 / 점검일자 / 설치위치
  return {
    model: raw?.model || "",
    engineer: raw?.engineer || "",
    dateTxt: raw?.dateTxt || "",
    location: raw?.location || "",
  };
}

function applySeedToMeta(meta, seed) {
  if (!seed) return meta;
  return { ...(meta || {}), detail: { ...(meta?.detail || {}), ...(seed || {}) } };
}

function applySeedToRated(rated, seed) {
  if (!seed) return rated || {};
  const r = { ...(rated || {}) };

  if (typeof seed === "object") {
    if ("model" in seed) r.model = r.model ?? seed.model;
    if ("engineer" in seed) r.engineer = r.engineer ?? seed.engineer;
    if ("dateTxt" in seed) r.dateTxt = r.dateTxt ?? seed.dateTxt;
    if ("location" in seed) r.location = r.location ?? seed.location;
  }

  r._seed = r._seed ?? seed;
  return r;
}

/* ───────────────── init builders ───────────────── */
function makeChecklist(schema) {
  return Array.isArray(schema?.checklist)
    ? Object.fromEntries(schema.checklist.map((t) => [t, { title: t, result: "해당없음", note: "" }]))
    : {};
}

function makePhotoSlots(schema) {
  return Object.fromEntries((schema?.photos || []).map((p) => [p.id, []]));
}

function makePhotoOnlySlots(schema) {
  const sectionSlots = { criteria_photo: [] };
  (schema?.sections || []).forEach((sec) => (sec?.slots || []).forEach((s) => (sectionSlots[s.id] = [])));
  return sectionSlots;
}

/* ───────────────── 장비별 초기값 ───────────────── */
function initReportByKey({ meta, schema, seed }) {
  const baseMeta = applySeedToMeta(meta, seed);
  const base = { meta: baseMeta, schema, notes: "" };
  const checklist = makeChecklist(schema);

  // ✅ airComp(저장키: ahu)
  if (meta.key === "airComp") {
    const ahuSeed = seed && typeof seed === "object" ? seed : {};
    return {
      ...base,
      checklist,
      ahu: {
        ...ahuSeed,
        rated: { ...(ahuSeed?.rated || {}), _seed: ahuSeed },
        measured: { ...(ahuSeed?.measured || {}) },
        photoSlots: ahuSeed?.photoSlots || makePhotoSlots(schema),
        notes: ahuSeed?.notes || {},
        noise: ahuSeed?.noise || {},
        refs: ahuSeed?.refs || {},
      },
    };
  }

  if (meta.key === "heatEx") {
    return {
      ...base,
      checklist,
      heatEx: {
        rated: applySeedToRated({}, seed),
        measured: {},
        photoSlots: makePhotoSlots(schema),
        notes: {},
      },
    };
  }

  if (meta.key === "coolTower") {
    return {
      ...base,
      checklist,
      coolTower: {
        rated: applySeedToRated({}, seed),
        measured: {},
        photoSlots: makePhotoSlots(schema),
        notes: {},
      },
    };
  }

  if (meta.key === "pumpChw") {
    return {
      ...base,
      checklist,
      pumpChw: {
        rated: applySeedToRated({}, seed),
        measured: {},
        photoSlots: makePhotoSlots(schema),
        notes: {},
        noise: {},
        refs: {},
      },
    };
  }

  if (meta.key === "pipe") {
    return {
      ...base,
      checklist,
      pipe: {
        rated: applySeedToRated({}, seed),
        measured: {
          pipeSpec: "",
          nominalThk: "",
          usedYears: "",
          allowRatio: "40",
          points: [
            ["", "", "", "", "", ""],
            ["", "", "", "", "", ""],
            ["", "", "", "", "", ""],
          ],
        },
        photoSlots: makePhotoSlots(schema),
        notes: { visual1: "", visual2: "", measure: "", actions: "", remark: "" },
      },
    };
  }

  if (meta.key === "coldHot") {
    return {
      ...base,
      checklist,
      coldHot: {
        rated: applySeedToRated({ machineNo: "", capacityRt: "", ratedCop: "" }, seed),
        measured: {
          ratedFlow: "",
          measFlow: "",
          measCop: "",
          chilledDeltaT: "",
          gasUsePerHour: "",
        },
        photoSlots: makePhotoSlots(schema),
        notes: { visual1: "", visual2: "", visual3: "", measure: "", calc: "", flue: "", actions: "", remark: "" },
      },
    };
  }

  if (meta.key === "vent") {
    return {
      ...base,
      checklist,
      vent: {
        rated: applySeedToRated({}, seed),
        measured: {},
        photoSlots: makePhotoSlots(schema),
        notes: {},
      },
    };
  }

  if (meta.key === "sanitaryFixture") {
    return {
      ...base,
      checklist,
      sanitaryFixture: {
        rated: applySeedToRated({}, seed),
        measured: {},
        photoSlots: makePhotoSlots(schema),
        notes: {},
      },
    };
  }

  if (meta.key === "packageAc") {
    return {
      ...base,
      checklist,
      packageAc: {
        rated: applySeedToRated({}, seed),
        measured: {},
        photoSlots: makePhotoSlots(schema),
        notes: {},
        noise: {},
        // ✅ PDF에서 meta/detail을 우선 쓰지만, 혹시 모를 fallback도 남겨둠
        meta: applySeedToMeta(meta, seed),
      },
    };
  }

  // ✅ FCU
  if (meta.key === "fcu") {
    return {
      ...base,
      checklist,
      fcu: {
        config: {
          roomCount: "",
          hasClassroom: false,
          classroomCount: "",
          numbering: { mode: "manual", start: 351, step: 2, manualListText: "" },
        },
        units: [],
      },
    };
  }

  // ✅ photoOnly 계열
  if (schema?.mode === "photoOnly") {
    return {
      ...base,
      checklist: {},
      photoOnly: {
        photoSlots: makePhotoOnlySlots(schema),
        sectionNotes: {},
      },
    };
  }

  // fallback
  return {
    ...base,
    checklist,
    rated: applySeedToRated({}, seed),
    photoSlots: makePhotoSlots(schema),
  };
}

function resolveValueKey(metaKey, schema) {
  if (metaKey === "airComp") return "ahu";
  if (schema?.mode === "photoOnly") return "photoOnly";
  return metaKey; // fcu 포함
}

export default function ReportBodyStep({ data, setData, equipments = [] }) {
  const items = useMemo(() => {
    const out = [];
    (equipments || []).forEach((eq) => {
      if (eq?.owned && +eq?.count > 0) {
        for (let i = 0; i < +eq.count; i++) {
          out.push({
            id: `${eq.key}#${i + 1}`,
            key: eq.key,
            index: i + 1,
            label: `${eq.label || eq.key} #${i + 1}`,
          });
        }
      }
    });
    return out.length ? out : [{ id: "generic#1", key: "generic", index: 1, label: "장비 #1" }];
  }, [equipments]);

  const [activeId, setActiveId] = useState(items[0]?.id);

  useEffect(() => {
    if (!items.length) return;
    if (!items.some((x) => x.id === activeId)) setActiveId(items[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const reports = data?.equipReports || {};
  const activeMeta = items.find((x) => x.id === activeId) || items[0];
  const schema = getSchema(activeMeta.key);

  const seed = useMemo(() => pickEquipSeed(equipments, activeMeta), [equipments, activeMeta]);

  const init = () => initReportByKey({ meta: activeMeta, schema, seed });

  const active = reports[activeMeta.id] || init();

  const patch = (obj) =>
    setData((d) => {
      const prev = d?.equipReports || {};
      return {
        ...d,
        equipReports: {
          ...prev,
          [activeMeta.id]: {
            ...(prev?.[activeMeta.id] || init()),
            ...safeClone(obj),
            meta: applySeedToMeta(activeMeta, seed),
            schema,
          },
        },
      };
    });

  const valueKey = resolveValueKey(activeMeta.key, schema);
  const Form = FORM_BY_KEY[activeMeta.key] || null;

  return (
    <section>
      <div css={pillsWrap}>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            css={[pill, it.id === activeId && pillActive]}
            onClick={() => setActiveId(it.id)}
          >
            {it.label}
          </button>
        ))}
      </div>

      {Form ? (
        <Form schema={schema} value={active?.[valueKey]} onChange={(v) => patch({ [valueKey]: v })} />
      ) : schema?.mode === "photoOnly" ? (
        <PhotoOnlyForm schema={schema} value={active?.photoOnly} onChange={(v) => patch({ photoOnly: v })} />
      ) : (
        <Card title="사진 첨부">
          <PhotoSlotGrid
            slots={schema?.photos || []}
            value={active?.photoSlots || {}}
            onChange={(v) => patch({ photoSlots: v })}
          />
        </Card>
      )}

      <Card title="특이사항 / 권고사항">
        <textarea
          css={textarea}
          placeholder="점검 중 특이사항 및 권고사항"
          value={active?.notes || ""}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </Card>
    </section>
  );
}
