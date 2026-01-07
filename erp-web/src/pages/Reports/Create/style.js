/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const c = {
  primary: "#2563EB",
  ring: "rgba(37,99,235,.18)",
  line: "#E5E7EB",
  text: "#0F172A",
  muted: "#64748B",
  soft: "#F9FAFB",
};

const shadow = "0 10px 24px rgba(2,12,27,.06)";
const radius = "12px";

/* layout */
export const page = css`
  max-width: 1080px;
  padding: 28px 18px 60px;
  margin: 0 auto;
`;
export const h1 = css`font-size:28px;font-weight:900;color:${c.text};margin:0 0 6px;`;
export const h2 = css`font-size:22px;font-weight:900;color:${c.text};margin:0;`;
export const sub = css`color:${c.muted};margin:0 0 16px;`;
export const hint = css`color:${c.muted};font-size:14px;`;

/* stepper */
export const stepper = css`
  display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 18px;
  @media (max-width:860px){grid-template-columns:repeat(2,1fr);}
`;
export const step = (active, done)=>css`
  display:grid;place-items:center;height:44px;border-radius:12px;
  border:1px solid ${active||done?c.primary:c.line};
  color:${active||done?c.primary:c.muted};
  background:${active?c.soft:"#fff"};
  font-weight:800;${active?`box-shadow:0 0 0 6px ${c.ring};`:``}
`;

/* buttons */
export const btn = css`
  height:42px;padding:0 18px;border-radius:12px;border:1px solid ${c.primary};
  background:${c.primary};color:#fff;font-weight:800;
  &:disabled{opacity:.55;cursor:not-allowed;}
`;
export const btnGhost = css`${btn};background:#fff;color:${c.primary};`;

/* containers */
export const section = css`
  background:#fff;border:1px solid ${c.line};border-radius:${radius};box-shadow:${shadow};
  padding:16px; overflow:hidden;
`;
export const card = css`
  background:#fff;border:1px solid ${c.line};border-radius:${radius};box-shadow:${shadow};
  min-width:0; overflow:hidden;
`;
export const cardHead = css`
  padding:12px 14px;border-bottom:1px solid ${c.line};font-weight:800;color:${c.text};
`;

/* form */
export const form = css`display:grid;gap:12px;`;
export const row = css`
  display:grid;gap:10px;grid-template-columns:12rem 1fr;align-items:center;
  @media (max-width:720px){grid-template-columns:1fr;}
`;
export const grid2 = css`
  display:grid;gap:12px;grid-template-columns:1fr 1fr;
  @media (max-width:860px){grid-template-columns:1fr;}
`;
export const label = css`font-weight:800;color:${c.text};`;
export const input = css`
  height:40px;border:1px solid ${c.line};border-radius:10px;background:#fff;padding:0 12px;font-size:14px;
  width:100%; min-width:0; box-sizing:border-box;
  &:focus{outline:none;border-color:${c.primary};box-shadow:0 0 0 4px ${c.ring};}
`;
export const textarea = css`${input};height:100px;padding:10px 12px;resize:vertical;`;

/* table */
export const tableWrap = css`border:1px solid ${c.line};border-radius:10px;overflow:auto;`;
export const table = css`
  width:100%;border-collapse:separate;border-spacing:0;
  & thead th{position:sticky;top:0;background:#fff;padding:10px 12px;border-bottom:1px solid ${c.line};font-weight:800;color:${c.text};text-align:left;}
  & tbody td{padding:10px 12px;border-top:1px solid ${c.line};}
`;

/* actions */
export const actions = css`margin-top:16px;display:flex;gap:10px;justify-content:center;`;
