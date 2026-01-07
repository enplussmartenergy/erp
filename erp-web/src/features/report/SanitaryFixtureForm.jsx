// src/features/report/SanitaryFixtureForm.jsx
/** @jsxImportSource @emotion/react */
import React, { useMemo } from "react";

import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

// ✅ 스키마 단일 소스 통일
import { sanitaryFixtureSchema as defaultSchema } from "../../domain/schemas/sanitarySchema";

/* util */
const safeClone = (obj) => {
  try {
    return typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
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

  move("criteriaPhoto", "criteria_photo");
  move("criteria_photo_url", "criteria_photo");
  move("criteriaPhotoUrl", "criteria_photo");
  move("criteria", "criteria_photo");
  move("photo", "criteria_photo");
  move("image", "criteria_photo");

  return s;
}

const ensureStr = (v) => (v == null ? "" : String(v));

export default function SanitaryFixtureForm({ schema, value, onChange }) {
  const S = schema || defaultSchema;

  // ✅ photos에 criteria_photo 없으면 강제 삽입
  const photos = useMemo(() => {
    const src = Array.isArray(S?.photos) ? S.photos.slice() : [];
    const hasCriteria = src.some((p) => p?.id === "criteria_photo");
    if (!hasCriteria) src.unshift({ id: "criteria_photo", label: "현황 사진" });
    return src;
  }, [S]);

  const sections = S?.sections || [];

  const basePhotoSlots = useMemo(() => Object.fromEntries((photos || []).map((p) => [p.id, []])), [photos]);

  const baseNotes = useMemo(() => {
    const n = {};
    (sections || []).forEach((sec) => {
      const k = sec.noteKey || sec.id;
      n[k] = "";
    });
    return n;
  }, [sections]);

  const v = (() => {
    const base = {
      rated: { topLocation: "", bottomLocation: "" },
      measured: { topPressure: "", bottomPressure: "" },
      photoSlots: basePhotoSlots,
      notes: baseNotes,
    };

    const out = safeClone({ ...base, ...(value || {}) });

    const mergedSlots = { ...base.photoSlots, ...(out.photoSlots || {}) };
    out.photoSlots = migratePhotoSlots(mergedSlots);

    out.notes = { ...base.notes, ...(out.notes || {}) };
    Object.keys(base.notes).forEach((k) => (out.notes[k] = ensureStr(out.notes[k])));

    out.rated = { ...base.rated, ...(out.rated || {}) };
    out.measured = { ...base.measured, ...(out.measured || {}) };

    return out;
  })();

  const emit = (next) => onChange?.(safeClone(next));

  const setPath = (path, val) => {
    const next = safeClone(v);
    let cur = next;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!cur[key]) cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = val;
    emit(next);
  };

  const setSlots = (nextSlots) => {
    const merged = { ...basePhotoSlots, ...(nextSlots || {}) };
    emit({ ...v, photoSlots: migratePhotoSlots(merged) });
  };

  const criteriaSlots = useMemo(() => {
    const found = (photos || []).filter((p) => p.id === "criteria_photo");
    return found.length ? found : [{ id: "criteria_photo", label: "현황 사진" }];
  }, [photos]);

  return (
    <div style={{ minWidth: 0 }}>
      <Card title="수전 위치 정보">
        <div css={grid2}>
          <Field label="최상층 수전 위치">
            <InputWithUnit
              value={ensureStr(v.rated.topLocation)}
              unit=""
              placeholder="예) 상생동 3층"
              onChange={(x) => setPath(["rated", "topLocation"], x)}
            />
          </Field>

          <Field label="최하층 수전 위치">
            <InputWithUnit
              value={ensureStr(v.rated.bottomLocation)}
              unit=""
              placeholder="예) 상생동 L층"
              onChange={(x) => setPath(["rated", "bottomLocation"], x)}
            />
          </Field>
        </div>
      </Card>

      <Card title="수전 입력 압력">
        <div css={grid2}>
          <Field label="최상층 수전입력 압력">
            <InputWithUnit
              value={ensureStr(v.measured.topPressure)}
              unit="kPa"
              type="number"
              step="any"
              onChange={(x) => setPath(["measured", "topPressure"], x)}
            />
          </Field>

          <Field label="최하층 수전입력 압력">
            <InputWithUnit
              value={ensureStr(v.measured.bottomPressure)}
              unit="kPa"
              type="number"
              step="any"
              onChange={(x) => setPath(["measured", "bottomPressure"], x)}
            />
          </Field>
        </div>
      </Card>

      <Card title="기준/현황 사진">
        <PhotoSlotGrid slots={criteriaSlots} value={v.photoSlots} onChange={setSlots} capture="environment" />
      </Card>

      {(sections || []).map((sec) => {
        const noteKey = sec.noteKey || sec.id;
        return (
          <Card key={sec.id} title={sec.title}>
            <PhotoSlotGrid slots={sec.slots || []} value={v.photoSlots} onChange={setSlots} capture="environment" />

            <Field label="점검 결과 사항">
              <textarea
                value={ensureStr(v.notes[noteKey])}
                onChange={(e) => setPath(["notes", noteKey], e.target.value)}
                style={{
                  width: "100%",
                  height: 90,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 10,
                  boxSizing: "border-box",
                  marginTop: 10,
                }}
              />
            </Field>
          </Card>
        );
      })}
    </div>
  );
}
