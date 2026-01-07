import { css } from "@emotion/react";

const c = {
  primary: "#2563EB",
  line: "#E5E7EB",
  text: "#0F172A",
  muted: "#64748B",
  ring: "rgba(37,99,235,.18)",
};

export const wrap = css`
  max-width: 36rem;          /* 32 → 36 : 인풋 가로 길이만 살짝 넓힘 */
  margin: 4rem auto 6rem;    /* 상/하 여백 그대로 */
  padding: 1.6rem 1.2rem;    /* 컴팩트한 패딩 유지 */
`;

export const title = css`
  font-size: 2rem;
  font-weight: 800;
  color: ${c.text};
  margin-bottom: 1.2rem;
`;

export const form = css`
  display: grid;
  gap: 1.0rem;
`;

export const group = css`
  display: grid;
  gap: 0.55rem;

  label {
    font-size: 1.15rem;
    color: ${c.muted};
    font-weight: 700;
  }

  input {
    height: 3.6rem;
    padding: 0 1rem;
    border: 1px solid ${c.line};
    border-radius: 0.8rem;
    font-size: 1.2rem;
    transition: border-color .15s, box-shadow .15s;

    &:focus {
      outline: none;
      border-color: ${c.primary};
      box-shadow: 0 0 0 .28rem ${c.ring};
    }
  }
`;

export const primaryBtn = css`
  height: 3.6rem;
  border: 1px solid ${c.primary};
  border-radius: 0.8rem;
  background: ${c.primary};
  color: #fff;
  font-weight: 800;
  font-size: 1.25rem;
  margin-top: 0.4rem;
  transition: background .15s, border-color .15s, transform .02s;

  &:hover { background: #1d4ed8; border-color: #1d4ed8; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .55; cursor: not-allowed; }
`;

export const foot = css`
  margin-top: 0.9rem;
  display: flex;
  gap: 0.6rem;
  font-size: 1.1rem;
  color: ${c.muted};

  a {
    color: ${c.primary};
    font-weight: 700;
    text-decoration: underline;
  }
`;
