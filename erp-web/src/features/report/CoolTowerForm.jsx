/** @jsxImportSource @emotion/react */
import React, { useMemo } from "react";
import { css } from "@emotion/react";
import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

/* ✅ ReportBodyStep과 동일한 톤 */
const c = { primary: "#2563EB", line: "#E5E7EB", text: "#0F172A", ring: "rgba(37,99,235,.14)" };

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
  min-height: 120px;
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
const ensureObj = (v) => (v && typeof v === "object" ? v : {});
const ensureStr = (v) => (v == null ? "" : String(v));

export default function CoolTowerForm({ value, onChange, schema }) {
  const v = ensureObj(value);

  const photos = schema?.photos || [];

  // ✅ photoSlots: 항상 객체 + 각 key는 배열로 정규화
  const normalizePhotoSlots = (slots) => {
    const out = { ...(slots || {}) };
    photos.forEach((p) => {
      if (!out[p.id]) out[p.id] = [];
      if (typeof FileList !== "undefined" && out[p.id] instanceof FileList) out[p.id] = Array.from(out[p.id] || []);
      if (!Array.isArray(out[p.id])) out[p.id] = [out[p.id]].filter(Boolean);
    });
    return out;
  };

  const photoSlots = useMemo(() => normalizePhotoSlots(v.photoSlots), [v.photoSlots, photos]);

  const rated = ensureObj(v.rated);
  const measured = ensureObj(v.measured);
  const notes = ensureObj(v.notes);

  const setPath = (path, nextVal) => {
    const copy = safeClone(v);
    let cur = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
    cur[path[path.length - 1]] = nextVal;
    onChange?.(copy);
  };

  const group = (ids) => photos.filter((p) => ids.includes(p.id));

  const criteriaSlots = group(["criteria_photo"]);

  const visualPage1 = group(["ct_maint_table", "ct_rust_state", "ct_fill_state", "ct_water_basin"]);

  const visualPage2 = group(["ct_strainer", "ct_fan_rotation", "ct_anchor_state", "ct_motor_noise"]);

  const measurePage = group(["ct_flow_measure", "ct_flow_value", "ct_voltage", "ct_current"]);

  return (
    <div>
      <Card title="냉각탑 정격/측정 입력">
        <div css={grid2}>
          <Field label="구분(예: 냉각탑 2호기)">
            <input
              css={input}
              value={ensureStr(rated.kind)}
              onChange={(e) => setPath(["rated", "kind"], e.target.value)}
            />
          </Field>

          <Field label="형식(예: 유도통풍형)">
            <input
              css={input}
              value={ensureStr(rated.type)}
              onChange={(e) => setPath(["rated", "type"], e.target.value)}
            />
          </Field>

          <Field label="정격 유량">
            <InputWithUnit
              value={ensureStr(rated.flow)}
              onChange={(val) => setPath(["rated", "flow"], val)}
              unit="m³/h"
            />
          </Field>

          <Field label="정격 전력">
            <InputWithUnit
              value={ensureStr(rated.power)}
              onChange={(val) => setPath(["rated", "power"], val)}
              unit="kW"
            />
          </Field>

          <Field label="제조사">
            <input
              css={input}
              value={ensureStr(rated.maker)}
              onChange={(e) => setPath(["rated", "maker"], e.target.value)}
            />
          </Field>

          <div />

          <Field label="측정 유량">
            <InputWithUnit
              value={ensureStr(measured.flow)}
              onChange={(val) => setPath(["measured", "flow"], val)}
              unit="m³/h"
            />
          </Field>

          <Field label="측정 전력">
            <InputWithUnit
              value={ensureStr(measured.power)}
              onChange={(val) => setPath(["measured", "power"], val)}
              unit="kW"
            />
          </Field>
        </div>
      </Card>

      <Card title="냉각탑 점검 단계 및 기준 · 현황 사진">
        <PhotoSlotGrid
          slots={criteriaSlots}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
      </Card>

      <Card title="냉각탑 육안 점검 #1 (2x2)">
        <PhotoSlotGrid
          slots={visualPage1}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            css={textarea}
            value={ensureStr(notes.visual1)}
            onChange={(e) => setPath(["notes", "visual1"], e.target.value)}
            placeholder="예) 특이사항 없음"
          />
        </Field>
      </Card>

      <Card title="냉각탑 육안 점검 #2 (2x2)">
        <PhotoSlotGrid
          slots={visualPage2}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            css={textarea}
            value={ensureStr(notes.visual2)}
            onChange={(e) => setPath(["notes", "visual2"], e.target.value)}
            placeholder="예) 특이사항 없음"
          />
        </Field>
      </Card>

      <Card title="냉각탑 측정 점검 (2x2)">
        <PhotoSlotGrid
          slots={measurePage}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            css={textarea}
            value={ensureStr(notes.measure)}
            onChange={(e) => setPath(["notes", "measure"], e.target.value)}
            placeholder="예) 특이사항 없음"
          />
        </Field>
      </Card>

      <Card title="측정 계산식 페이지 메모(선택)">
        <Field label="설명/특이사항(계산식 페이지 하단 문장에 반영)">
          <textarea
            css={textarea}
            value={ensureStr(notes.calc)}
            onChange={(e) => setPath(["notes", "calc"], e.target.value)}
            placeholder="예) 레지오넬라균 관리 문구 등"
          />
        </Field>
      </Card>
    </div>
  );
}
