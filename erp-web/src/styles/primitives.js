/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { tokens as t } from "./tokens";

export const card = css`
  background: ${t.card};
  border: 1px solid ${t.line};
  border-radius: ${t.radius}px;
  padding: ${t.space}px ${t.space + 6}px;
  
`;

export const groupTitle = css`
  display:flex; align-items:center; gap:.6rem;
  font-weight:800; color:${t.text}; margin:.1rem 0 10px;
  .dot{ width:.55rem; height:.55rem; border-radius:999px; background:${t.primary}; }
  .sub{ color:${t.muted}; font-weight:600; font-size:1.05rem; margin-left:.4rem; }
`;

export const grid2 = css`
  display:grid; gap:.9rem 1rem; grid-template-columns:1fr 1fr;
  @media (max-width:900px){ grid-template-columns:1fr; }
`;

export const inputBase = css`
  height:3.2rem; border:1px solid ${t.line}; border-radius:.8rem; background:#fff;
  padding:0 1rem; width:100%; box-sizing:border-box; font-size:1rem;
  &:focus{ outline:none; border-color:${t.primary}; box-shadow:0 0 0 .32rem ${t.ring}; }
`;

export const label = css` font-weight:700; color:${t.text}; margin-bottom:.35rem; `;
export const row = css` display:grid; gap:.6rem; `;
export const hint = css` color:${t.muted}; font-size:.9rem; `;
export const pill = css`
  height:2.6rem; padding:0 .9rem; border-radius:999px; border:1px solid ${t.primary};
  background:${t.primary}; color:#fff; font-weight:800;
`;
export const pillGhost = css`${pill}; background:#fff; color:${t.primary};`;
