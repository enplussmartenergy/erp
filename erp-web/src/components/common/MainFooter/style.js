import { css } from '@emotion/react';

export const wrap = css`
  border-top: 0.0625rem solid rgba(0,0,0,.06); /* 1px */
  background:#0b0c0f; color:#a9b1bd;
`;

export const container = css`
  max-width: min(75rem, 92vw);
  margin: 0 auto;
  padding: 2rem 1.25rem;           /* 32px 20px */
  display:flex; justify-content:space-between; gap:0.75rem; flex-wrap:wrap;
  font-size:0.9375rem;             /* 15px */
`;

export const links = css`
  display:flex; gap:1rem;
  a{ color:#a9b1bd; text-decoration:none; }
  a:hover{ color:#fff; }
`;
