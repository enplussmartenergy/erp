/** @jsxImportSource @emotion/react */
import React from "react";
import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

/* util */
const safeClone = (obj) => {
  try {
    return typeof structuredClone === "function"
      ? structuredClone(obj)
      : JSON.parse(JSON.stringify(obj));
  } catch {
    return { ...(obj || {}) };
  }
};
const toNum = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};
function normalizeSlots(nextSlots) {
  const out = safeClone(nextSlots || {});
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (v == null) out[k] = [];
    else if (typeof FileList !== "undefined" && v instanceof FileList) out[k] = Array.from(v);
    else if (!Array.isArray(v)) out[k] = [v];
  });
  return out;
}

export default function PumpChwForm({ schema, value, onChange }) {
  const v = (() => {
    const base = {
      rated: {
        // ✅ 스샷 기준(정격 현황)
        kind: "",       // "냉수2호기" 같은 구분명
        type: "",       // "인라인펌프" 같은 형식
        flow: "",       // 정격 유량(m3/h)
        head: "",       // 정격 양정(m)
        power: "",      // 정격 소비전력(kW)
        efficiency: "", // 정격효율(%)
        year: "",       // 설치일(년도)
      },
      measured: {
        // ✅ 스샷 기준(측정 현황)
        flow: "", // 측정 유량(m3/h)
        head: "", // 측정 양정(m)
        power: "", // 측정 소비전력(kW)
      },
      result: {
        // 계산 결과(읽기전용)
        eff: 0,
        effRatio: "", // 정격대비 효율(%)
        loadRatio: "", // 부하율(%)
      },
      photoSlots: {
        criteria_photo: [],
        pm_maint_table: [],
        pm_shaft_pack: [],
        pm_base_anchor: [],
        pm_pressure_gauge: [],
        pm_temp_motor: [],
        pm_vib_motor: [],
        pm_panel_trip: [],
        pm_voltage: [],
        pm_current: [],
        pm_ultra_flow: [],
        pm_ultra_value: [],
        pm_extra: [],
      },
      notes: {
        pm_visual_note: "",
        pm_measure_note: "",
        pm_result_note: "",
      },
    };

    const out = safeClone({ ...base, ...(value || {}) });
    out.photoSlots = normalizeSlots(out.photoSlots);
    out.notes = safeClone(out.notes || base.notes);
    out.rated = safeClone(out.rated || base.rated);
    out.measured = safeClone(out.measured || base.measured);
    return out;
  })();

  const emit = (next) => onChange?.(safeClone(next));
  const setPath = (p, val) => {
    const next = safeClone(v);
    let cur = next;
    for (let i = 0; i < p.length - 1; i++) {
      if (!cur[p[i]]) cur[p[i]] = {};
      cur = cur[p[i]];
    }
    cur[p[p.length - 1]] = val;
    emit(next);
  };

  // ✅ 스샷 계산식: η = (p × H × Q) / (367 × P1)
  // p(비중/밀도) = 1 고정(냉수/물 기준)
  const Q = toNum(v.measured.flow);
  const H = toNum(v.measured.head);
  const P1 = toNum(v.measured.power);

  const eff = P1 > 0 ? ((1 * H * Q) / (367 * P1)) * 100 : 0;
  const effFixed = +eff.toFixed(2);

  const ratedEff = toNum(v.rated.efficiency);
  const ratedPower = toNum(v.rated.power);

  const effRatio = ratedEff > 0 ? ((effFixed / ratedEff) * 100).toFixed(2) : "";
  const loadRatio = ratedPower > 0 && P1 > 0 ? ((P1 / ratedPower) * 100).toFixed(2) : "";

  return (
    <div style={{ minWidth: 0 }}>
      <Card title="정격 현황">
        <div css={grid2} style={{ minWidth: 0 }}>
          {/* ✅ 여기 2개가 UI 깨짐 원인 → InputWithUnit로 통일 */}
          <Field label="구분(예: 냉수2호기)">
            <InputWithUnit
              value={v.rated.kind}
              unit=""
              type="text"
              onChange={(x) => setPath(["rated", "kind"], x)}
            />
          </Field>

          <Field label="형식(예: 인라인펌프)">
            <InputWithUnit
              value={v.rated.type}
              unit=""
              type="text"
              onChange={(x) => setPath(["rated", "type"], x)}
            />
          </Field>

          <Field label="정격 유량">
            <InputWithUnit
              value={v.rated.flow}
              unit="m³/h"
              type="number"
              step="any"
              onChange={(x) => setPath(["rated", "flow"], x)}
            />
          </Field>

          <Field label="정격 양정">
            <InputWithUnit
              value={v.rated.head}
              unit="m"
              type="number"
              step="any"
              onChange={(x) => setPath(["rated", "head"], x)}
            />
          </Field>

          <Field label="정격 소비전력">
            <InputWithUnit
              value={v.rated.power}
              unit="kW"
              type="number"
              step="any"
              onChange={(x) => setPath(["rated", "power"], x)}
            />
          </Field>

          <Field label="정격효율">
            <InputWithUnit
              value={v.rated.efficiency}
              unit="%"
              type="number"
              step="any"
              onChange={(x) => setPath(["rated", "efficiency"], x)}
            />
          </Field>

          <Field label="설치일(년도)">
            <InputWithUnit
              value={v.rated.year}
              unit=""
              type="number"
              step="1"
              onChange={(x) => setPath(["rated", "year"], x)}
            />
          </Field>
        </div>
      </Card>

      <Card title="측정 현황">
        <div css={grid2} style={{ minWidth: 0 }}>
          <Field label="측정 유량">
            <InputWithUnit
              value={v.measured.flow}
              unit="m³/h"
              type="number"
              step="any"
              onChange={(x) => setPath(["measured", "flow"], x)}
            />
          </Field>
          <Field label="측정 양정">
            <InputWithUnit
              value={v.measured.head}
              unit="m"
              type="number"
              step="any"
              onChange={(x) => setPath(["measured", "head"], x)}
            />
          </Field>
          <Field label="측정 소비전력">
            <InputWithUnit
              value={v.measured.power}
              unit="kW"
              type="number"
              step="any"
              onChange={(x) => setPath(["measured", "power"], x)}
            />
          </Field>
        </div>
      </Card>

      <Card title="결과(자동 계산)">
        <div css={grid2} style={{ minWidth: 0 }}>
          <Field label="측정 효율(η)">
            <InputWithUnit value={effFixed} unit="%" readOnly />
          </Field>
          <Field label="정격대비 효율">
            <InputWithUnit value={effRatio} unit="%" readOnly />
          </Field>
          <Field label="부하율">
            <InputWithUnit value={loadRatio} unit="%" readOnly />
          </Field>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
          η = (p × H × Q) / (367 × P1) × 100 <br />
          p=1(물), H[m], Q[m³/h], P1[kW]
        </div>
      </Card>

      <Card title="사진 첨부(펌프)">
        <PhotoSlotGrid
          slots={schema?.photos || []}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
        />
      </Card>

      <Card title="점검 결과 사항">
        <Field label="육안 점검 결과 사항">
          <textarea
            value={v.notes.pm_visual_note}
            onChange={(e) => setPath(["notes", "pm_visual_note"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
          />
        </Field>

        <Field label="측정 점검 결과 사항">
          <textarea
            value={v.notes.pm_measure_note}
            onChange={(e) => setPath(["notes", "pm_measure_note"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
          />
        </Field>

        <Field label="결과 수치표 비고">
          <textarea
            value={v.notes.pm_result_note}
            onChange={(e) => setPath(["notes", "pm_result_note"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
          />
        </Field>
      </Card>
    </div>
  );
}
