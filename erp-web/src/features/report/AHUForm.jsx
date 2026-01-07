// src/features/report/AHUForm.jsx
/** @jsxImportSource @emotion/react */
import React from "react";
import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

/* ── 유틸 ────────────────────────────────────────────────────────── */
const safeClone = (obj) => {
  if (typeof structuredClone === "function") return structuredClone(obj);
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { ...(obj || {}) };
  }
};

const ensureObj = (v) => (v && typeof v === "object" ? v : {});
const toNum = (x) => {
  const n = +x;
  return Number.isFinite(n) ? n : 0;
};

const avg = (arr) => {
  const nums = (arr || []).map(toNum).filter((n) => Number.isFinite(n));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
};

const ensure6 = (arr) => {
  const out = Array.isArray(arr) ? arr.slice(0, 6) : [];
  while (out.length < 6) out.push("");
  return out;
};

const kwPerA = (Math.sqrt(3) * 380 * 0.9 * 0.9) / 1000;

/* 6포인트 입력 */
function SixPointInputs({ values, onChange }) {
  const vals = ensure6(values);
  const wrap = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
    width: "100%",
  };
  const chip = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    minWidth: 0,
    boxSizing: "border-box",
  };
  const input = {
    flex: 1,
    minWidth: 0,
    height: 32,
    outline: "none",
    border: "none",
    fontSize: 14,
    color: "#111827",
    background: "transparent",
  };
  const unit = { fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" };

  return (
    <div style={wrap}>
      {vals.map((v, i) => (
        <div key={i} style={chip}>
          <input
            type="number"
            step="any"
            value={v}
            onChange={(e) => onChange(i, e.target.value)}
            style={input}
            placeholder={`${i + 1}포인트`}
          />
          <span style={unit}>m/s</span>
        </div>
      ))}
    </div>
  );
}

/* 사진 슬롯 표준화 */
function normalizePhotoSlots(nextSlots) {
  const out = safeClone(nextSlots || {});
  Object.keys(out).forEach((key) => {
    const v = out[key];
    if (v == null) {
      out[key] = [];
      return;
    }
    if (typeof FileList !== "undefined" && v instanceof FileList) {
      out[key] = Array.from(v);
      return;
    }
    if (!Array.isArray(v)) out[key] = [v];
  });
  return out;
}

/* 기준이미지 1장씩 → refs */
function oneShotToRefs(slots, ids = []) {
  const normalized = normalizePhotoSlots(slots);
  const refs = {};
  ids.forEach((id) => {
    refs[id] = normalized?.[id]?.[0] ?? null;
  });
  return refs;
}

/* 소음/진동 행 */
function NoiseRows({ rows = [], onChange }) {
  const [localRows, setLocalRows] = React.useState(rows.length ? rows : [{}]);
  React.useEffect(() => {
    setLocalRows(rows.length ? rows : [{}]);
  }, [rows]);

  const emit = (next) => {
    setLocalRows(next);
    onChange?.(next);
  };
  const sanitizeNum = (v) => (v === "" ? "" : Number.isFinite(+v) ? v : "");

  const hdr = {
    display: "grid",
    gridTemplateColumns: "160px 130px 130px 130px 140px 130px 100px",
    gap: 8,
    fontSize: 12,
    color: "#374151",
    marginBottom: 6,
    alignItems: "center",
  };
  const row = {
    display: "grid",
    gridTemplateColumns: hdr.gridTemplateColumns,
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  };
  const cell = {
    height: 36,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "0 10px",
    fontSize: 14,
    background: "#fff",
    boxSizing: "border-box",
    minWidth: 0,
  };

  const upd = (i, k, v) => emit(localRows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...hdr, fontWeight: 600 }}>
        <div>측정 위치</div>
        <div>모터 용량(kW)</div>
        <div>소음군(dB)</div>
        <div>소음값(dB)</div>
        <div>진동속도(mm/s)</div>
        <div>진동 기준(A~D)</div>
        <div>관리</div>
      </div>

      {localRows.map((r, i) => (
        <div key={i} style={row}>
          <input style={cell} placeholder="예: AHU-05" value={r.loc ?? ""} onChange={(e) => upd(i, "loc", e.target.value)} />
          <input style={cell} inputMode="decimal" value={sanitizeNum(r.kw ?? "")} onChange={(e) => upd(i, "kw", sanitizeNum(e.target.value))} />
          <input style={cell} inputMode="decimal" value={sanitizeNum(r.noise_class ?? "")} onChange={(e) => upd(i, "noise_class", sanitizeNum(e.target.value))} />
          <input style={cell} inputMode="decimal" value={sanitizeNum(r.noise_val ?? "")} onChange={(e) => upd(i, "noise_val", sanitizeNum(e.target.value))} />
          <input style={cell} inputMode="decimal" value={sanitizeNum(r.vib_vel ?? "")} onChange={(e) => upd(i, "vib_vel", sanitizeNum(e.target.value))} />
          <input style={cell} placeholder="A/B/C/D" value={r.vib_class ?? ""} onChange={(e) => upd(i, "vib_class", e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => emit([...localRows, {}])}
              style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
            >
              추가
            </button>
            {localRows.length > 1 && (
              <button
                type="button"
                onClick={() => emit(localRows.filter((_, idx) => idx !== i))}
                style={{ padding: "8px 12px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff" }}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 메인 ─────────────────────────────────────────────────────────── */
export default function AHUForm({ value, onChange }) {
  // ✅ base는 "shape"를 고정하는 목적
  const base = {
    photoSlots: { criteria_photo: [] }, // 현황 사진
    refs: { vibChart: null, fanNoiseChart: null }, // 기준 이미지 2종
    fanConfig: { supply: true, exhaust: true, inverter: true, freq: 60 },
    rated: {
      supply: { flow: "", sp: "", power: "" },
      exhaust: { flow: "", sp: "", power: "" },
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

  // ✅ 여기서 "깊게 병합" + 보정(velPts, rows, photoSlots 등)
  const v = React.useMemo(() => {
    const inVal = ensureObj(value);

    const inMeasured = ensureObj(inVal.measured);
    const inSupply = ensureObj(inMeasured.supply);
    const inExhaust = ensureObj(inMeasured.exhaust);

    const inRated = ensureObj(inVal.rated);
    const inRatedS = ensureObj(inRated.supply);
    const inRatedE = ensureObj(inRated.exhaust);

    const out = {
      ...base,
      ...inVal,

      // ✅ refs/팬설정은 객체 병합
      refs: { ...base.refs, ...(ensureObj(inVal.refs)) },
      fanConfig: { ...base.fanConfig, ...(ensureObj(inVal.fanConfig)) },

      // ✅ rated 깊게 병합
      rated: {
        ...base.rated,
        ...inRated,
        supply: { ...base.rated.supply, ...inRatedS },
        exhaust: { ...base.rated.exhaust, ...inRatedE },
      },

      // ✅ measured 깊게 병합 + velPts 6칸 강제
      measured: {
        ...base.measured,
        ...inMeasured,
        supply: {
          ...base.measured.supply,
          ...inSupply,
          velPts: ensure6(inSupply.velPts ?? base.measured.supply.velPts),
        },
        exhaust: {
          ...base.measured.exhaust,
          ...inExhaust,
          velPts: ensure6(inExhaust.velPts ?? base.measured.exhaust.velPts),
        },
      },

      // ✅ noise 깊게 병합 + rows 배열 강제
      noise: {
        ...base.noise,
        ...(ensureObj(inVal.noise)),
      },
    };

    // 레거시 호환: measured.current -> current_supply
    if (!out.measured.current_supply && (out.measured.current ?? "")) {
      out.measured.current_supply = out.measured.current;
    }

    // photoSlots: 키/값 배열 정규화 + 기본키 보강
    out.photoSlots = normalizePhotoSlots({ ...base.photoSlots, ...(inVal.photoSlots || {}) });

    // noise.rows 보정
    out.noise.rows = Array.isArray(out.noise.rows) ? out.noise.rows : [];

    return out;
  }, [value]);

  const emit = (next) => onChange?.(safeClone(next));

  const set = (k, patch) => emit({ ...v, [k]: { ...ensureObj(v[k]), ...patch } });

  const setPath = (path, val) => {
    const next = safeClone(v);
    let cur = next;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (cur[key] == null || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = val;

    // ✅ velPts는 중간에 깨지지 않게 항상 6칸 보정
    if (path[0] === "measured" && path[2] === "velPts") {
      if (next.measured?.supply?.velPts) next.measured.supply.velPts = ensure6(next.measured.supply.velPts);
      if (next.measured?.exhaust?.velPts) next.measured.exhaust.velPts = ensure6(next.measured.exhaust.velPts);
    }

    emit(next);
  };

  // 계산값
  const sArea = toNum(v.measured.supply.w) * toNum(v.measured.supply.h);
  const eArea = toNum(v.measured.exhaust.w) * toNum(v.measured.exhaust.h);
  const sAvg = avg(ensure6(v.measured.supply.velPts));
  const eAvg = avg(ensure6(v.measured.exhaust.velPts));
  const sFlow = Math.round(sAvg * 3600 * (sArea || 0)) || 0;
  const eFlow = Math.round(eAvg * 3600 * (eArea || 0)) || 0;
  const sKW = (toNum(v.measured.current_supply) * kwPerA).toFixed(2);
  const eKW = (toNum(v.measured.current_exh) * kwPerA).toFixed(2);

  return (
    <div style={{ minWidth: 0, overflow: "hidden" }}>
      {/* 정격값 */}
      <Card title="정격값">
        <div css={grid2}>
          <div>
            <Field label="급기 정격 풍량">
              <InputWithUnit
                unit="m³/h"
                type="number"
                step="any"
                value={v.rated.supply.flow}
                onChange={(x) => set("rated", { supply: { ...v.rated.supply, flow: x } })}
              />
            </Field>
            <Field label="급기 정격 정압">
              <InputWithUnit
                unit="mmAq"
                type="number"
                step="any"
                value={v.rated.supply.sp}
                onChange={(x) => set("rated", { supply: { ...v.rated.supply, sp: x } })}
              />
            </Field>
            <Field label="급기 정격 전력">
              <InputWithUnit
                unit="kW"
                type="number"
                step="any"
                value={v.rated.supply.power}
                onChange={(x) => set("rated", { supply: { ...v.rated.supply, power: x } })}
              />
            </Field>
          </div>

          <div>
            <Field label="환기 정격 풍량">
              <InputWithUnit
                unit="m³/h"
                type="number"
                step="any"
                value={v.rated.exhaust.flow}
                onChange={(x) => set("rated", { exhaust: { ...v.rated.exhaust, flow: x } })}
              />
            </Field>
            <Field label="환기 정격 정압">
              <InputWithUnit
                unit="mmAq"
                type="number"
                step="any"
                value={v.rated.exhaust.sp}
                onChange={(x) => set("rated", { exhaust: { ...v.rated.exhaust, sp: x } })}
              />
            </Field>
            <Field label="환기 정격 전력">
              <InputWithUnit
                unit="kW"
                type="number"
                step="any"
                value={v.rated.exhaust.power}
                onChange={(x) => set("rated", { exhaust: { ...v.rated.exhaust, power: x } })}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* 측정값 · 계산 */}
      <Card title="측정값 · 계산">
        <div css={grid2}>
          <div>
            <Field label="급기 덕트 가로">
              <InputWithUnit
                unit="m"
                type="number"
                step="any"
                value={v.measured.supply.w}
                onChange={(x) => set("measured", { supply: { ...v.measured.supply, w: x } })}
              />
            </Field>
            <Field label="급기 덕트 세로">
              <InputWithUnit
                unit="m"
                type="number"
                step="any"
                value={v.measured.supply.h}
                onChange={(x) => set("measured", { supply: { ...v.measured.supply, h: x } })}
              />
            </Field>
            <Field label="급기 풍속(6포인트)">
              <SixPointInputs
                values={v.measured.supply.velPts}
                onChange={(idx, val) => setPath(["measured", "supply", "velPts", idx], val)}
              />
            </Field>
            <Field label="급기 평균 풍속 / 계산 풍량">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <InputWithUnit unit="m/s" value={avg(v.measured.supply.velPts).toFixed(2)} readOnly />
                <InputWithUnit unit="m³/h" value={sFlow} readOnly />
              </div>
            </Field>
          </div>

          <div>
            <Field label="환기 덕트 가로">
              <InputWithUnit
                unit="m"
                type="number"
                step="any"
                value={v.measured.exhaust.w}
                onChange={(x) => set("measured", { exhaust: { ...v.measured.exhaust, w: x } })}
              />
            </Field>
            <Field label="환기 덕트 세로">
              <InputWithUnit
                unit="m"
                type="number"
                step="any"
                value={v.measured.exhaust.h}
                onChange={(x) => set("measured", { exhaust: { ...v.measured.exhaust, h: x } })}
              />
            </Field>
            <Field label="환기 풍속(6포인트)">
              <SixPointInputs
                values={v.measured.exhaust.velPts}
                onChange={(idx, val) => setPath(["measured", "exhaust", "velPts", idx], val)}
              />
            </Field>
            <Field label="환기 평균 풍속 / 계산 풍량">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <InputWithUnit unit="m/s" value={avg(v.measured.exhaust.velPts).toFixed(2)} readOnly />
                <InputWithUnit unit="m³/h" value={eFlow} readOnly />
              </div>
            </Field>
          </div>
        </div>

        <div css={[grid2, { marginTop: 12, alignItems: "start" }]}>
          <Field label="외부정압(급기)">
            <InputWithUnit
              unit="mmAq"
              type="number"
              step="any"
              value={v.measured.extSP}
              onChange={(x) => set("measured", { extSP: x })}
            />
          </Field>

          <div>
            <Field label="전류(급기) / 계산전력">
              <InputWithUnit
                unit="A"
                type="number"
                step="any"
                value={v.measured.current_supply}
                onChange={(x) => set("measured", { current_supply: x })}
              />
              <div style={{ height: 8 }} />
              <InputWithUnit unit="kW" value={sKW} readOnly />
            </Field>

            <Field label="전류(환기) / 계산전력" style={{ marginTop: 8 }}>
              <InputWithUnit
                unit="A"
                type="number"
                step="any"
                value={v.measured.current_exh}
                onChange={(x) => set("measured", { current_exh: x })}
              />
              <div style={{ height: 8 }} />
              <InputWithUnit unit="kW" value={eKW} readOnly />
            </Field>
          </div>
        </div>
      </Card>

      {/* 점검 기준 · 현황사진 */}
      <Card title="점검 기준 · 현황사진">
        <PhotoSlotGrid
          slots={[{ id: "criteria_photo", label: "현황 사진 (PDF 점검기준 페이지에 출력)" }]}
          value={v.photoSlots || {}}
          onChange={(nextSlots) => emit({ ...v, photoSlots: normalizePhotoSlots(nextSlots) })}
          accept="image/jpeg,image/png,image/jpg,image/webp"
          capture="environment"
        />
      </Card>

      {/* 기준 이미지(소음·진동 페이지) */}
      <Card title="기준 이미지(소음·진동 페이지)">
        <PhotoSlotGrid
          slots={[
            { id: "vibChart", label: "진동 기준표 이미지 (1장)" },
            { id: "fanNoiseChart", label: "전동기 소음도 이미지 (1장)" },
          ]}
          value={{
            vibChart: v.refs.vibChart ? [v.refs.vibChart] : [],
            fanNoiseChart: v.refs.fanNoiseChart ? [v.refs.fanNoiseChart] : [],
          }}
          onChange={(nextSlots) => {
            const refs = oneShotToRefs(nextSlots, ["vibChart", "fanNoiseChart"]);
            emit({ ...v, refs: { ...v.refs, ...refs } });
          }}
          accept="image/jpeg,image/png,image/jpg,image/webp"
          capture="environment"
        />
      </Card>

      {/* 소음 · 진동 측정 결과 */}
      <Card title="소음 · 진동 측정 결과">
        <NoiseRows rows={v.noise?.rows || []} onChange={(rows) => emit({ ...v, noise: { ...v.noise, rows } })} />
        <div style={{ marginTop: 10 }}>
          <Field label="비고">
            <textarea
              value={v.noise?.note || ""}
              onChange={(e) => emit({ ...v, noise: { ...v.noise, note: e.target.value } })}
              style={{
                width: "100%",
                height: 90,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
