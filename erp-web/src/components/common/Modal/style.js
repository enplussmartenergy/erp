import { css } from "@emotion/react";

const card = "#fff", line="#E5E7EB", shadow="0 12px 32px rgba(2,12,27,.18)";

export const backdrop = css`
  position: fixed; inset: 0; background: rgba(15,23,42,.35);
  display: grid; place-items: center; z-index: 50;
`;
export const sheet = css`
  width: 520px; max-width: calc(100vw - 2rem);
  background: ${card}; border: 1px solid ${line}; border-radius: 16px;
  box-shadow: ${shadow}; overflow: hidden;
`;
export const head = css`
  display:flex; align-items:center; justify-content:space-between;
  padding: 14px 16px; font-weight: 800; border-bottom: 1px solid ${line};
`;
export const body = css` padding: 16px; display:grid; gap: 12px; `;
export const foot = css` padding: 12px 16px; display:flex; gap: 8px; justify-content:flex-end; border-top:1px solid ${line}; `;
export const xBtn = css`
  width:32px;height:32px;border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;
`;
