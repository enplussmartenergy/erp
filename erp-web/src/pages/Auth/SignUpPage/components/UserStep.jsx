/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState } from "react";
import * as s from "../style";
import { requestEmailCode, verifyEmailCode } from "../../../../apis/auth";

// 로컬 보조 스타일(공통 토큰 느낌 유지)
const badgeOk = css`
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  height: 2.1rem;
  padding: 0 .8rem;
  border-radius: 9999px;
  background: rgba(22,163,74,.08);
  color: #16A34A;
  border: .1rem solid rgba(22,163,74,.35);
  font-weight: 800;
  font-size: 1.15rem;
  margin-top: .5rem;
`;
const btnSm = css`
  ${s.btn};
  height: 3.4rem;
  padding: 0 1.2rem;
`;

export default function UserStep({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");

  const canSend = !!data.email && !data.emailVerified;
  const canConfirm = sent && !!code;

  const sendCode = async () => {
    if (!canSend) return;
    const res = await requestEmailCode(data.email);
    if (res?.data?.ok) {
      alert("인증 코드가 발송되었습니다.");
      setSent(true);
    }
  };

  const confirmCode = async () => {
    if (!canConfirm) return;
    const res = await verifyEmailCode({ email: data.email, code });
    if (res?.data?.ok) {
      set("emailVerified", true);
      alert("이메일 인증이 완료되었습니다.");
    }
  };

  return (
    <div css={s.form}>
      {/* 이메일 */}
      <div css={s.field}>
        <label css={s.label}>이메일</label>
        <div css={s.inputWrap}>
          <input
            css={s.input}
            type="email"
            placeholder="이메일을 입력하세요"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <button type="button" css={btnSm} disabled={!canSend} onClick={sendCode}>
            인증코드 발송
          </button>
        </div>

        {sent && !data.emailVerified && (
          <div css={s.inputWrap} style={{ marginTop: ".6rem" }}>
            <input
              css={s.input}
              placeholder="인증코드 입력"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="button" css={btnSm} disabled={!canConfirm} onClick={confirmCode}>
              확인
            </button>
          </div>
        )}

        {data.emailVerified && <span css={badgeOk}>✅ 인증 완료</span>}
      </div>

      {/* 비밀번호 2열 */}
      <div css={s.grid2}>
        <div css={s.field}>
          <label css={s.label}>비밀번호</label>
          <input
            css={s.input}
            type="password"
            placeholder="8자 이상"
            value={data.password}
            onChange={(e) => set("password", e.target.value)}
          />
          <span css={s.hint}>영문/숫자/특수문자 조합을 권장합니다.</span>
        </div>
        <div css={s.field}>
          <label css={s.label}>비밀번호 확인</label>
          <input
            css={s.input}
            type="password"
            placeholder="비밀번호 확인"
            value={data.password2}
            onChange={(e) => set("password2", e.target.value)}
          />
        </div>
      </div>

      {/* 담당자 정보 2열 */}
      <div css={s.grid2}>
        <div css={s.field}>
          <label css={s.label}>담당부서</label>
          <input
            css={s.input}
            placeholder="부서를 입력하세요"
            value={data.department}
            onChange={(e) => set("department", e.target.value)}
          />
        </div>
        <div css={s.field}>
          <label css={s.label}>담당자 직책</label>
          <input
            css={s.input}
            placeholder="직책을 입력하세요"
            value={data.position}
            onChange={(e) => set("position", e.target.value)}
          />
        </div>
        <div css={s.field}>
          <label css={s.label}>담당자 이름</label>
          <input
            css={s.input}
            placeholder="이름"
            value={data.managerName}
            onChange={(e) => set("managerName", e.target.value)}
          />
        </div>
        <div css={s.field}>
          <label css={s.label}>담당자 연락처</label>
          <input
            css={s.input}
            placeholder="휴대폰 번호"
            value={data.managerPhone}
            onChange={(e) => set("managerPhone", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
