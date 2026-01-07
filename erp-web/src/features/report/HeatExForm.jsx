// src/features/report/forms/HeatExForm.jsx (예시 경로)
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

const ensureObj = (v) => (v && typeof v === "object" ? v : {});
const ensureStr = (v) => (v == null ? "" : String(v));

export default function HeatExForm({ value, onChange, schema }) {
  const v = (() => {
    const base = {
      rated: {
        hxType: "",
        maker: "",
        heatArea: "",
        capacity: "",
        installLabel: "",
      },
      measured: {
        steamPressure: "",
        steamTemp: "",
        hotInTemp: "",
        hotOutTemp: "",
        hotFlow: "",
        hSteamIn: "",   // h1
        hCondOut: "",   // h2
        condRho: "",
      },
      photoSlots: {
        // ✅ 2페이지(기준/현황) 1장
        criteria_photo: [],

        // ✅ 3페이지(육안) 4장
        maint_table: [],
        aging_rust_photo: [],
        safety_valve_photo: [],
        circulation_pump_photo: [],

        // ✅ 4페이지(온도/열화상) 4장
        thermal_steam_in: [],
        temp_cond_out: [],
        temp_hot_in: [],
        temp_hot_out: [],

        // ✅ 5페이지(압력/유량) 4장
        gauge_hot_pump: [],
        gauge_steam_head: [],
        flow_measure: [],
        flow_value: [],
      },
      notes: {
        visual: "",
        measure: "",
        flow: "",
        calc: "",
      },
    };

    const out = safeClone({ ...base, ...(value || {}) });

    // schema.photos를 쓰는 구조면, base.photoSlots 키가 schema와 100% 일치해야 함.
    // (현재는 HeatEx는 base로 고정 슬롯 운영한다고 보고 진행)

    out.photoSlots = normalizeSlots(out.photoSlots);
    out.rated = safeClone(out.rated || base.rated);
    out.measured = safeClone(out.measured || base.measured);
    out.notes = safeClone(out.notes || base.notes);
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

  return (
    <div style={{ minWidth: 0 }}>
      <Card title="열교환기 정격/측정 입력">
        <div css={grid2}>
          <Field label="형식(예: 쉘튜브/판형)">
            <input
              value={ensureStr(v.rated.hxType)}
              onChange={(e) => setPath(["rated", "hxType"], e.target.value)}
              style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px" }}
            />
          </Field>

          <Field label="제조사">
            <input
              value={ensureStr(v.rated.maker)}
              onChange={(e) => setPath(["rated", "maker"], e.target.value)}
              style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px" }}
            />
          </Field>

          <Field label="전열면적">
            <InputWithUnit
              value={ensureStr(v.rated.heatArea)}
              onChange={(x) => setPath(["rated", "heatArea"], x)}
              unit="m²"
            />
          </Field>

          <Field label="용량(열량)">
            <InputWithUnit
              value={ensureStr(v.rated.capacity)}
              onChange={(x) => setPath(["rated", "capacity"], x)}
              unit="kcal/h"
            />
          </Field>

          <Field label="설치/구분(예: B1 기계실 #1)">
            <input
              value={ensureStr(v.rated.installLabel)}
              onChange={(e) => setPath(["rated", "installLabel"], e.target.value)}
              style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px" }}
            />
          </Field>

          <div />

          <Field label="증기압력">
            <InputWithUnit
              value={ensureStr(v.measured.steamPressure)}
              onChange={(x) => setPath(["measured", "steamPressure"], x)}
              unit="kg/cm²"
            />
          </Field>

          <Field label="증기온도">
            <InputWithUnit
              value={ensureStr(v.measured.steamTemp)}
              onChange={(x) => setPath(["measured", "steamTemp"], x)}
              unit="℃"
            />
          </Field>

          <Field label="온수 입구 온도">
            <InputWithUnit
              value={ensureStr(v.measured.hotInTemp)}
              onChange={(x) => setPath(["measured", "hotInTemp"], x)}
              unit="℃"
            />
          </Field>

          <Field label="온수 출구 온도">
            <InputWithUnit
              value={ensureStr(v.measured.hotOutTemp)}
              onChange={(x) => setPath(["measured", "hotOutTemp"], x)}
              unit="℃"
            />
          </Field>

          <Field label="온수 유량">
            <InputWithUnit
              value={ensureStr(v.measured.hotFlow)}
              onChange={(x) => setPath(["measured", "hotFlow"], x)}
              unit="m³/h"
            />
          </Field>

          <Field label="증기 엔탈피 h1">
            <InputWithUnit
              value={ensureStr(v.measured.hSteamIn)}
              onChange={(x) => setPath(["measured", "hSteamIn"], x)}
              unit="kcal/kg"
            />
          </Field>

          <Field label="응축수 엔탈피 h2">
            <InputWithUnit
              value={ensureStr(v.measured.hCondOut)}
              onChange={(x) => setPath(["measured", "hCondOut"], x)}
              unit="kcal/kg"
            />
          </Field>

          <Field label="응축수 밀도(선택)">
            <InputWithUnit
              value={ensureStr(v.measured.condRho)}
              onChange={(x) => setPath(["measured", "condRho"], x)}
              unit="kg/m³"
            />
          </Field>
        </div>
      </Card>

      {/* ✅ 2페이지: 기준/현황 사진 */}
      <Card title="점검 단계 및 기준 · 현황 사진">
        <PhotoSlotGrid
          slots={[{ id: "criteria_photo", label: "현황 사진" }]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
          capture="environment"
        />
      </Card>

      {/* ✅ 3페이지: 육안 2x2 */}
      <Card title="육안 점검 사진 (2x2)">
        <PhotoSlotGrid
          slots={[
            { id: "maint_table", label: "유지 관리 점검표" },
            { id: "aging_rust_photo", label: "노후/부식 상태" },
            { id: "safety_valve_photo", label: "안전밸브 상태" },
            { id: "circulation_pump_photo", label: "순환펌프 상태" },
          ]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            value={ensureStr(v.notes.visual)}
            onChange={(e) => setPath(["notes", "visual"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
            placeholder="예) 특이사항 없음"
          />
        </Field>
      </Card>

      {/* ✅ 4페이지: 온도/열화상 2x2 */}
      <Card title="측정 점검(온도/열화상) (2x2)">
        <PhotoSlotGrid
          slots={[
            { id: "thermal_steam_in", label: "증기(입구) 열화상/온도" },
            { id: "temp_cond_out", label: "응축수(출구) 온도" },
            { id: "temp_hot_in", label: "온수(입구) 온도" },
            { id: "temp_hot_out", label: "온수(출구) 온도" },
          ]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            value={ensureStr(v.notes.measure)}
            onChange={(e) => setPath(["notes", "measure"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
            placeholder="예) 온도 표시 정상"
          />
        </Field>
      </Card>

      {/* ✅ 5페이지: 압력/유량 2x2 */}
      <Card title="측정 점검(압력/유량) (2x2)">
        <PhotoSlotGrid
          slots={[
            { id: "gauge_hot_pump", label: "온수펌프 압력 게이지" },
            { id: "gauge_steam_head", label: "증기 헤더 압력 게이지" },
            { id: "flow_measure", label: "유량 측정" },
            { id: "flow_value", label: "유량 측정값" },
          ]}
          value={v.photoSlots}
          onChange={(next) => emit({ ...v, photoSlots: normalizeSlots(next) })}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            value={ensureStr(v.notes.flow)}
            onChange={(e) => setPath(["notes", "flow"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
            placeholder="예) 유량 측정값 확인"
          />
        </Field>
      </Card>

      <Card title="측정 계산식 페이지 메모(선택)">
        <Field label="설명/특이사항(계산식 페이지 하단 문장에 반영)">
          <textarea
            value={ensureStr(v.notes.calc)}
            onChange={(e) => setPath(["notes", "calc"], e.target.value)}
            style={{ width: "100%", height: 90, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
            placeholder="예) 배관 온도 표기 오류, 안전밸브 점검 필요 등"
          />
        </Field>
      </Card>
    </div>
  );
}
