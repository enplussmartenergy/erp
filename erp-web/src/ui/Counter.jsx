/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { tokens as T } from "@/styles";
import { useMemo } from "react";

const wrap = css`display:inline-flex; align-items:center; gap:6px;`;
const btn  = css`
  width:36px;height:36px;border-radius:10px;background:#fff;
  border:2px solid ${T.colors.text}; font-weight:800;
  &:disabled{opacity:.4;}
`;
const input = css`
  width:56px;height:36px;text-align:center;border:1px solid ${T.colors.line};border-radius:10px;background:#fff;
`;

export default function Counter({ value=0, disabled, onChange }) {
  const dec = () => onChange(Math.max(0, Number(value) - 1));
  const inc = () => onChange(Number(value) + 1);
  const set = (e) => onChange(Math.max(0, Number(e.target.value || 0)));
  return (
    <span css={wrap}>
      <button css={btn} type="button" onClick={dec} disabled={disabled}>-</button>
      <input css={input} type="number" min={0} value={value} onChange={set} disabled={disabled}/>
      <button css={btn} type="button" onClick={inc} disabled={disabled}>+</button>
    </span>
  );
}
