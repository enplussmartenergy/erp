/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const wrap = css`
  position: fixed; inset: 0; background: #fff; z-index: 1000;
  display: grid; grid-template-rows: 48px 1fr;
`;

export const bar = css`
  display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid #e5e7eb;
  & button{ height:34px; padding:0 12px; border-radius:8px; border:1px solid #2563eb; background:#2563eb; color:#fff; font-weight:800; }
  & .ghost{ background:#fff; color:#2563eb; }
`;

export const loading = css`
  display:grid; place-items:center; font-weight:800; color:#334155;
`;
