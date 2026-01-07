/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { tokens as T } from "@/styles";

const chip = css`
  display:inline-flex; align-items:center; gap:8px; padding:6px 10px;
  border:1px solid ${T.colors.line}; border-radius:999px; background:#fff; margin-right:6px;
  input{ width:16px; height:16px; }
`;

export default function RadioChip({ name, checked, label, onChange }) {
  return (
    <label css={chip}>
      <input type="radio" name={name} checked={checked} onChange={onChange}/>
      {label}
    </label>
  );
}
