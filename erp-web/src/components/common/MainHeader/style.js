import { css } from '@emotion/react';

export const wrap = css`
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: saturate(180%) blur(0.5rem);
  background: rgba(255,255,255,.6);
  border-bottom: 0.0625rem solid rgba(0,0,0,.06); /* 1px */
  transition: background .2s ease, box-shadow .2s ease, border-color .2s ease;
`;
export const scrolled = css`
  background: rgba(255,255,255,.95);
  box-shadow: 0 0.25rem 1.125rem rgba(0,0,0,.06); /* 4px 18px */
  border-color: transparent;
`;

export const container = css`
  max-width: min(75rem, 92vw);     /* 1200px */
  margin: 0 auto;
  padding: 0.875rem 1.25rem;       /* 14px 20px */
  display: flex; align-items: center; justify-content: space-between;
`;

export const brand = css`display:flex; align-items:center; gap:0.5rem; text-decoration:none;`;

export const brandMark = css`
  display: inline-flex;
  align-items: center;

  /* 로고 사이즈 ↓ (높이 기준으로만 조절) */
  img {
    height: 5.5rem;     /* 32px 정도 */
    width: auto;      /* 비율 유지 */
    display: block;   /* 라인박스 흔들림 방지 */
  }

  /* 모바일에선 조금 더 작게 */
  @media (max-width: 40rem) { /* 640px */
    img { height: 1.5rem; }   /* 24px */
  }
`;

export const nav = css`
  display:flex; align-items:center; gap:1.125rem; /* 18px */
  a{ color:#475569; font-size:1rem; text-decoration:none; } /* 16px */
  a:hover{ color:#0f172a; }
`;
export const signup = css`
  padding:0.5rem 0.875rem;         /* 8px 14px */
  border-radius:0.625rem;          /* 10px */
  background:#3466f6; color:#fff !important;
  &:hover{ filter:brightness(1.06); }
`;
