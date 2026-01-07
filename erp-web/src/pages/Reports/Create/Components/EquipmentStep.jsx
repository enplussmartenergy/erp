/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useMemo, useState, Fragment } from "react";
import AHUForm from "../../../../features/report/AHUForm";
import { EQUIP_TYPES, getSchema } from "../../../../domain/equipment/registry";

/* styles */
const card = css`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(2, 12, 27, 0.06);
  overflow: hidden;
  min-width: 0;
`;
const head = css`
  padding: 14px 16px;
  font-weight: 800;
  border-bottom: 1px solid #e5e7eb;
`;
const table = css`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 0;

  & th,
  & td {
    padding: 12px 14px;
  }
  & thead th {
    text-align: left;
    color: #0f172a;
    font-weight: 800;
    background: #fafafa;
  }
  & tbody tr.main + tr.detail td {
    border-top: 1px dashed #e5e7eb;
  }
`;
const countBox = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  & > button {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #fff;
    border: 2px solid #0f172a;
    font-weight: 800;
  }
  & > input {
    width: 56px;
    height: 36px;
    text-align: center;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
  }
`;
const btn = css`
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-weight: 800;
  border: 1px solid #2563eb;
  background: #fff;
  color: #2563eb;
`;
const btnPrimary = css`
  ${btn};
  background: #2563eb;
  color: #fff;
`;
const chip = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  & input {
    width: 16px;
    height: 16px;
  }
`;
const detailCell = css`
  padding: 0 !important;
  background: #f8fafc;
`;
const detailWrap = css`
  padding: 14px;
  min-width: 0;
`;
const detailBox = css`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  min-width: 0;
`;

/* ✅ 공통 상세 입력 필드 */
const rowGrid = css`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  align-items: center;
  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;
const rowGrid2 = css`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
`;
const input = css`
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
  }
`;

/* helpers */
const blankDetail = () => ({
  // ✅ 새 표준 키
  equipName: "", // 설비명(호기별)
  purpose: "", // 용도

  engineer: "", // 점검자
  dateTxt: "", // 점검일자(표시용 문자열)
  location: "", // 설치위치

  // ✅ 레거시 호환(남아있어도 깨지지 않게)
  model: "",
  use: "",
});

const normalizeRow = (row, type) => ({
  key: type.key,
  label: type.label,
  owned: !!row?.owned,
  count: Math.max(0, Number(row?.count || 0)),
  details: Array.isArray(row?.details) ? row.details : [],
});

/**
 * ✅ 핵심 수정:
 * - 장비 목록이 안 뜨는 이유의 대부분은 EQUIP_TYPES가 비었기 때문
 * - EQUIP_TYPES가 비면 getSchema 기반으로 fallback 목록을 만든다.
 */
const FALLBACK_KEYS = [
  "airComp",
  "packageAc",
  "pumpChw",
  "coolTower",
  "heatEx",
  "pipe",
  "coldHot",
  "vent",
  "sanitaryFixture",
  "fcu",
  // 필요하면 여기 추가
];

function buildTypesSafe() {
  const has = Array.isArray(EQUIP_TYPES) && EQUIP_TYPES.length > 0;
  if (has) return EQUIP_TYPES;

  const out = [];
  for (const key of FALLBACK_KEYS) {
    const s = typeof getSchema === "function" ? getSchema(key) : null;
    if (s?.key) out.push({ key: s.key, label: s.label || s.key });
    else out.push({ key, label: key });
  }
  return out;
}

function normalizeDetail(value) {
  const v = { ...blankDetail(), ...(value || {}) };

  // ✅ 레거시 -> 신규 키 마이그레이션
  if (!v.equipName && v.model) v.equipName = v.model;
  if (!v.purpose && v.use) v.purpose = v.use;

  return v;
}

function resizeDetails(arr = [], nextLen) {
  const next = Array.isArray(arr) ? arr.slice(0, nextLen) : [];
  while (next.length < nextLen) next.push(blankDetail());
  return next.map((x) => normalizeDetail(x));
}

function DetailEditor({ eqKey, value, onChange }) {
  // ✅ AHU는 전용 폼(기존 유지)
  if (eqKey === "airComp") return <AHUForm value={value} onChange={onChange} />;

  const v = normalizeDetail(value);

  return (
    <div css={rowGrid2}>
      <div css={rowGrid}>
        <input
          css={input}
          placeholder="설비명 (예: 패키지 에어컨 1호기)"
          value={v.equipName}
          onChange={(e) => onChange(normalizeDetail({ ...v, equipName: e.target.value }))}
        />

        <input
          css={input}
          placeholder="점검자"
          value={v.engineer}
          onChange={(e) => onChange(normalizeDetail({ ...v, engineer: e.target.value }))}
        />

        <input
          css={input}
          placeholder="점검일자 (예: 2026.01.07)"
          value={v.dateTxt}
          onChange={(e) => onChange(normalizeDetail({ ...v, dateTxt: e.target.value }))}
        />
      </div>

      <div css={rowGrid}>
        <input
          css={input}
          placeholder="용도"
          value={v.purpose}
          onChange={(e) => onChange(normalizeDetail({ ...v, purpose: e.target.value }))}
        />

        <input
          css={input}
          placeholder="설치위치"
          value={v.location}
          onChange={(e) => onChange(normalizeDetail({ ...v, location: e.target.value }))}
        />

        {/* 3열 맞추기용(모바일에선 1열로 내려감) */}
        <div />
      </div>
    </div>
  );
}

/* main */
export default function EquipmentStep({ equipments, setEquipments }) {
  const types = useMemo(() => buildTypesSafe(), []);
  const rows = useMemo(() => {
    const list = Array.isArray(equipments) ? equipments : [];
    return types.map((t) => {
      const found = list.find((r) => r?.key === t.key);
      return normalizeRow(found, t);
    });
  }, [equipments, types]);

  const [expanded, setExpanded] = useState(null); // key | null

  const patch = (key, patchObj) => {
    setEquipments((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const base = types.map((t) => {
        const found = prevList.find((r) => r?.key === t.key);
        return normalizeRow(found, t);
      });

      const next = base.map((r) => (r.key === key ? { ...r, ...patchObj } : r));

      // ✅ details는 항상 normalize(레거시 키 포함되어도 신규 키로 보정)
      return next.map((r) =>
        r.key === key && Array.isArray(r.details)
          ? { ...r, details: r.details.map((d) => normalizeDetail(d)) }
          : r
      );
    });
  };

  const setOwned = (row, owned) => {
    if (!owned) {
      patch(row.key, { owned: false, count: 0, details: [] });
      setExpanded(null);
      return;
    }

    const nextCount = row.count > 0 ? row.count : 1;
    patch(row.key, {
      owned: true,
      count: nextCount,
      details: resizeDetails(row.details, nextCount),
    });
  };

  const setCount = (row, value) => {
    const n = Math.max(0, Number(value) || 0);
    patch(row.key, { count: n, details: resizeDetails(row.details, n) });
    if (n === 0 && expanded === row.key) setExpanded(null);
  };

  const openDetail = (row) => {
    const mustOwn = !row.owned;
    const mustCount = row.count === 0;

    if (mustOwn || mustCount) {
      const newCount = mustCount ? 1 : row.count;
      patch(row.key, {
        owned: true,
        count: newCount,
        details: resizeDetails(row.details, newCount),
      });
    }
    setExpanded(expanded === row.key ? null : row.key);
  };

  return (
    <section css={card}>
      <div css={head}>설비 현황</div>

      <table css={table}>
        <thead>
          <tr>
            <th style={{ width: 160 }}>설비명</th>
            <th style={{ width: 240 }}>보유여부</th>
            <th style={{ width: 220 }}>수량</th>
            <th style={{ width: 140 }}>상세입력</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const dec = () => setCount(row, row.count - 1);
            const inc = () => setCount(row, row.count + 1);

            return (
              <Fragment key={row.key}>
                <tr className="main">
                  <td>{row.label}</td>

                  <td>
                    <label css={chip}>
                      <input
                        type="radio"
                        name={`own-${row.key}`}
                        checked={!!row.owned}
                        onChange={() => setOwned(row, true)}
                      />
                      보유
                    </label>
                    &nbsp;&nbsp;
                    <label css={chip}>
                      <input
                        type="radio"
                        name={`own-${row.key}`}
                        checked={!row.owned}
                        onChange={() => setOwned(row, false)}
                      />
                      미보유
                    </label>
                  </td>

                  <td>
                    <div css={countBox}>
                      <button type="button" onClick={dec} disabled={!row.owned}>
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={row.count}
                        onChange={(e) => setCount(row, e.target.value)}
                        disabled={!row.owned}
                      />
                      <button type="button" onClick={inc} disabled={!row.owned}>
                        +
                      </button>
                    </div>
                  </td>

                  <td>
                    <button
                      type="button"
                      css={expanded === row.key ? btnPrimary : btn}
                      onClick={() => openDetail(row)}
                      disabled={!row.owned}
                    >
                      상세입력
                    </button>
                  </td>
                </tr>

                {expanded === row.key && row.owned && (
                  <tr className="detail">
                    <td css={detailCell} colSpan={4}>
                      <div css={detailWrap}>
                        <DetailList
                          eqKey={row.key}
                          items={resizeDetails(row.details, row.count)}
                          onChange={(idx, val) => {
                            const next = resizeDetails(row.details, row.count);
                            next[idx] = normalizeDetail(val);
                            patch(row.key, { details: next });
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function DetailList({ eqKey, items, onChange }) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} css={detailBox}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            {i + 1}번 {labelOf(eqKey)} 상세
          </div>
          <DetailEditor eqKey={eqKey} value={it || {}} onChange={(v) => onChange(i, v)} />
        </div>
      ))}
    </div>
  );
}

function labelOf(k) {
  const f = Array.isArray(EQUIP_TYPES) ? EQUIP_TYPES.find((t) => t.key === k) : null;
  if (f?.label) return f.label;

  const s = typeof getSchema === "function" ? getSchema(k) : null;
  return s?.label ?? k;
}
