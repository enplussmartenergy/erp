// src/features/report/PipeForm.jsx
/** @jsxImportSource @emotion/react */
import React, { useMemo } from "react";
import { css } from "@emotion/react";
import Card from "../../ui/Card";
import Field from "../../ui/Field";
import InputWithUnit from "../../ui/InputWithUnit";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";
import { grid2 } from "../../styles/primitives";

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

const sectionTitle = css`
  font-weight: 900;
  margin: 6px 0;
`;

const ptsGrid = css`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
`;

const hintBox = css`
  border: 1px solid ${c.line};
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
  color: ${c.text};
  line-height: 1.45;
  font-size: 13px;
`;

const kvGrid = css`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px 12px;
  align-items: start;
  div:nth-of-type(odd) {
    font-weight: 800;
    color: #111827;
  }
  div:nth-of-type(even) {
    color: #334155;
    word-break: break-word;
  }
`;

const safeClone = (obj) => {
  try {
    return typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
  } catch {
    return { ...(obj || {}) };
  }
};
const ensureObj = (v) => (v && typeof v === "object" ? v : {});
const S = (v) => (v == null ? "" : String(v));
const N = (v) => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};
const fmt2 = (n) => (Number.isFinite(+n) ? (+n).toFixed(2) : "");
const fmt3 = (n) => (Number.isFinite(+n) ? (+n).toFixed(3) : "");

export default function PipeForm({ value, onChange, schema }) {
  const v = ensureObj(value);
  const photos = schema?.photos || [];

  // ✅ slots 기준으로 항상 배열 유지 + 빈 키 생성
  const normalizePhotoSlots = (slots) => {
    const out = { ...(slots || {}) };
    photos.forEach((p) => {
      const id = p.id;
      if (!out[id]) out[id] = [];
      if (typeof FileList !== "undefined" && out[id] instanceof FileList) out[id] = Array.from(out[id] || []);
      if (!Array.isArray(out[id])) out[id] = [out[id]].filter(Boolean);
    });
    return out;
  };

  const photoSlots = useMemo(() => normalizePhotoSlots(v.photoSlots), [v.photoSlots, photos]);
  const notes = ensureObj(v.notes);
  const measured = ensureObj(v.measured);

  // ✅ measured.points는 3x6 기본형으로 강제
  const pts = useMemo(() => {
    const base = [
      ["", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["", "", "", "", "", ""],
    ];
    const src = Array.isArray(measured.points) ? measured.points : null;
    if (!src) return base;

    const out = base.map((row, r) => {
      const srcRow = Array.isArray(src[r]) ? src[r] : [];
      return row.map((_, cIdx) => S(srcRow[cIdx]));
    });
    return out;
  }, [measured.points]);

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
  const visual1Slots = group(["pipe_maint_table", "pipe_guide_shoe", "pipe_exp_joint_cw", "pipe_exp_joint_ws"]);
  const visual2Slots = group([
    "pipe_support_hvac_cw",
    "pipe_support_mech_room",
    "pipe_support_pit_hot_end",
    "pipe_support_pit_ws_hot",
  ]);
  const thickSlots = group(["pipe_thk_points"]);

  const setPoint = (row, col, val) => {
    const next = pts.map((r) => r.slice());
    next[row][col] = val;
    setPath(["measured", "points"], next);
  };

  // ✅ PDF 계산식 블록과 동일하게 쓰기 위한 “요약 계산”
  const calc = useMemo(() => {
    const pipeSpec = S(measured.pipeSpec);
    const nominal = N(measured.nominalThk);
    const years = Math.max(0.0001, N(measured.usedYears));
    const allowRatio = Math.max(0, N(measured.allowRatio || 40));
    const allowMin = nominal ? nominal * (allowRatio / 100) : 0;

    const minOf = (arr) => {
      const nums = (arr || []).map(N).filter((x) => Number.isFinite(x) && x > 0);
      return nums.length ? Math.min(...nums) : 0;
    };

    const rowMin = [0, 1, 2].map((i) => minOf(pts[i]));
    const corRate = rowMin.map((m) => (nominal > 0 && m > 0 ? (nominal - m) / years : 0)); // mm/year
    const remain = rowMin.map((m, i) => (corRate[i] > 0 ? Math.max(0, (m - allowMin) / corRate[i]) : 0)); // year

    return { pipeSpec, nominal, years, allowRatio, allowMin, rowMin, corRate, remain };
  }, [measured.pipeSpec, measured.nominalThk, measured.usedYears, measured.allowRatio, pts]);

  const baseStd = S(measured.baseStd || "ASME B31.3");
  const ca = S(measured.ca);   // 부식여유(옵션)
  const tReq = S(measured.tReq); // 설계 최소두께 계산값(옵션)

  return (
    <div>
      <Card title="1. 점검 단계 및 점검 기준 · 현황 사진">
        <PhotoSlotGrid
          slots={criteriaSlots}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
      </Card>

      <Card title="2. 배관 설비 육안 점검표 #1 (2x2)">
        <PhotoSlotGrid
          slots={visual1Slots}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            css={textarea}
            value={S(notes.visual1)}
            onChange={(e) => setPath(["notes", "visual1"], e.target.value)}
          />
        </Field>
      </Card>

      <Card title="2. 배관 설비 육안 점검표 #2 (2x2)">
        <PhotoSlotGrid
          slots={visual2Slots}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />
        <Field label="점검 결과 사항">
          <textarea
            css={textarea}
            value={S(notes.visual2)}
            onChange={(e) => setPath(["notes", "visual2"], e.target.value)}
          />
        </Field>
      </Card>

      <Card title="3. 배관 설비 측정 점검표 (Option) - 두께">
        <div css={grid2}>
          <Field label="배관 규격(예: 300A, Sch=40)">
            <input
              css={input}
              value={S(measured.pipeSpec)}
              onChange={(e) => setPath(["measured", "pipeSpec"], e.target.value)}
            />
          </Field>

          <Field label="공칭 두께(mm)">
            <InputWithUnit
              value={S(measured.nominalThk)}
              onChange={(val) => setPath(["measured", "nominalThk"], val)}
              unit="mm"
            />
          </Field>

          <Field label="측정관 사용연수(year)">
            <InputWithUnit
              value={S(measured.usedYears)}
              onChange={(val) => setPath(["measured", "usedYears"], val)}
              unit="year"
            />
          </Field>

          <Field label="최소허용두께 비율(예: 40)">
            <InputWithUnit
              value={S(measured.allowRatio)}
              onChange={(val) => setPath(["measured", "allowRatio"], val)}
              unit="%"
            />
          </Field>
        </div>

        {/* ✅ PDF 계산식 블록에 같이 찍을 “옵션 입력” */}
        <div css={grid2}>
          <Field label="기준(예: ASME B31.3)">
            <input
              css={input}
              value={baseStd}
              onChange={(e) => setPath(["measured", "baseStd"], e.target.value)}
              placeholder="ASME B31.3"
            />
          </Field>

          <Field label="설계 최소두께(계산값) tReq (mm) (옵션)">
            <InputWithUnit
              value={tReq}
              onChange={(val) => setPath(["measured", "tReq"], val)}
              unit="mm"
            />
          </Field>

          <Field label="부식여유 CA (mm) (옵션)">
            <InputWithUnit
              value={ca}
              onChange={(val) => setPath(["measured", "ca"], val)}
              unit="mm"
            />
          </Field>

          <Field label="자동 계산: 최소허용두께(mm)">
            <input css={input} value={calc.allowMin ? fmt3(calc.allowMin) : ""} readOnly />
          </Field>
        </div>

        <Card title="두께 측정값(6 points)">
          {[0, 1, 2].map((r) => (
            <div key={r} css={css`margin-bottom: 10px;`}>
              <div css={sectionTitle}>{r + 1}호기</div>
              <div css={ptsGrid}>
                {[0, 1, 2, 3, 4, 5].map((cIdx) => (
                  <input
                    key={cIdx}
                    css={input}
                    placeholder={`${cIdx + 1}p`}
                    value={S(pts?.[r]?.[cIdx])}
                    onChange={(e) => setPoint(r, cIdx, e.target.value)}
                    inputMode="decimal"
                  />
                ))}
              </div>
            </div>
          ))}
        </Card>

        {/* ✅ 스샷 요구: 두께 측정 포인터(사진) 반드시 포함 */}
        <PhotoSlotGrid
          slots={thickSlots}
          value={photoSlots}
          onChange={(next) => setPath(["photoSlots"], normalizePhotoSlots(next))}
          capture="environment"
        />

        {/* ✅ 폼에서도 계산식/판정 요약을 바로 확인(=PDF와 동일 내용) */}
        <Card title="자동 계산 요약(미리보기)">
          <div css={hintBox}>
            <div css={kvGrid}>
              <div>배관 규격</div>
              <div>{calc.pipeSpec || "-"}</div>

              <div>공칭두께</div>
              <div>{calc.nominal ? `${fmt2(calc.nominal)} mm` : "-"}</div>

              <div>사용연수</div>
              <div>{calc.years ? `${fmt2(calc.years)} year` : "-"}</div>

              <div>최소허용두께</div>
              <div>
                {calc.allowMin ? `${fmt3(calc.allowMin)} mm` : "-"}
                {calc.allowRatio ? ` (공칭의 ${fmt2(calc.allowRatio)}%)` : ""}
              </div>

              <div>호기별 측정 최소두께</div>
              <div>
                1호기 {calc.rowMin[0] ? `${fmt3(calc.rowMin[0])}mm` : "-"} / 2호기{" "}
                {calc.rowMin[1] ? `${fmt3(calc.rowMin[1])}mm` : "-"} / 3호기{" "}
                {calc.rowMin[2] ? `${fmt3(calc.rowMin[2])}mm` : "-"}
              </div>

              <div>최대 침식율</div>
              <div>
                1호기 {calc.corRate[0] ? `${fmt3(calc.corRate[0])} mm/year` : "-"} / 2호기{" "}
                {calc.corRate[1] ? `${fmt3(calc.corRate[1])} mm/year` : "-"} / 3호기{" "}
                {calc.corRate[2] ? `${fmt3(calc.corRate[2])} mm/year` : "-"}
              </div>

              <div>추정 잔존수명</div>
              <div>
                1호기 {calc.remain[0] ? `${fmt2(calc.remain[0])}년` : "-"} / 2호기{" "}
                {calc.remain[1] ? `${fmt2(calc.remain[1])}년` : "-"} / 3호기{" "}
                {calc.remain[2] ? `${fmt2(calc.remain[2])}년` : "-"}
              </div>

              <div>기준 / 옵션</div>
              <div>
                기준: {baseStd || "-"}
                {tReq ? ` / tReq: ${tReq}mm` : ""}
                {ca ? ` / CA: ${ca}mm` : ""}
              </div>
            </div>

            <div css={css`margin-top: 10px; font-size: 12.5px; color: #475569; white-space: pre-line;`}>
              {[
                "• 침식율(mm/year) = (공칭두께 - 측정최소두께) / 사용연수",
                "• 잔존수명(year) = (측정최소두께 - 최소허용두께) / 침식율",
                "",
                "판정(예시)",
                "- 현재 최소두께 > 최소허용두께  → 잔존 두께 양호",
                "- 침식율이 큰 경우 → 점검주기 단축/교체 검토",
              ].join("\n")}
            </div>
          </div>
        </Card>

        <Field label="점검 결과 사항">
          <textarea
            css={textarea}
            value={S(notes.measure)}
            onChange={(e) => setPath(["notes", "measure"], e.target.value)}
          />
        </Field>
      </Card>

      <Card title="비고/조치사항(표지)">
        <div css={grid2}>
          <Field label="조치사항">
            <input
              css={input}
              value={S(notes.actions)}
              onChange={(e) => setPath(["notes", "actions"], e.target.value)}
            />
          </Field>
          <Field label="비고">
            <input
              css={input}
              value={S(notes.remark)}
              onChange={(e) => setPath(["notes", "remark"], e.target.value)}
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
