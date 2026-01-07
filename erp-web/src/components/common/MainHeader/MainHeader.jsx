/** @jsxImportSource @emotion/react */
import React from 'react';
import { Link } from 'react-router-dom';
import * as s from './style';

export default function Header() {
  return (
    <header css={s.wrap}>
      <div css={s.container}>
        <Link to="/" css={s.brand}>
          <span css={s.brandMark}><img src="logo.png" alt="로고"/></span>
        </Link>

        <nav css={s.nav}>
          <Link to="/reports">보고서조회</Link>
          <Link to="/login">로그인</Link>
          <Link to="/signup" css={s.signup}>회원가입</Link>
        </nav>
      </div>
    </header>
  );
}
