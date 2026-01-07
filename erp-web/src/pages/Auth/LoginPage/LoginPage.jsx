/** @jsxImportSource @emotion/react */
import { useState } from "react";
import * as s from "./style";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: 로그인 API 연결
    console.log("login", form);
  };

  return (
    <main css={s.wrap}>
      <h1 css={s.title}>로그인</h1>

      <form css={s.form} onSubmit={onSubmit}>
        <div css={s.group}>
          <label>이메일</label>
          <input
            type="email"
            name="email"
            placeholder="이메일을 입력하세요"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>

        <div css={s.group}>
          <label>비밀번호</label>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        <button type="submit" css={s.primaryBtn}>로그인</button>
      </form>

      <div css={s.foot}>
        <span>아직 계정이 없나요?</span>
        <Link to="/signup">회원가입</Link>
      </div>
    </main>
  );
}
