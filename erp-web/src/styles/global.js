import { css } from "@emotion/react";

export const global = css`
  @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');

  /* 1) 전역 색상 강제 제거 → body에서만 기본 글자색 지정 */
  /* * { color: #222; } */

  html, body {
    margin: 0;
    padding: 0;
  }

  /* 2) 폰트 크기 베이스(작게 보이는 문제 방지) */
  html { font-size: clamp(14px, 0.95vw, 16px); }

  /* 3) 레이아웃 높이/폰트/색상은 body에서 */
  body {
    min-height: 100dvh;               
    overflow-x: hidden;               
    background-color: #fff;
    color: #222;                     
    font-family: "Noto Sans KR", sans-serif; 
    line-height: 1.5;
  }

  /* 4) 루트가 화면을 채우도록 */
  #root {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  main { flex: 1; }
`;
