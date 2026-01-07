/** @jsxImportSource @emotion/react */
import { label as l, row } from "../styles/primitives";

export default function Field({ label, hint, children }) {
  return (
    <div css={row}>
      {label && <label css={l}>{label}</label>}
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}
