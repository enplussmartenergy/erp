/** @jsxImportSource @emotion/react */
import React, { useMemo, useEffect } from "react";
import { css } from "@emotion/react";

import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

/* ✅ ReportBodyStep과 동일한 톤 */
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

const select = css`
  ${input};
  padding-right: 8px;
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

const hr = css`
  height: 1px;
  background: ${c.line};
  margin: 12px 0;
`;

const unitBox = css`
  border: 1px solid ${c.line};
  border-radius: 12px;
  padding: 12px;
  background: #fff;
`;

const unitHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

const unitTitle = css`
  font-weight: 800;
  color: ${c.text};
`;

const smallHelp = css`
  margin-top: 6px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
`;

/* ---------------- util ---------------- */
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
const toNum = (v) => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};
const clamp0 = (n) => Math.max(0, toNum(n));

const ensureArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof FileList !== "undefined" && v instanceof FileList) return Array.from(v);
  return [v];
};

const splitManualList = (text) => {
  const raw = String(text || "")
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const set = new Set();
  for (const r of raw) {
    const only = r.replace(/[^0-9]/g, "");
    if (only) set.add(only);
  }
  return Array.from(set);
};

const buildRangeList = ({ start, step, count }) => {
  const s0 = clamp0(start);
  const st = Math.max(1, clamp0(step) || 1);
  const c = clamp0(count);

  const out = [];
  for (let i = 0; i < c; i++) out.push(String(s0 + st * i));
  return out;
};

const makeUnitBase = (schema, { kind, no }) => {
  const photoSlots = {};
  (schema?.unit?.photoSlots || []).forEach((p) => {
    photoSlots[p.id] = [];
  });

  return {
    id: `${kind}-${no}-${Math.random().toString(16).slice(2)}`,
    kind, // "room" | "classroom"
    no,   // "351" 같은 문자열
    fields: {
      noiseDb: "",
      wind1: "",
      wind2: "",
      wind3: "",
      note: "",
    },
    photoSlots,
  };
};

const normalizeUnit = (schema, u) => {
  const out = { ...(u || {}) };
  out.fields = ensureObj(out.fields);

  // 필드 기본키 보정
  out.fields = {
    noiseDb: ensureStr(out.fields.noiseDb),
    wind1: ensureStr(out.fields.wind1),
    wind2: ensureStr(out.fields.wind2),
    wind3: ensureStr(out.fields.wind3),
    note: ensureStr(out.fields.note),
  };

  // 사진 슬롯 키 보정 + 배열화
  const fixed = {};
  (schema?.unit?.photoSlots || []).forEach((p) => {
    fixed[p.id] = ensureArray(out.photoSlots?.[p.id]).filter(Boolean);
  });
  out.photoSlots = fixed;

  return out;
};

const syncUnits = (schema, value) => {
  const v = ensureObj(value);
  const cfg = ensureObj(v.config);

  const hasClassroom = !!cfg.hasClassroom;
  const roomCount = clamp0(cfg.roomCount);
  const classroomCount = hasClassroom ? clamp0(cfg.classroomCount) : 0;

  const numbering = ensureObj(cfg.numbering);
  const mode = numbering.mode || "manual";

  // 1) 객실 번호 만들기
  let roomNos = [];
  if (mode === "range") {
    roomNos = buildRangeList({
      start: numbering.start ?? 351,
      step: numbering.step ?? 2,
      count: roomCount,
    });
  } else {
    const list = splitManualList(numbering.manualListText || "");
    roomNos = list.slice(0, roomCount);
    while (roomNos.length < roomCount) roomNos.push(""); // 부족하면 빈칸
  }

  // 2) 강의실 번호(기본은 1..N)
  const classNos = Array.from({ length: classroomCount }, (_, i) => String(i + 1));

  const wanted = [
    ...roomNos.map((no) => ({ kind: "room", no })),
    ...classNos.map((no) => ({ kind: "classroom", no })),
  ];

  // 3) 기존 보존 매칭(kind+no 우선)
  const prevUnits = Array.isArray(v.units) ? v.units : [];
  const used = new Set();

  const nextUnits = wanted.map((w) => {
    let idx = -1;

    // 같은 kind+no
    for (let i = 0; i < prevUnits.length; i++) {
      if (used.has(i)) continue;
      const u = prevUnits[i];
      if (u?.kind === w.kind && String(u?.no ?? "") === String(w.no ?? "")) {
        idx = i; break;
      }
    }

    // 없으면 같은 kind 중 하나(번호 변경 시 최대한 보존)
    if (idx === -1) {
      for (let i = 0; i < prevUnits.length; i++) {
        if (used.has(i)) continue;
        const u = prevUnits[i];
        if (u?.kind === w.kind) { idx = i; break; }
      }
    }

    const prev = idx >= 0 ? prevUnits[idx] : null;
    if (idx >= 0) used.add(idx);

    const base = prev ? { ...prev, kind: w.kind, no: w.no } : makeUnitBase(schema, w);
    return normalizeUnit(schema, base);
  });

  return {
    ...v,
    config: {
      ...cfg,
      hasClassroom,
      roomCount,
      classroomCount,
      numbering: {
        mode,
        start: numbering.start ?? 351,
        step: numbering.step ?? 2,
        manualListText: numbering.manualListText ?? "",
      },
    },
    units: nextUnits,
  };
};

/* ---------------- component ---------------- */
export default function FCUForm({ value, onChange, schema }) {
  const v = ensureObj(value);

  // ✅ 최초/변경 시 유닛 자동 동기화 (개수/방식 바꾸면 즉시 반영)
  useEffect(() => {
    const next = syncUnits(schema, v);
    // 값이 비어있거나 units 길이가 다르면 동기화
    const prevLen = Array.isArray(v.units) ? v.units.length : 0;
    const nextLen = Array.isArray(next.units) ? next.units.length : 0;
    const cfgPrev = ensureObj(v.config);
    const cfgNext = ensureObj(next.config);

    const changed =
      prevLen !== nextLen ||
      !!cfgPrev.hasClassroom !== !!cfgNext.hasClassroom ||
      clamp0(cfgPrev.roomCount) !== clamp0(cfgNext.roomCount) ||
      clamp0(cfgPrev.classroomCount) !== clamp0(cfgNext.classroomCount) ||
      (cfgPrev.numbering?.mode || "manual") !== (cfgNext.numbering?.mode || "manual") ||
      String(cfgPrev.numbering?.start ?? "") !== String(cfgNext.numbering?.start ?? "") ||
      String(cfgPrev.numbering?.step ?? "") !== String(cfgNext.numbering?.step ?? "") ||
      String(cfgPrev.numbering?.manualListText ?? "") !== String(cfgNext.numbering?.manualListText ?? "");

    if (changed) onChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, v.config, v.units?.length]);

  const cfg = ensureObj(v.config);
  const units = Array.isArray(v.units) ? v.units.map((u) => normalizeUnit(schema, u)) : [];

  const photos = schema?.unit?.photoSlots || [];

  const roomCount = clamp0(cfg.roomCount);
  const classroomCount = clamp0(cfg.classroomCount);
  const hasClassroom = !!cfg.hasClassroom;

  const numbering = ensureObj(cfg.numbering);
  const mode = numbering.mode || "manual";

  const setPath = (path, nextVal) => {
    const copy = safeClone(v);
    let cur = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
    cur[path[path.length - 1]] = nextVal;
    onChange?.(syncUnits(schema, copy));
  };

  const total = roomCount + (hasClassroom ? classroomCount : 0);

  const labels = useMemo(() => {
    const kinds = schema?.unit?.kinds || [
      { key: "room", label: "객실" },
      { key: "classroom", label: "강의실" },
    ];
    const map = {};
    kinds.forEach((k) => (map[k.key] = k.label));
    return map;
  }, [schema]);

  return (
    <div>
      <Card title="팬코일유닛(FCU) 구성">
        <div css={grid2}>
          <Field label="객실(호수) 개수">
            <input
              css={input}
              value={ensureStr(cfg.roomCount)}
              onChange={(e) => setPath(["config", "roomCount"], e.target.value)}
              inputMode="numeric"
            />
          </Field>

          <Field label="강의실 포함">
            <label style={{ display: "flex", alignItems: "center", gap: 10, height: 36 }}>
              <input
                type="checkbox"
                checked={hasClassroom}
                onChange={(e) => setPath(["config", "hasClassroom"], e.target.checked)}
              />
              <span style={{ color: c.text, fontWeight: 700 }}>강의실도 점검</span>
            </label>
          </Field>

          <Field label="강의실 개수" disabled={!hasClassroom}>
            <input
              css={input}
              value={ensureStr(hasClassroom ? classroomCount : 0)}
              onChange={(e) => setPath(["config", "classroomCount"], e.target.value)}
              inputMode="numeric"
              disabled={!hasClassroom}
            />
          </Field>

          <Field label="총 유닛">
            <input css={input} value={`${total} 개`} readOnly />
          </Field>
        </div>

        <div css={hr} />

        <div css={grid2}>
          <Field label="호수 생성 방식">
            <select
              css={select}
              value={mode}
              onChange={(e) => setPath(["config", "numbering", "mode"], e.target.value)}
            >
              <option value="manual">수동 목록</option>
              <option value="range">범위 생성</option>
            </select>
          </Field>

          {mode === "range" ? (
            <>
              <Field label="시작 번호">
                <input
                  css={input}
                  value={ensureStr(numbering.start ?? 351)}
                  onChange={(e) => setPath(["config", "numbering", "start"], e.target.value)}
                  inputMode="numeric"
                />
              </Field>

              <Field label="증가(step)">
                <input
                  css={input}
                  value={ensureStr(numbering.step ?? 2)}
                  onChange={(e) => setPath(["config", "numbering", "step"], e.target.value)}
                  inputMode="numeric"
                />
              </Field>

              <Field label="생성 개수(=객실개수)">
                <input css={input} value={`${roomCount} 개`} readOnly />
              </Field>
            </>
          ) : (
            <Field label="호수 목록 (쉼표/줄바꿈)" span2>
              <textarea
                css={textarea}
                value={ensureStr(numbering.manualListText)}
                onChange={(e) => setPath(["config", "numbering", "manualListText"], e.target.value)}
                placeholder={"예) 351, 353, 355\n또는\n351\n353\n355"}
              />
              <div css={smallHelp}>
                객실 개수만큼만 사용해. 부족하면 빈칸으로 생성돼서 나중에 호수만 채우면 돼.
              </div>
            </Field>
          )}
        </div>
      </Card>

      <Card title="호수/강의실 점검 데이터">
        {units.length === 0 ? (
          <div style={{ padding: "10px 2px", color: "rgba(15,23,42,.65)" }}>
            객실/강의실 개수를 입력하면 자동으로 생성돼.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {units.map((u, idx) => {
              const kindLabel = labels[u.kind] || u.kind;
              const title =
                u.kind === "classroom"
                  ? `${kindLabel} ${ensureStr(u.no)}`
                  : `${kindLabel} ${ensureStr(u.no) || "(미입력)"}`;

              return (
                <div key={u.id || `${u.kind}-${u.no}-${idx}`} css={unitBox}>
                  <div css={unitHeader}>
                    <div css={unitTitle}>{`${idx + 1}. ${title}`}</div>

                    {/* ✅ 수동 목록 부족으로 빈칸 생성됐을 때 여기서 번호 직접 수정 가능 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,.65)" }}>
                        {u.kind === "classroom" ? "강의실" : "호수"}
                      </span>
                      <input
                        css={css`
                          ${input};
                          height: 30px;
                          width: 96px;
                          padding: 0 8px;
                        `}
                        value={ensureStr(u.no)}
                        onChange={(e) => {
                          const next = safeClone(v);
                          const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                          nextUnits[idx] = { ...(nextUnits[idx] || u), no: e.target.value };
                          next.units = nextUnits;
                          onChange?.(syncUnits(schema, next));
                        }}
                      />
                    </div>
                  </div>

                  <div css={grid2}>
                    <Field label="소음">
                      <InputWithUnit
                        value={ensureStr(u.fields.noiseDb)}
                        unit="dB"
                        onChange={(val) => {
                          const next = safeClone(v);
                          const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                          const cur = normalizeUnit(schema, nextUnits[idx] || u);
                          nextUnits[idx] = { ...cur, fields: { ...cur.fields, noiseDb: val } };
                          next.units = nextUnits;
                          onChange?.(next);
                        }}
                      />
                    </Field>

                    <Field label="풍속1">
                      <InputWithUnit
                        value={ensureStr(u.fields.wind1)}
                        unit="m/s"
                        onChange={(val) => {
                          const next = safeClone(v);
                          const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                          const cur = normalizeUnit(schema, nextUnits[idx] || u);
                          nextUnits[idx] = { ...cur, fields: { ...cur.fields, wind1: val } };
                          next.units = nextUnits;
                          onChange?.(next);
                        }}
                      />
                    </Field>

                    <Field label="풍속2">
                      <InputWithUnit
                        value={ensureStr(u.fields.wind2)}
                        unit="m/s"
                        onChange={(val) => {
                          const next = safeClone(v);
                          const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                          const cur = normalizeUnit(schema, nextUnits[idx] || u);
                          nextUnits[idx] = { ...cur, fields: { ...cur.fields, wind2: val } };
                          next.units = nextUnits;
                          onChange?.(next);
                        }}
                      />
                    </Field>

                    <Field label="풍속3">
                      <InputWithUnit
                        value={ensureStr(u.fields.wind3)}
                        unit="m/s"
                        onChange={(val) => {
                          const next = safeClone(v);
                          const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                          const cur = normalizeUnit(schema, nextUnits[idx] || u);
                          nextUnits[idx] = { ...cur, fields: { ...cur.fields, wind3: val } };
                          next.units = nextUnits;
                          onChange?.(next);
                        }}
                      />
                    </Field>

                    <Field label="비고" span2>
                      <input
                        css={input}
                        value={ensureStr(u.fields.note)}
                        onChange={(e) => {
                          const next = safeClone(v);
                          const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                          const cur = normalizeUnit(schema, nextUnits[idx] || u);
                          nextUnits[idx] = { ...cur, fields: { ...cur.fields, note: e.target.value } };
                          next.units = nextUnits;
                          onChange?.(next);
                        }}
                      />
                    </Field>
                  </div>

                  <div css={hr} />

                  {/* ✅ 사진 슬롯: 그래프 포함 항상 들어가게 schema.unit.photoSlots에 넣어두면 됨 */}
                  <PhotoSlotGrid
                    slots={photos}
                    value={u.photoSlots || {}}
                    onChange={(nextSlots) => {
                      const next = safeClone(v);
                      const nextUnits = Array.isArray(next.units) ? next.units.slice() : [];
                      const cur = normalizeUnit(schema, nextUnits[idx] || u);
                      nextUnits[idx] = { ...cur, photoSlots: nextSlots };
                      next.units = nextUnits;
                      onChange?.(next);
                    }}
                    capture="environment"
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
