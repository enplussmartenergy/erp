/** @jsxImportSource @emotion/react */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { css } from "@emotion/react";
import Card from "../../../../ui/Card";

const c = {
  line: "#E5E7EB",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#2563EB",
  bg: "#fff",
};

const grid2 = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const gridMonths = css`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
`;

const row = css`
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 10px;
  align-items: center;
`;

const label = css`
  font-weight: 900;
  color: ${c.text};
  white-space: nowrap;
`;

const input = css`
  height: 42px;
  border: 1px solid ${c.line};
  border-radius: 10px;
  padding: 0 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: ${c.bg};
  color: ${c.text};
  font-size: 14px;
  text-align: right;

  &:focus {
    outline: none;
    border-color: ${c.primary};
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
  }
`;

const hint = css`
  color: ${c.sub};
  font-size: 12px;
  line-height: 1.45;
`;

const chips = css`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  button {
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid ${c.line};
    background: #fff;
    font-weight: 900;
    cursor: pointer;
    color: ${c.text};
  }
  button[aria-pressed="true"] {
    border-color: ${c.primary};
    color: ${c.primary};
    background: rgba(37, 99, 235, 0.08);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
  }
`;

const MONTHS = Array.from({ length: 12 }).map((_, i) => i + 1);

/**
 * ✅ 숫자 파서 보강
 * - 콤마 제거
 * - (선택) 천단위 점 표기(예: 50.579 -> 50579) 제거
 *   ※ 소수점 입력을 쓰는 화면이면 이 라인은 제거해야 함
 */
const num = (v) => {
  if (v == null) return 0;
  const s = String(v).trim();
  const cleaned = s
    .replaceAll(",", "")
    .replace(/\.(?=\d{3}(\D|$))/g, ""); // 천단위 점만 제거
  const n = +cleaned;
  return Number.isFinite(n) ? n : 0;
};

// ✅ 0도 표시되게
const fmt0 = (v) => {
  const n = num(v);
  return Number.isFinite(n) ? String(Math.round(n)) : "";
};

/* =========================
   ✅ 데이터 구조
   years[year] = {
     electric: { monthlyKwh, monthlyCost, totalKwh, totalCost, toe, unitCostWonPerKwh },
     gas: { enabled, unitLabel, monthlyUse, monthlyCost, totalUse, totalCost, toe, unitCostWonPerUnit }
   }
========================= */

function blankElectric() {
  return {
    monthlyKwh: Array(12).fill(""),
    monthlyCost: Array(12).fill(""),
    totalKwh: "",
    totalCost: "",
    toe: "",
    unitCostWonPerKwh: "",
  };
}

function blankGas() {
  return {
    enabled: false,
    unitLabel: "Nm³",
    monthlyUse: Array(12).fill(""),
    monthlyCost: Array(12).fill(""),
    totalUse: "",
    totalCost: "",
    toe: "",
    unitCostWonPerUnit: "",
  };
}

/**
 * ✅ normalizeEnergy
 * - baseYear가 과거로 박혀 있어도 화면 기준(baseYear)으로 강제 가능
 */
function normalizeEnergy(v, y1, y2, baseYear, forceBaseYear = true) {
  const base = v && typeof v === "object" ? v : {};
  const years = base.years || {};

  const pad12 = (arr) => {
    const src = Array.isArray(arr) ? arr.slice(0, 12) : [];
    while (src.length < 12) src.push("");
    return src;
  };

  const normalizeYear = (cur) => {
    const hasLegacyElectric =
      cur &&
      (Array.isArray(cur.monthlyKwh) ||
        Array.isArray(cur.monthlyCost) ||
        cur.totalKwh != null ||
        cur.totalCost != null);

    const electric = {
      ...blankElectric(),
      ...(cur?.electric || (hasLegacyElectric ? cur : {})),
    };
    electric.monthlyKwh = pad12(electric.monthlyKwh);
    electric.monthlyCost = pad12(electric.monthlyCost);

    const gas = { ...blankGas(), ...(cur?.gas || {}) };
    gas.monthlyUse = pad12(gas.monthlyUse);
    gas.monthlyCost = pad12(gas.monthlyCost);

    return { electric, gas };
  };

  const getYear = (y) => normalizeYear(years[String(y)] || {});

  return {
    baseYear: forceBaseYear ? baseYear : base.baseYear || baseYear,
    years: {
      [String(y1)]: getYear(y1),
      [String(y2)]: getYear(y2),
    },
  };
}

/* =========================
   ✅ YearBlock
========================= */
const YearBlock = React.memo(function YearBlock({
  year,
  cur,
  commit,
  recalc,
  setYearDraft,
  isComposingRef,
}) {
  const onBlurAny = () => commit();
  const onKeyDownAny = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  const elec = cur?.electric || blankElectric();
  const gas = cur?.gas || blankGas();

  const setElectric = (patch) =>
    setYearDraft(year, { electric: { ...elec, ...patch } });
  const setGas = (patch) =>
    setYearDraft(year, { gas: { ...gas, ...patch } });

  const toggleGas = () => {
    const nextEnabled = !gas.enabled;

    if (!nextEnabled) {
      setGas({ ...blankGas(), enabled: false, unitLabel: gas.unitLabel || "Nm³" });
    } else {
      setGas({ ...gas, enabled: true, unitLabel: gas.unitLabel || "Nm³" });
    }
  };

  return (
    <Card title={`${year}년 에너지 사용/요금`}>
      <div css={hint} style={{ marginBottom: 10 }}>
        월별 입력 → “합계/단가 계산”으로 연간 합계/단가/toe 자동 산출
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 900, color: c.text }}>연료 선택</div>
        <div css={chips}>
          <button type="button" aria-pressed="true">
            전기(기본)
          </button>
          <button type="button" aria-pressed={!!gas.enabled} onClick={toggleGas}>
            가스 {gas.enabled ? "사용함" : "미사용"}
          </button>
        </div>
      </div>

      <div style={{ fontWeight: 900, marginBottom: 8 }}>전기</div>
      <div css={grid2}>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            월별 사용전력량 (kWh)
          </div>
          <div css={gridMonths}>
            {MONTHS.map((m, idx) => (
              <div key={`kwh-${year}-${m}`} css={row}>
                <div css={label}>{m}월</div>
                <input
                  css={input}
                  inputMode="numeric"
                  placeholder="kWh"
                  value={elec.monthlyKwh[idx] ?? ""}
                  onCompositionStart={() => (isComposingRef.current = true)}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    const next = elec.monthlyKwh.slice();
                    next[idx] = e.currentTarget.value;
                    setElectric({ monthlyKwh: next });
                  }}
                  onChange={(e) => {
                    if (isComposingRef.current) return;
                    const next = elec.monthlyKwh.slice();
                    next[idx] = e.target.value;
                    setElectric({ monthlyKwh: next });
                  }}
                  onBlur={onBlurAny}
                  onKeyDown={onKeyDownAny}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            월별 전기요금 (원)
          </div>
          <div css={gridMonths}>
            {MONTHS.map((m, idx) => (
              <div key={`ecost-${year}-${m}`} css={row}>
                <div css={label}>{m}월</div>
                <input
                  css={input}
                  inputMode="numeric"
                  placeholder="원"
                  value={elec.monthlyCost[idx] ?? ""}
                  onCompositionStart={() => (isComposingRef.current = true)}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    const next = elec.monthlyCost.slice();
                    next[idx] = e.currentTarget.value;
                    setElectric({ monthlyCost: next });
                  }}
                  onChange={(e) => {
                    if (isComposingRef.current) return;
                    const next = elec.monthlyCost.slice();
                    next[idx] = e.target.value;
                    setElectric({ monthlyCost: next });
                  }}
                  onBlur={onBlurAny}
                  onKeyDown={onKeyDownAny}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {gas.enabled && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 900 }}>가스</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div css={hint}>단위</div>
              <select
                css={input}
                style={{ height: 36, width: 160, textAlign: "left" }}
                value={gas.unitLabel || "Nm³"}
                onChange={(e) => setGas({ unitLabel: e.target.value })}
                onBlur={onBlurAny}
              >
                <option value="Nm³">Nm³</option>
                <option value="m³">m³</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>

          <div css={grid2} style={{ marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>
                월별 가스사용량 ({gas.unitLabel})
              </div>
              <div css={gridMonths}>
                {MONTHS.map((m, idx) => (
                  <div key={`gasuse-${year}-${m}`} css={row}>
                    <div css={label}>{m}월</div>
                    <input
                      css={input}
                      inputMode="numeric"
                      placeholder={gas.unitLabel}
                      value={gas.monthlyUse[idx] ?? ""}
                      onCompositionStart={() => (isComposingRef.current = true)}
                      onCompositionEnd={(e) => {
                        isComposingRef.current = false;
                        const next = gas.monthlyUse.slice();
                        next[idx] = e.currentTarget.value;
                        setGas({ monthlyUse: next });
                      }}
                      onChange={(e) => {
                        if (isComposingRef.current) return;
                        const next = gas.monthlyUse.slice();
                        next[idx] = e.target.value;
                        setGas({ monthlyUse: next });
                      }}
                      onBlur={onBlurAny}
                      onKeyDown={onKeyDownAny}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>
                월별 가스요금 (원)
              </div>
              <div css={gridMonths}>
                {MONTHS.map((m, idx) => (
                  <div key={`gascost-${year}-${m}`} css={row}>
                    <div css={label}>{m}월</div>
                    <input
                      css={input}
                      inputMode="numeric"
                      placeholder="원"
                      value={gas.monthlyCost[idx] ?? ""}
                      onCompositionStart={() => (isComposingRef.current = true)}
                      onCompositionEnd={(e) => {
                        isComposingRef.current = false;
                        const next = gas.monthlyCost.slice();
                        next[idx] = e.currentTarget.value;
                        setGas({ monthlyCost: next });
                      }}
                      onChange={(e) => {
                        if (isComposingRef.current) return;
                        const next = gas.monthlyCost.slice();
                        next[idx] = e.target.value;
                        setGas({ monthlyCost: next });
                      }}
                      onBlur={onBlurAny}
                      onKeyDown={onKeyDownAny}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button
          type="button"
          onClick={() => recalc(year)}
          style={{
            height: 38,
            padding: "0 12px",
            borderRadius: 10,
            border: `1px solid ${c.primary}`,
            background: "#fff",
            color: c.primary,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          합계/단가 계산
        </button>

        <div
          style={{
            flex: 1,
            minWidth: 260,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <div css={hint}>전기 연간 사용량(kWh)</div>
            <input css={input} value={elec.totalKwh ?? ""} readOnly />
          </div>
          <div>
            <div css={hint}>전기 연간 요금(원)</div>
            <input css={input} value={elec.totalCost ?? ""} readOnly />
          </div>
          <div>
            <div css={hint}>전기 단가(원/kWh)</div>
            <input css={input} value={elec.unitCostWonPerKwh ?? ""} readOnly />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          {year}년 toe(전기 환산)
        </div>
        <div css={hint} style={{ marginBottom: 6 }}>
          전기: 연간 사용량(kWh) 합계 × 0.229
        </div>
        <input css={input} value={elec.toe ?? ""} readOnly />
      </div>

      {gas.enabled && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            {year}년 가스 요약
          </div>
          <div css={hint} style={{ marginBottom: 6 }}>
            ✅ 가스 toe = 연간사용량 × 1.0190 (사용량 단위가 Nm³일 때 기준)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <div css={hint}>가스 연간 사용량({gas.unitLabel})</div>
              <input css={input} value={gas.totalUse ?? ""} readOnly />
            </div>
            <div>
              <div css={hint}>가스 연간 요금(원)</div>
              <input css={input} value={gas.totalCost ?? ""} readOnly />
            </div>
            <div>
              <div css={hint}>가스 단가(원/{gas.unitLabel})</div>
              <input css={input} value={gas.unitCostWonPerUnit ?? ""} readOnly />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div css={hint}>가스 toe</div>
            <input css={input} value={gas.toe ?? ""} readOnly />
          </div>
        </div>
      )}
    </Card>
  );
});

/* =========================
   ✅ Step
========================= */
export default function EnergyUsageStep({ value, onChange, baseYear }) {
  const effectiveBaseYear = baseYear ?? new Date().getFullYear(); // ✅ 2026 자동
  const y2 = effectiveBaseYear - 1; // 2025
  const y1 = effectiveBaseYear - 2; // 2024

  const normalizedFromProp = useMemo(
    () => normalizeEnergy(value, y1, y2, effectiveBaseYear, true),
    [value, y1, y2, effectiveBaseYear],
  );

  const [draft, setDraft] = useState(normalizedFromProp);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const isComposingRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setDraft(normalizedFromProp);
  }, [normalizedFromProp]);

  const commit = useCallback(() => {
    if (isComposingRef.current) return;
    dirtyRef.current = false;
    onChange?.(draftRef.current);
  }, [onChange]);

  /**
   * ✅ 입력 즉시 반영 (IME 제외)
   */
  const setYearDraft = useCallback(
    (year, patch) => {
      dirtyRef.current = true;

      setDraft((prev) => {
        const next = normalizeEnergy(prev, y1, y2, effectiveBaseYear, true);
        next.years[String(year)] = { ...next.years[String(year)], ...patch };

        if (!isComposingRef.current) {
          queueMicrotask(() => {
            dirtyRef.current = false;
            onChange?.(next);
          });
        }

        return next;
      });
    },
    [y1, y2, effectiveBaseYear, onChange],
  );

  /**
   * ✅ 합계/단가/toe 계산
   * - 전기 toe: kWh × 0.229
   * - 가스 toe: 사용량 × 1.0190  (요청 규칙)
   */
  const recalc = useCallback(
    (year) => {
      if (isComposingRef.current) return;

      let computedNext = null;

      setDraft((prev) => {
        const next = normalizeEnergy(prev, y1, y2, effectiveBaseYear, true);
        const cur = next.years[String(year)];

        const elec = cur.electric || blankElectric();
        const gas = cur.gas || blankGas();

        const sumKwh = elec.monthlyKwh.reduce((a, b) => a + num(b), 0);
        const sumCost = elec.monthlyCost.reduce((a, b) => a + num(b), 0);
        const unitCost = sumKwh > 0 ? sumCost / sumKwh : 0;
        const toeElec = sumKwh > 0 ? sumKwh * 0.229 : 0;

        const nextElectric = {
          ...elec,
          totalKwh: fmt0(sumKwh),
          totalCost: fmt0(sumCost),
          unitCostWonPerKwh: sumKwh > 0 ? unitCost.toFixed(2) : "0.00",
          toe: sumKwh > 0 ? toeElec.toFixed(2) : "0.00",
        };

        let nextGas = { ...gas };
        if (gas.enabled) {
          const sumUse = gas.monthlyUse.reduce((a, b) => a + num(b), 0);
          const sumGasCost = gas.monthlyCost.reduce((a, b) => a + num(b), 0);
          const unitGas = sumUse > 0 ? sumGasCost / sumUse : 0;

          // ✅ 가스 toe 규칙(요청): 연간사용량 × 1.0190
          const toeGas = sumUse > 0 ? sumUse * 1.019 : 0;

          nextGas = {
            ...gas,
            totalUse: fmt0(sumUse),
            totalCost: fmt0(sumGasCost),
            unitCostWonPerUnit: sumUse > 0 ? unitGas.toFixed(2) : "0.00",
            toe: sumUse > 0 ? toeGas.toFixed(2) : "0.00",
          };
        } else {
          nextGas = {
            ...blankGas(),
            enabled: false,
            unitLabel: gas.unitLabel || "Nm³",
          };
        }

        next.years[String(year)] = {
          ...cur,
          electric: nextElectric,
          gas: nextGas,
        };

        computedNext = next;
        return next;
      });

      queueMicrotask(() => {
        if (computedNext) {
          dirtyRef.current = false;
          onChange?.(computedNext);
        }
      });
    },
    [y1, y2, effectiveBaseYear, onChange],
  );

  const cur1 = draft.years[String(y1)];
  const cur2 = draft.years[String(y2)];

  return (
    <section>
      <Card title="에너지 사용현황 (최근 2년)">
        <div css={hint}>
          기준년도: {effectiveBaseYear}년 → 입력 대상: <b>{y1}년 / {y2}년</b>
        </div>
        <div css={hint} style={{ marginTop: 6 }}>
          ※ 입력값은 즉시 저장되며(IME 조합중 제외), blur/Enter/버튼에서도 최종 반영됩니다.
        </div>
      </Card>

      <YearBlock
        year={y1}
        cur={cur1}
        commit={commit}
        recalc={recalc}
        setYearDraft={setYearDraft}
        isComposingRef={isComposingRef}
      />
      <YearBlock
        year={y2}
        cur={cur2}
        commit={commit}
        recalc={recalc}
        setYearDraft={setYearDraft}
        isComposingRef={isComposingRef}
      />
    </section>
  );
}
