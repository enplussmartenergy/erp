/** @jsxImportSource @emotion/react */
import { useState } from "react";
import * as s from "./style";
import TermsStep from "./components/TermsStep";
import CompanyStep from "./components/CompanyStep";
import UserStep from "./components/UserStep";

const steps = ["약관 동의", "사업자 정보", "사용자 정보"];

export default function SignUpPage() {
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState({
    terms: { all: false, privacy: false, ads: false, tos: false },
    company: {
      name: "", ceo: "", regNo: "", zip: "", addr1: "", addr2: "", industry: ""
    },
    user: {
      email: "", code: "", password: "", password2: "", dept: "", name: "", phone: ""
    },
  });

  const next = () => setStepIdx((i) => Math.min(2, i + 1));
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <main css={s.page}>
      <h1 css={s.title}>회원가입</h1>
      <p css={s.subtitle}>기업 정보를 입력하면 회원 가입을 완료할 수 있어요.</p>

      {/* 작아진 스텝퍼 */}
      <div css={s.stepper}>
        {steps.map((label, i) => (
          <div key={label} css={s.step(stepIdx === i, stepIdx > i)}>
            {label}
          </div>
        ))}
      </div>

      {/* 단계별 폼 */}
      {stepIdx === 0 && <TermsStep data={data} setData={setData} />}
      {stepIdx === 1 && <CompanyStep data={data} setData={setData} />}
      {stepIdx === 2 && <UserStep data={data} setData={setData} />}

      <div css={s.footerActions}>
        {stepIdx > 0 && (
          <button css={s.btnGhost} type="button" onClick={prev}>이전</button>
        )}
        {stepIdx < 2 ? (
          <button css={s.btn} type="button" onClick={next}>다음</button>
        ) : (
          <button css={s.btn} type="button" onClick={() => alert("회원가입! (API 연결 예정)")}>
            회원가입
          </button>
        )}
      </div>
    </main>
  );
}
