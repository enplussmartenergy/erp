/** @jsxImportSource @emotion/react */
import React from "react";
import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

/* ───────────────────────── 유틸 ───────────────────────── */
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

const avg = (arr) => {
  const nums = (arr || []).map(toNum).filter((v) => Number.isFinite(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
};

const ensure6 = (arr) => {
  const out = Array.isArray(arr) ? arr.slice(0, 6) : [];
  while (out.length < 6) out.push("");
  return out;
};

/* 6포인트 입력 UI */
function SixPoints({ values, onChange }) {
  const vals = ensure6(values);
  const wrap = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
    gap: 8,
    minWidth: 0,
  };
  const box = {
    display: "flex",
    alignItems: "center",
    border: "1px solid #e5e7eb",
    background: "#fff",
    padding: "8px 10px",
    borderRadius: 10,
    minWidth: 0,
  };
  const input = {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
  };

  return (
    <div style={wrap}>
      {vals.map((v, i) => (
        <div key={i} style={box}>
          <input
            style={input}
            type="number"
            step="any"
            placeholder={`${i + 1}포인트`}
            value={v}
            onChange={(e) => onChange(i, e.target.value)}
          />
          <span style={{ fontSize: 12, marginLeft: 4 }}>m/s</span>
        </div>
      ))}
    </div>
  );
}

/* 사진 보정 */
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

/* ───────────────────────── 메인 폼 ───────────────────────── */
export default function VentForm({ value, onChange }) {
  const v = (() => {
    const base = {
      rated: { flow: "", sp: "", power: "" },
      measured: {
        w: "",
        h: "",
        velPts: ["", "", "", "", "", ""],
        voltage: "380",
        current: "",
        pf: "0.9",
      },
      noise: {
        motorKw: "",
        noiseStd: "64~84",
        noiseMeas: "",
        vibStd: "0.71~1.8",
        vibMeas: "",
        co2Std: "350~450",
        co2Meas: "",
        judge: "",
      },
      photoSlots: {
        criteria_photo: [],
        vt_maint_table: [],
        vt_motor_status: [],
        vt_fix_status: [],
        vt_co2: [],
        vt_voltage: [],
        vt_current: [],
        vt_flow_graph: [],
        vt_extra: [],
      },
      notes: {
        vt_visual_note: "",
        vt_measure_note: "",
      },
    };

    const out = safeClone({ ...base, ...(value || {}) });
    out.measured = out.measured || base.measured;
    out.rated = out.rated || base.rated;
    out.noise = out.noise || base.noise;
    out.notes = out.notes || base.notes;

    out.measured.velPts = ensure6(out.measured.velPts);
    out.photoSlots = normalizeSlots({ ...base.photoSlots, ...(out.photoSlots || {}) });
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

  /* ───── 계산식 ───── */
  const ductArea = toNum(v.measured.w) * toNum(v.measured.h);
  const velAvg = avg(v.measured.velPts);
  const flowCalc = Math.round(velAvg * 3600 * ductArea) || 0;

  const lineVoltage = toNum(v.measured.voltage || 380);
  const lineCurrent = toNum(v.measured.current);
  const powerFactorRaw = v.measured.pf === "" ? "0.9" : v.measured.pf;
  const powerFactor = toNum(powerFactorRaw || 0.9);

  const kwCalc =
    lineVoltage > 0 && lineCurrent > 0 && powerFactor > 0
      ? ((Math.sqrt(3) * lineVoltage * lineCurrent * powerFactor) / 1000).toFixed(2)
      : "0.00";

  const ratedFlow = toNum(v.rated.flow);
  const ratedPower = toNum(v.rated.power);

  const flowRatePct = ratedFlow > 0 ? ((flowCalc / ratedFlow) * 100).toFixed(2) : "0.00";
  const powerPct = ratedPower > 0 ? ((toNum(kwCalc) / ratedPower) * 100).toFixed(2) : "0.00";

  const noise = v.noise || {};

  return (
    <div style={{ minWidth: 0 }}>
      <Card title="정격값">
        <div css={grid2}>
          <Field label="정격 풍량">
            <InputWithUnit value={v.rated.flow} unit="m³/h" type="number" step="any" onChange={(x) => setPath(["rated", "flow"], x)} />
          </Field>

          <Field label="정격 정압">
            <InputWithUnit value={v.rated.sp} unit="mmAq" type="number" step="any" onChange={(x) => setPath(["rated", "sp"], x)} />
          </Field>

          <Field label="정격 소비전력(kW)">
            <InputWithUnit value={v.rated.power} unit="kW" type="number" step="any" onChange={(x) => setPath(["rated", "power"], x)} />
          </Field>
        </div>
      </Card>

      <Card title="측정값 · 계산">
        <div css={grid2}>
          <Field label="덕트 가로">
            <InputWithUnit value={v.measured.w} unit="m" type="number" step="any" onChange={(x) => setPath(["measured", "w"], x)} />
          </Field>

          <Field label="덕트 세로">
            <InputWithUnit value={v.measured.h} unit="m" type="number" step="any" onChange={(x) => setPath(["measured", "h"], x)} />
          </Field>

          <Field label="풍속(6포인트)">
            <SixPoints values={v.measured.velPts} onChange={(idx, val) => setPath(["measured", "velPts", idx], val)} />
          </Field>

          <Field label="평균 풍속 / 계산 풍량">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0 }}>
              <InputWithUnit value={velAvg.toFixed(2)} unit="m/s" readOnly />
              <InputWithUnit value={flowCalc} unit="m³/h" readOnly />
            </div>
          </Field>
        </div>

        <div css={[grid2, { marginTop: 12 }]}>
          <Field label="전압">
            <InputWithUnit value={v.measured.voltage} unit="V" type="number" step="any" onChange={(x) => setPath(["measured", "voltage"], x)} />
          </Field>

          <Field label="전류">
            <InputWithUnit value={v.measured.current} unit="A" type="number" step="any" onChange={(x) => setPath(["measured", "current"], x)} />
          </Field>

          <Field label="역률(PF)">
            <InputWithUnit value={v.measured.pf} unit="" type="number" step="any" onChange={(x) => setPath(["measured", "pf"], x)} />
          </Field>

          <Field label="계산 전력(kW)">
            <InputWithUnit value={kwCalc} unit="kW" readOnly />
          </Field>
        </div>

        <div css={[grid2, { marginTop: 12 }]}>
          <Field label="정격 대비 풍량비(%)">
            <InputWithUnit value={flowRatePct} unit="%" readOnly />
          </Field>

          <Field label="정격 대비 소비전력비(%)">
            <InputWithUnit value={powerPct} unit="%" readOnly />
          </Field>
        </div>

        <p style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          * 계산 전력식 : P(kW) = √3 × V(line) × I(line) × PF ÷ 1000
        </p>
      </Card>

      <Card title="기준/현황 사진">
        <PhotoSlotGrid
          slots={[{ id: "criteria_photo", label: "기준/현황 사진" }]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
        />
      </Card>

      <Card title="육안 점검 사진">
        <PhotoSlotGrid
          slots={[
            { id: "vt_maint_table", label: "유지관리 점검표" },
            { id: "vt_motor_status", label: "노후 및 부식 상태" },
            { id: "vt_fix_status", label: "고정 장치 및 풀림 상태" },
            { id: "vt_co2", label: "CO₂ 측정" },
          ]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
        />

        <Field label="육안 점검 결과">
          <textarea
            value={v.notes.vt_visual_note}
            onChange={(e) => setPath(["notes", "vt_visual_note"], e.target.value)}
            style={{
              width: "100%",
              height: 90,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 10,
              boxSizing: "border-box",
            }}
          />
        </Field>
      </Card>

      <Card title="측정 점검 사진">
        <PhotoSlotGrid
          slots={[
            { id: "vt_voltage", label: "가동 시 전압 측정" },
            { id: "vt_current", label: "가동 시 전류 측정" },
            { id: "vt_flow_graph", label: "배기 풍량 측정 그래프" },
            { id: "vt_extra", label: "추가 사진" },
          ]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
        />

        <Field label="측정 결과">
          <textarea
            value={v.notes.vt_measure_note}
            onChange={(e) => setPath(["notes", "vt_measure_note"], e.target.value)}
            style={{
              width: "100%",
              height: 90,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 10,
              boxSizing: "border-box",
            }}
          />
        </Field>
      </Card>

      <Card title="소음 · 진동 · CO₂ 측정값">
        <div css={grid2}>
          <Field label="모터 정격 용량">
            <InputWithUnit value={noise.motorKw} unit="kW" type="number" step="any" onChange={(x) => setPath(["noise", "motorKw"], x)} />
          </Field>

          <Field label="소음 기준">
            <InputWithUnit value={noise.noiseStd} unit="dB" onChange={(x) => setPath(["noise", "noiseStd"], x)} />
          </Field>

          <Field label="소음 측정값">
            <InputWithUnit value={noise.noiseMeas} unit="dB" type="number" step="any" onChange={(x) => setPath(["noise", "noiseMeas"], x)} />
          </Field>

          <Field label="진동 기준">
            <InputWithUnit value={noise.vibStd} unit="mm/s" onChange={(x) => setPath(["noise", "vibStd"], x)} />
          </Field>

          <Field label="진동 측정값">
            <InputWithUnit value={noise.vibMeas} unit="mm/s" type="number" step="any" onChange={(x) => setPath(["noise", "vibMeas"], x)} />
          </Field>

          <Field label="CO₂ 기준">
            <InputWithUnit value={noise.co2Std} unit="ppm" onChange={(x) => setPath(["noise", "co2Std"], x)} />
          </Field>

          <Field label="CO₂ 측정값">
            <InputWithUnit value={noise.co2Meas} unit="ppm" type="number" step="any" onChange={(x) => setPath(["noise", "co2Meas"], x)} />
          </Field>

          <Field label="종합 판정">
            <input
              value={noise.judge}
              onChange={(e) => setPath(["noise", "judge"], e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                boxSizing: "border-box",
              }}
              placeholder="예) 양호, 보통, 주의 등"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
