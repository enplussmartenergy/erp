/** @jsxImportSource @emotion/react */
import React from 'react';
import * as s from './style';

export default function Footer() {
  return (
    <footer css={s.wrap}>
      <div css={s.container}>
        <div>© 2025 기계설비 성능 점검 플랫폼</div>
        <div css={s.links}>
          <a href="#">개인정보 처리방침</a>
          <a href="#">이용약관</a>
          <a href="mailto:support@example.com">support@example.com</a>
        </div>
      </div>
    </footer>
  );
}
