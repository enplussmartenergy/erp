// src/features/report/ColdHotForm.jsx
/** @jsxImportSource @emotion/react */
import React from "react";
import { css } from "@emotion/react";

import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

import { coldHotSchema } from "../../domain/schemas/coldHotSchema";

const c = {
  primary: "#2563EB",
  line: "#E5E7EB",
  text: "#0F172A",
  ring: "rgba(37,99,235,.14)",
};

const input = css`
  height: 36px;
  border: 1px solid ${c.line};
  border-radius: 10px;
  padding: 0 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: #fff;
  color: ${c.text};
  &:focus {
    outline: none;
    border-color: ${c.primary};
    box-shadow: 0 0 0 4px ${c.ring};
  }
`;

const textarea = css`
  width: 100%;
  min-height: 110px;
  border: 1px solid ${c.line};
  border-radius: 10px;
  padding: 10px;
  box-sizing: border-box;
  background: #fff;
  color: ${c.text};
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${c.primary};
    box-shadow: 0 0 0 4px ${c.ring};
  }
`;

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

const ensureStr = (v) => (v == null ? "" : String(v));

function normalizeSlots(nextSlots = {}) {
  const out = safeClone(nextSlots || {});
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (v == null) out[k] = [];
    else if (typeof FileList !== "undefined" && v instanceof FileList) out[k] = Array.from(v);
    else if (!Array.isArray(v)) out[k] = [v];
  });
  return out;
}

function migratePhotoSlots(slots = {}) {
  const s = normalizeSlots(slots);

  // ✅ 레거시 흔적 대응(원하면 더 추가 가능)
  const move = (from, to) => {
    if (!from || !to) return;
    const arr = s[from];
    if (!arr || !arr.length) return;
    if (!s[to] || !s[to].length) s[to] = [];
    s[to] = [...s[to], ...arr].filter(Boolean);
    delete s[from];
  };

  move("criteriaPhoto", "criteria_photo");
  move("criteriaPhotoUrl", "criteria_photo");
  move("criteria", "criteria_photo");
  move("photo", "criteria_photo");
  move("image", "criteria_photo");

  return s;
}

export default function ColdHotForm({ value, onChange, schema }) {
  const useSchema = schema || coldHotSchema;

  // ✅ 스키마 기준 photoSlots 기본키 생성(키 누락 방지)
  const basePhotoSlots = Object.fromEntries((useSchema.photos || []).map((p) => [p.id, []]));

  const base = {
    rated: {
      unitNo: "",
      maker: "",
      model: "",
      installLabel: "",
      ratedFlow: "",
      ratedCop: "",
    },
    measured: {
      chilledFlow: "",
      deltaT: "",
      gasPerHour: "",
      measuredCop: "",
    },
    photoSlots: basePhotoSlots,
    notes: {
      visual1: "",
      visual2: "",
      visual3: "",
      measure1: "",
      calc: "",
      exhaust: "",
      actions: "",
      remark: "",
    },
  };

  const v = (() => {
    const out = safeClone({ ...base, ...(value || {}) });

    // ✅ photoSlots: base 키 보강 + 정규화 + 마이그레이션
    const mergedSlots = { ...base.photoSlots, ...(out.photoSlots || {}) };
    out.photoSlots = migratePhotoSlots(mergedSlots);

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

  const setSlots = (nextSlots) => {
    const normalized = migratePhotoSlots(nextSlots);
    emit({ ...v, photoSlots: normalized });
  };

  const criteriaSlots = [{ id: "criteria_photo", label: "현황 사진(기준/현황)" }];

  const sec = (id) => (useSchema.sections || []).find((x) => x.id === id);
  const visual1 = sec("ch_visual_1");
  const visual2 = sec("ch_visual_2");
  const visual3 = sec("ch_visual_3");
  const measure1 = sec("ch_measure_1");

  return (
    <div style={{ minWidth: 0 }}>
      <Card title="기본 정보">
        <div css={grid2} style={{ minWidth: 0 }}>
          <Field label="호기(#)">
            <input
              css={input}
              value={ensureStr(v.rated.unitNo)}
              onChange={(e) => setPath(["rated", "unitNo"], e.target.value)}
              placeholder="예: 2호기"
            />
          </Field>
          <Field label="제조사">
            <input css={input} value={ensureStr(v.rated.maker)} onChange={(e) => setPath(["rated", "maker"], e.target.value)} />
          </Field>
          <Field label="모델">
            <input css={input} value={ensureStr(v.rated.model)} onChange={(e) => setPath(["rated", "model"], e.target.value)} />
          </Field>
          <Field label="설치 라벨/위치">
            <input
              css={input}
              value={ensureStr(v.rated.installLabel)}
              onChange={(e) => setPath(["rated", "installLabel"], e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card title="1. 냉온수기 성능 점검 단계 및 점검 기준 · 현황 사진">
        <PhotoSlotGrid slots={criteriaSlots} value={v.photoSlots} onChange={setSlots} capture="environment" />
      </Card>

      <Card title={visual1?.title || "2. 냉온수기 육안 점검표 #1 (2x2)"}>
        <PhotoSlotGrid slots={visual1?.slots || []} value={v.photoSlots} onChange={setSlots} capture="environment" />
        <Field label="점검 결과 사항">
          <textarea css={textarea} value={ensureStr(v.notes.visual1)} onChange={(e) => setPath(["notes", "visual1"], e.target.value)} />
        </Field>
      </Card>

      <Card title={visual2?.title || "2. 냉온수기 육안 점검표 #2 (2x2)"}>
        <PhotoSlotGrid slots={visual2?.slots || []} value={v.photoSlots} onChange={setSlots} capture="environment" />
        <Field label="점검 결과 사항">
          <textarea css={textarea} value={ensureStr(v.notes.visual2)} onChange={(e) => setPath(["notes", "visual2"], e.target.value)} />
        </Field>
      </Card>

      <Card title={visual3?.title || "3. 냉온수기 육안 점검표 #3 (2x2)"}>
        <PhotoSlotGrid slots={visual3?.slots || []} value={v.photoSlots} onChange={setSlots} capture="environment" />
        <Field label="점검 결과 사항">
          <textarea css={textarea} value={ensureStr(v.notes.visual3)} onChange={(e) => setPath(["notes", "visual3"], e.target.value)} />
        </Field>
      </Card>

      <Card title={measure1?.title || "3. 냉온수기 측정 점검표 #1 (2x2)"}>
        <PhotoSlotGrid slots={measure1?.slots || []} value={v.photoSlots} onChange={setSlots} capture="environment" />
        <Field label="점검 결과 사항">
          <textarea css={textarea} value={ensureStr(v.notes.measure1)} onChange={(e) => setPath(["notes", "measure1"], e.target.value)} />
        </Field>
      </Card>

      <Card title="4. 냉온수기 측정 계산식(COP) 입력">
        <div css={grid2} style={{ minWidth: 0 }}>
          <Field label="냉수 정격유량 (m³/h)">
            <InputWithUnit value={ensureStr(v.rated.ratedFlow)} onChange={(x) => setPath(["rated", "ratedFlow"], x)} unit="m³/h" />
          </Field>
          <Field label="정격 COP">
            <input css={input} value={ensureStr(v.rated.ratedCop)} onChange={(e) => setPath(["rated", "ratedCop"], e.target.value)} />
          </Field>
          <Field label="냉수유량 (m³/h)">
            <InputWithUnit value={ensureStr(v.measured.chilledFlow)} onChange={(x) => setPath(["measured", "chilledFlow"], x)} unit="m³/h" />
          </Field>
          <Field label="냉수 입출수 온도차 (℃)">
            <InputWithUnit value={ensureStr(v.measured.deltaT)} onChange={(x) => setPath(["measured", "deltaT"], x)} unit="℃" />
          </Field>
          <Field label="시간당 가스 사용량 (Nm³/h)">
            <InputWithUnit value={ensureStr(v.measured.gasPerHour)} onChange={(x) => setPath(["measured", "gasPerHour"], x)} unit="Nm³/h" />
          </Field>
          <Field label="측정 COP">
            <input css={input} value={ensureStr(v.measured.measuredCop)} onChange={(e) => setPath(["measured", "measuredCop"], e.target.value)} />
          </Field>
        </div>

        <Field label="계산/판정 메모">
          <textarea
            css={textarea}
            value={ensureStr(v.notes.calc)}
            onChange={(e) => setPath(["notes", "calc"], e.target.value)}
            placeholder="계산 결과, 판정, 권고사항 등"
          />
        </Field>
      </Card>

      <Card title="5. 냉온수기 배기가스 측정(기준/측정지)">
        <PhotoSlotGrid
          slots={[{ id: "ch_exhaust_sheet", label: "배기가스 측정지(기준/측정지)" }]}
          value={v.photoSlots}
          onChange={setSlots}
          capture="environment"
        />
        <Field label="배기가스 메모">
          <textarea css={textarea} value={ensureStr(v.notes.exhaust)} onChange={(e) => setPath(["notes", "exhaust"], e.target.value)} />
        </Field>
      </Card>

      <Card title="비고/조치사항(표지)">
        <div css={grid2} style={{ minWidth: 0 }}>
          <Field label="조치사항">
            <input css={input} value={ensureStr(v.notes.actions)} onChange={(e) => setPath(["notes", "actions"], e.target.value)} />
          </Field>
          <Field label="비고">
            <input css={input} value={ensureStr(v.notes.remark)} onChange={(e) => setPath(["notes", "remark"], e.target.value)} />
          </Field>
        </div>
      </Card>
    </div>
  );
}
