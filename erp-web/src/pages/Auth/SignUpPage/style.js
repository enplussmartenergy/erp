/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

/* ── Design Tokens (Compact) ───────────────────────────── */
const color = {
  primary:  "#2563EB",
  ring:     "rgba(37,99,235,.18)",
  text:     "#0F172A",
  muted:    "#6B7280",
  line:     "#E5E7EB",
  soft:     "#F9FAFB",
  card:     "#FFFFFF",
  success:  "#16A34A",
};
const radius = ".7rem";
const shadow = "0 .5rem 1.4rem rgba(2,12,27,.06)";

/* ⬇️ 최대폭 96rem → 80rem 로 줄임 */
export const page = css`
  max-width: 80rem;
  margin: 0 auto;
  padding: 2.4rem 1.6rem 5.2rem;
`;

/* 제목/부제 살짝 축소 */
export const title = css`
  font-size: 2.4rem;       /* 3.0 → 2.4 */
  font-weight: 800;
  letter-spacing: -.02em;
  color: ${color.text};
  margin: 0 0 .8rem;       /* 1.2 → .8 */
`;

export const subtitle = css`
  font-size: 1.35rem;      /* 1.5 → 1.35 */
  color: ${color.muted};
  margin-bottom: 1.8rem;   /* 2.4 → 1.8 */
`;

/* 스텝퍼 높이/여백 축소 */
export const stepper = css`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;              /* 1.0 → .8 */
  margin-bottom: 1.8rem;   /* 2.4 → 1.8 */
`;

export const step = (active, done) => css`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;              /* .8 → .6 */
  height: 3.6rem;          /* 4.2 → 3.6 */
  border-radius: ${radius};
  background: ${active ? color.soft : "#fff"};
  border: .1rem solid ${active || done ? color.primary : color.line};
  color: ${active || done ? color.primary : color.muted};
  font-weight: 700;
  transition: background .2s, color .2s, border-color .2s, box-shadow .2s;
  ${active ? `box-shadow: 0 0 0 .26rem ${color.ring};` : ""}
  & > .badge {
    width: 1.9rem; height: 1.9rem; /* 2.1 → 1.9 */
    border-radius: 50%;
    display: grid; place-items: center;
    font-size: 1.1rem;  /* 1.2 → 1.1 */
    font-weight: 800;
    background: ${done ? color.success : (active ? color.primary : "#fff")};
    color: ${done || active ? "#fff" : color.muted};
    border: .1rem solid ${done || active ? "transparent" : color.line};
  }
`;

/* 카드/섹션 패딩 축소 */
export const section = css`
  background: ${color.card};
  border: .1rem solid ${color.line};
  border-radius: ${radius};
  box-shadow: ${shadow};
`;

export const sectionHead = css`
  padding: 1.2rem 1.6rem;   /* 1.6/2.0 → 1.2/1.6 */
  border-bottom: .1rem solid ${color.line};
  font-weight: 800;
  color: ${color.text};
`;

export const form = css`
  padding: 1.6rem;          /* 2.0 → 1.6 */
  display: grid;
  row-gap: 1.2rem;          /* 1.6 → 1.2 */
`;

/* 그리드 간격 축소 */
export const grid2 = css`
  display: grid;
  gap: 1rem 1.2rem;         /* 1.2 / 1.6 → 1.0 / 1.2 */
  grid-template-columns: repeat(2, 1fr);
  @media (max-width: 860px) { grid-template-columns: 1fr; }
`;

/* 라벨/인풋 사이즈 축소 */
export const field = css`
  display: grid;
  row-gap: .5rem;           /* .6 → .5 */
`;

export const label = css`
  font-size: 1.25rem;       /* 1.35 → 1.25 */
  color: ${color.text};
  font-weight: 700;
`;

export const hint = css`
  font-size: 1.15rem;       /* 1.2 → 1.15 */
  color: ${color.muted};
`;

export const input = css`
  height: 4rem;             /* 4.4 → 4.0 */
  padding: 0 1.0rem;        /* 1.2 → 1.0 */
  border-radius: .6rem;     /* .7 → .6 */
  background: #fff;
  border: .1rem solid ${color.line};
  font-size: 1.35rem;       /* 1.45 → 1.35 */
  transition: border-color .15s, box-shadow .15s;
  &::placeholder { color: #98A2B3; }
  &:focus {
    outline: none;
    border-color: ${color.primary};
    box-shadow: 0 0 0 .3rem ${color.ring}; /* .35 → .3 */
  }
`;

/* 입력+버튼 묶음 간격 축소 */
export const inputWrap = css`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: .6rem;               /* .8 → .6 */
`;

/* 버튼 사이즈/여백 축소 */
export const btn = css`
  height: 3.8rem;           /* 4.2 → 3.8 */
  padding: 0 1.4rem;        /* 1.6 → 1.4 */
  border-radius: .6rem;
  border: .1rem solid ${color.primary};
  background: ${color.primary};
  color: #fff;
  font-weight: 800;
  font-size: 1.3rem;        /* 1.4 → 1.3 */
  &:disabled { opacity: .55; cursor: not-allowed; }
`;
export const btnGhost = css`
  ${btn};
  background: #fff;
  color: ${color.primary};
`;

export const actions = css`
  margin-top: 1.2rem;       /* 1.6 → 1.2 */
  display: flex;
  gap: .8rem;               /* 1.0 → .8 */
  justify-content: center;
`;

/* 약관/주소 박스도 컴팩트 */
export const termsBox = css`
  ${section};
  padding: 1.4rem 1.6rem;   /* 1.6/2.0 → 1.4/1.6 */
  display: grid;
  row-gap: 1rem;            /* 1.2 → 1.0 */
`;
export const termRow = css`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: .8rem;               /* 1.0 → .8 */
  font-size: 1.25rem;       /* 1.35 → 1.25 */
  color: ${color.text};
`;
export const linkSm = css`
  font-size: 1.15rem;       /* 1.25 → 1.15 */
  color: ${color.primary};
  text-decoration: underline;
`;

/* 주소 3열 폭도 소폭 축소 */
export const addrGrid = css`
  display: grid;
  gap: .6rem;               /* .8 → .6 */
  grid-template-columns: 14rem auto 11rem;  /* 16 / auto / 12 → 14 / auto / 11 */
  @media (max-width: 860px) { grid-template-columns: 1fr; }
`;
