/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { tokens as T } from "@/styles";

const base = css`
  height:38px; padding:0 14px; border-radius:10px; font-weight:800;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
`;

const variants = {
  primary: css`${base}; background:${T.colors.primary}; color:#fff; border:1px solid ${T.colors.primary};`,
  outline: css`${base}; background:#fff; color:${T.colors.primary}; border:1px solid ${T.colors.primary};`,
  ghost:   css`${base}; background:#fff; color:${T.colors.text}; border:1px solid ${T.colors.line};`,
};

export default function Button({ variant="primary", ...props }) {
  return <button css={variants[variant] || variants.primary} {...props} />;
}
