/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { tokens as t } from "../styles/tokens";

const group = css` display:flex; flex-wrap:wrap; gap:6px; `;
const btn = css`
  height:34px; padding:0 12px; border-radius:999px; border:1px solid ${t.line}; background:#fff; font-weight:800;
  &[data-active="true"]{ border-color:${t.primary}; color:${t.primary}; background:rgba(37,99,235,.06); }
`;

export default function Segmented({ value, options, onChange }) {
  return (
    <div css={group}>
      {options.map(opt => (
        <button key={opt} css={btn} data-active={value===opt} onClick={()=>onChange(opt)} type="button">{opt}</button>
      ))}
    </div>
  );
}
