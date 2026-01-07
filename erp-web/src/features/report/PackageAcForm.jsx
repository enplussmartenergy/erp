// src/features/report/PackageAcForm.jsx
/** @jsxImportSource @emotion/react */
import React from "react";

import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

import { packageAcSchema } from "../../domain/schemas/packageAcSchema";

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

/** ✅ 과거/오타 키 -> 최신 스키마 키로 옮기기 */
function migratePhotoSlots(slots = {}) {
  const s = normalizeSlots(slots);

  const move = (from, to) => {
    if (!from || !to) return;
    const fromArr = s[from];
    if (!fromArr || !fromArr.length) return;
    if (!s[to] || !s[to].length) s[to] = [];
    s[to] = [...s[to], ...fromArr].filter(Boolean);
    delete s[from];
  };

  // 폼에서 쓰던 잘못된 키들 -> 스키마 키로 교체
  move("pk_outdoor_noise", "pk_outdoor_status");
  move("pk_outdoor_fixed", "pk_outdoor_status");
  move("pk_indoor_noise_meas", "pk_noise_meas");

  // criteria_photo 흔적이 있으면 비어있는 쪽에 채워주기
  if (s.criteria_photo && s.criteria_photo.length) {
    if (!s.criteria_outdoor || !s.criteria_outdoor.length) s.criteria_outdoor = [s.criteria_photo[0]].filter(Boolean);
    if (!s.criteria_indoor || !s.criteria_indoor.length) s.criteria_indoor = [s.criteria_photo[0]].filter(Boolean);
  }

  return s;
}

const ensureStr = (v) => (v == null ? "" : String(v));

export default function PackageAcForm({ value, onChange }) {
  const v = (() => {
    // ✅ schema 기준으로 photoSlots 기본 키 생성(키 누락 방지)
    const basePhotoSlots = Object.fromEntries((packageAcSchema.photos || []).map((p) => [p.id, []]));

    const base = {
      noise: {
        indoorRatedKw: "",
        outdoorRatedKw: "",
        indoorStd: "49~69",
        outdoorStd: "75~95",
        indoorDb: "",
        outdoorDb: "",
        indoorState: "양호",
        outdoorState: "양호",
      },
      photoSlots: basePhotoSlots,
      notes: {
        pk_visual_note: "",
        pk_measure_note: "",
      },
    };

    const out = safeClone({ ...base, ...(value || {}) });

    // ✅ 과거 데이터 오염 방지
    if ("rated" in out) delete out.rated;
    if ("measured" in out) delete out.measured;

    // ✅ photoSlots: base 키 보강 + 정규화 + 마이그레이션
    const mergedSlots = { ...base.photoSlots, ...(out.photoSlots || {}) };
    out.photoSlots = migratePhotoSlots(mergedSlots);

    out.notes = safeClone(out.notes || base.notes);
    out.noise = safeClone(out.noise || base.noise);

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

  const setSlots = (nextSlots) => {
    const normalized = migratePhotoSlots(nextSlots);
    emit({ ...v, photoSlots: normalized });
  };

  // ✅ 스키마 섹션을 그대로 사용(폼/스키마/PDF 키 정합 강제)
  const visualSection = (packageAcSchema.sections || []).find((s) => s.id === "pk_visual");
  const measureSection = (packageAcSchema.sections || []).find((s) => s.id === "pk_measure");

  return (
    <div style={{ minWidth: 0 }}>
      {/* PAGE2: 현황 사진(실외기/실내기) */}
      <Card title="기준/현황 사진">
        <PhotoSlotGrid
          slots={[
            { id: "criteria_outdoor", label: "현황 사진(실외기)" },
            { id: "criteria_indoor", label: "현황 사진(실내기)" },
          ]}
          value={v.photoSlots}
          onChange={setSlots}
          capture="environment"
        />
      </Card>

      {/* PAGE3: 육안 점검 */}
      <Card title={visualSection?.title || "육안 점검 사진"}>
        <PhotoSlotGrid
          slots={visualSection?.slots || []}
          value={v.photoSlots}
          onChange={setSlots}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            value={ensureStr(v.notes.pk_visual_note)}
            onChange={(e) => setPath(["notes", "pk_visual_note"], e.target.value)}
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

      {/* PAGE4: 측정 점검 */}
      <Card title={measureSection?.title || "측정 점검 사진"}>
        <PhotoSlotGrid
          slots={measureSection?.slots || []}
          value={v.photoSlots}
          onChange={setSlots}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            value={ensureStr(v.notes.pk_measure_note)}
            onChange={(e) => setPath(["notes", "pk_measure_note"], e.target.value)}
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

      {/* PAGE5: 소음표 입력 */}
      <Card title="소음 측정(결과 수치표 입력값)">
        <div css={grid2} style={{ minWidth: 0 }}>
          <Field label="실내기 정격전력(kW)">
            <InputWithUnit
              value={ensureStr(v.noise.indoorRatedKw)}
              unit="kW"
              type="number"
              step="any"
              onChange={(x) => setPath(["noise", "indoorRatedKw"], x)}
            />
          </Field>

          <Field label="실내기 소음기준(±10%)">
            <input
              value={ensureStr(v.noise.indoorStd)}
              onChange={(e) => setPath(["noise", "indoorStd"], e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                boxSizing: "border-box",
              }}
            />
          </Field>

          <Field label="실내기 측정 소음값(dB)">
            <InputWithUnit
              value={ensureStr(v.noise.indoorDb)}
              unit="dB"
              type="number"
              step="any"
              onChange={(x) => setPath(["noise", "indoorDb"], x)}
            />
          </Field>

          <Field label="실내기 소음 상태">
            <input
              value={ensureStr(v.noise.indoorState)}
              onChange={(e) => setPath(["noise", "indoorState"], e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                boxSizing: "border-box",
              }}
            />
          </Field>

          <Field label="실외기 정격전력(kW)">
            <InputWithUnit
              value={ensureStr(v.noise.outdoorRatedKw)}
              unit="kW"
              type="number"
              step="any"
              onChange={(x) => setPath(["noise", "outdoorRatedKw"], x)}
            />
          </Field>

          <Field label="실외기 소음기준(±10%)">
            <input
              value={ensureStr(v.noise.outdoorStd)}
              onChange={(e) => setPath(["noise", "outdoorStd"], e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                boxSizing: "border-box",
              }}
            />
          </Field>

          <Field label="실외기 측정 소음값(dB)">
            <InputWithUnit
              value={ensureStr(v.noise.outdoorDb)}
              unit="dB"
              type="number"
              step="any"
              onChange={(x) => setPath(["noise", "outdoorDb"], x)}
            />
          </Field>

          <Field label="실외기 소음 상태">
            <input
              value={ensureStr(v.noise.outdoorState)}
              onChange={(e) => setPath(["noise", "outdoorState"], e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb", // ✅ soft 오타 수정
                borderRadius: 10,
                padding: "8px 10px",
                boxSizing: "border-box",
              }}
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
