import { css } from '@emotion/react';

export const wrap = css`
  /* 섹션이 세로로 쌓이도록 보장 */
  display: block;                 /* 또는 display:flex; flex-direction:column; */
  min-height: 100%;
`;
