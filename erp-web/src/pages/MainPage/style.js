import { css, keyframes } from '@emotion/react';

export const main = css`
  --container: min(75rem, 92vw);   /* 1200px */
  --radius: 1rem;                  /* 16px */
  --card: #ffffff;
  --border: rgba(0,0,0,.08);
  --muted: #6b7280;
`;

export const container = css`
  max-width: var(--container);
  margin: 0 auto;
  padding: 0 1.25rem;              /* 20px */
`;

export const section = css`
  padding: 2rem 0 3.5rem;          /* 32px 0 56px */
  h2 { margin: 0 0 0.5rem; font-size: clamp(1.5rem, 2.2vw, 2rem); text-align: center; } /* 24~32px */
`;
export const sectionSub = css`text-align:center; color:var(--muted); margin-bottom:1.25rem;`; /* 20px */

/* Hero */
export const hero = css``; /* 유지: 섹션 내부에서 container 사용 */
export const heroGrid = css`
  display:grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.75rem;                    /* 28px */
  align-items:center;
  @media (max-width: 56.25rem){    /* 900px */
    grid-template-columns: 1fr;
  }
`;

export const heroText = css`
  h1{
    font-size: clamp(2rem, 3.5vw, 2.75rem);  /* 32~44px (조금 키움) */
    line-height: 1.2; margin: 0 0 0.875rem; letter-spacing: -0.02rem;
  }
  p{ color: var(--muted); font-size: 1.0625rem; margin: 0 0 1.375rem; } /* 17px, 22px */
`;

export const cta = css`display:flex; gap:0.75rem; flex-wrap:wrap;`; /* 12px */

const float = keyframes`
  0% { transform: translateY(0) }
  50% { transform: translateY(-0.375rem) }   /* 6px */
  100% { transform: translateY(0) }
`;

export const btnPrimary = css`
  display:inline-flex; align-items:center; justify-content:center;
  padding:0.75rem 1rem;            /* 12px 16px */
  border-radius:0.75rem;           /* 12px */
  background: linear-gradient(135deg,#3b82f6,#2563eb);
  color:#fff; text-decoration:none; font-weight:700;
  box-shadow: 0 0.5rem 1.5rem rgba(37,99,235,.25); /* 8px 24px */
  transition: transform .15s ease, filter .15s ease;
  &:hover { filter:brightness(1.05); transform: translateY(-0.0625rem); } /* 1px */
  &:active { transform: translateY(0); }
  &:focus-visible { outline:0.1875rem solid rgba(37,99,235,.35); outline-offset:0.125rem; } /* 3px/2px */
  @media (max-width:30rem){ width:100%; } /* 480px */
`;

export const btnGhost = css`
  display:inline-flex; align-items:center; justify-content:center;
  padding:0.75rem 1rem; border-radius:0.75rem;
  border:0.0625rem solid var(--border);
  background:transparent; color:#111; text-decoration:none;
  transition: background .15s ease, transform .15s ease;
  &:hover { background: rgba(0,0,0,.04); transform: translateY(-0.0625rem); }
  &:active { transform: translateY(0); }
  &:focus-visible { outline:0.1875rem solid rgba(0,0,0,.1); outline-offset:0.125rem; }
  @media (max-width:30rem){ width:100%; }
`;

export const heroArt = css`display:flex; align-items:center; justify-content:center;`;

export const mockCard = css`
  width: min(32.5rem, 100%);        /* 520px */
  height: 16.25rem;                 /* 260px */
  border-radius: 1.125rem;          /* 18px */
  background:
    radial-gradient(56.25rem 15.625rem at -10% 0%, rgba(59,130,246,.20), transparent 60%),
    radial-gradient(50rem 16.25rem at 110% 100%, rgba(147,197,253,.18), transparent 60%),
    #f8fafc;
  border: 0.0625rem solid var(--border);
  box-shadow: 0 1rem 2.5rem rgba(0,0,0,.08); /* 16px 40px */
  animation: ${float} 6s ease-in-out infinite;
`;

/* Features */
export const features = css`
  display:grid; gap:1rem;           /* 16px */
  grid-template-columns: repeat(3, 1fr);
  @media (max-width:56.25rem){ grid-template-columns:1fr; } /* 900px */
`;
export const featureCard = css`
  background: var(--card);
  border: 0.0625rem solid var(--border);
  border-radius: var(--radius);
  padding: 1.125rem 1rem;           /* 18px 16px */
  box-shadow: 0 0.375rem 1.375rem rgba(0,0,0,.06); /* 6px 22px */
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  &:hover {
    transform: translateY(-0.25rem); /* 4px */
    box-shadow: 0 1rem 2.25rem rgba(0,0,0,.10);   /* 16px 36px */
    border-color: rgba(0,0,0,.12);
  }
  h3 { margin: 0.625rem 0 0.375rem; font-size:1.0625rem; } /* 10px 6px / 17px */
  p { color: var(--muted); font-size: 0.9375rem; margin: 0; } /* 15px */
`;
export const featureIcon = css`
  width: 2.25rem; height: 2.25rem;  /* 36px */
  border-radius: 0.625rem;          /* 10px */
  display:grid; place-items:center;
  background: rgba(59,130,246,.12);
  color:#3b82f6;
`;

/* Logos */
export const logos = css`
  display:grid; gap:1rem; grid-template-columns: repeat(4, 1fr);
  @media (max-width:56.25rem){ grid-template-columns: repeat(2, 1fr); }
`;
export const logoCard = css`
  background: var(--card);
  border: 0.0625rem solid var(--border);
  border-radius: 0.875rem;          /* 14px */
  padding: 0.875rem;
`;
export const logoPlaceholder = css`
  height: 5.25rem;                  /* 84px */
  border-radius: 0.625rem;          /* 10px */
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
  border: 0.0625rem dashed rgba(0,0,0,.12);
  display:grid; place-items:center; color:#6b7280; font-size:0.75rem; /* 12px */

`;
export const logoName = css`margin-top: 0.5rem; color:#2b2f36; font-size:0.8125rem;`; /* 13px */
