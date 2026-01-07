/** @jsxImportSource @emotion/react */
import * as s from "../style";
import { css } from "@emotion/react";
import { useMemo } from "react";

/* ── local tokens (이 컴포넌트에서만 사용) ───────────────── */
const primary = "#2563EB";
const line = "#E5E7EB";
const text = "#0F172A";
const muted = "#6B7280";
const soft = "#F8FAFF";
const radius = ".8rem";

/* 상단 ‘전체 약관 동의’ 카드 */
const masterRow = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid ${line};
  border-radius: ${radius};
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);

  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    color: ${text};
  }
  input[type="checkbox"] {
    width: 20px; height: 20px;
    accent-color: ${primary};
  }
  .pill {
    padding: .25rem .6rem;
    border-radius: 999px;
    font-size: .95rem;
    font-weight: 800;
    background: ${soft};
    color: ${primary};
    border: 1px solid rgba(37,99,235,.15);
  }
`;

/* 개별 약관 카드 */
const itemRow = css`
  margin-top: .8rem;
  border: 1px solid ${line};
  border-radius: ${radius};
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .03);

  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: .9rem 1rem;
  }
  input[type="checkbox"] {
    width: 18px; height: 18px;
    accent-color: ${primary};
  }
  .label {
    font-weight: 800;
    color: ${text};
  }
  .badge {
    margin-left: auto;
    padding: .2rem .55rem;
    font-size: .95rem;
    border-radius: 999px;
    border: 1px solid ${line};
    color: ${muted};
    background: #fff;
  }
`;

/* 아코디언 (전문 보기) */
const accord = css`
  border-top: 1px solid ${line};

  summary {
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: .8rem 1rem;
    cursor: pointer;
    color: ${primary};
    font-weight: 800;
    background: #FBFDFF;
    transition: background .2s;
  }
  summary::-webkit-details-marker { display: none; }
  summary::after {
    content: "▾";
    font-size: 1.1rem;
    transition: transform .2s ease;
  }
  &[open] summary { background: ${soft}; }
  &[open] summary::after { transform: rotate(180deg); }

  .content {
    padding: 1rem 1.1rem 1.2rem;
    line-height: 1.65;
    color: #374151;
    font-size: 1.15rem;
  }
  .content h4 { margin: .6rem 0 .2rem; font-weight: 800; }
  .content ul { margin: .3rem 0 .8rem 1.1rem; }
  .content li { margin: .2rem 0; }
`;

/* 경고문구 */
const warn = css`
  color: #ef4444;
  margin-top: .6rem;
  font-size: 1.15rem;
`;

export default function TermsStep({ data, setData }) {
  const requiredOk = useMemo(
    () => !!data.agreeRequired && !!data.agreePrivacy,
    [data.agreeRequired, data.agreePrivacy]
  );
  const allChecked = useMemo(
    () => !!data.agreeRequired && !!data.agreePrivacy && !!data.marketing,
    [data.agreeRequired, data.agreePrivacy, data.marketing]
  );

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const toggleAll = (v) => {
    setData((d) => ({
      ...d,
      agreeRequired: v,
      agreePrivacy: v,
      marketing: v,
    }));
  };

  return (
    <div css={s.termsBox}>
      {/* 전체 동의 */}
      <div css={masterRow}>
        <div className="left">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <span>전체 약관 동의</span>
        </div>
        <span className="pill">
          {requiredOk ? "필수 동의 완료" : "필수 2개 필요"}
        </span>
      </div>

      {/* [필수] 서비스 이용 약관 */}
      <div css={itemRow}>
        <div className="bar">
          <input
            type="checkbox"
            checked={!!data.agreeRequired}
            onChange={(e) => set("agreeRequired", e.target.checked)}
          />
          <span className="label">[필수] 서비스 이용 약관 동의</span>
          <span className="badge">필수</span>
        </div>

        <details css={accord}>
          <summary>전문 보기</summary>
          <div className="content">
            <h4>제1조(목적)</h4>
            본 약관은 <b>엔플러스 주식회사(이하 “회사”)</b>가 제공하는 서비스 이용과 관련하여
            회사와 이용자 간 권리·의무 및 책임 사항을 규정합니다.
            <h4>제2조(정의)</h4>
            <ul>
              <li>① “서비스”: 회사가 제공하는 웹/모바일 기반의 모든 기능</li>
              <li>② “회원”: 본 약관에 동의하고 계정을 생성한 자</li>
              <li>③ “콘텐츠”: 회원이 업로드/게시하는 자료 일체</li>
            </ul>
            <h4>제3조(약관의 게시/변경)</h4>
            법령/정책 변경 시 약관을 변경할 수 있으며, 변경 시 7일 전(중요 변경 30일 전) 고지합니다.
            <h4>제4조(계정 관리)</h4>
            회원은 최신 정보 유지 및 계정 보안을 책임지며, 도용/유출 피해는 회원 책임입니다.
            <h4>제5조(서비스 제공/변경)</h4>
            정기점검 등 불가피한 경우 일시 중단될 수 있으며, 변경 시 사전 고지합니다.
            <h4>제6조(이용자 의무)</h4>
            타인 정보 도용, 불법 프로그램 사용, 저작권 침해, 운영 방해 행위를 금지합니다.
            <h4>제7조(콘텐츠 권리/책임)</h4>
            게시물의 권리와 책임은 회원에게 있으며, 운영/개선을 위한 범위에서 회사가 이용할 수 있습니다.
            <h4>제8조(이용 제한)</h4>
            약관 위반 시 경고·일시정지·영구정지 등 제한될 수 있습니다.
            <h4>제9조(면책)</h4>
            천재지변, 통신 장애 등 불가항력에 대해서 회사는 책임지지 않습니다.
            <h4>제10조(분쟁 해결)</h4>
            준거법은 대한민국법이며, 회사 소재지 관할법원을 전속 관할로 합니다.
            <p style={{ color: muted }}>
              시행일: 2025-01-01 / 문의: 02-0000-0000, support@nplus.co.kr
            </p>
          </div>
        </details>
      </div>

      {/* [필수] 개인정보 처리방침 */}
      <div css={itemRow}>
        <div className="bar">
          <input
            type="checkbox"
            checked={!!data.agreePrivacy}
            onChange={(e) => set("agreePrivacy", e.target.checked)}
          />
          <span className="label">[필수] 개인정보 처리방침 동의</span>
          <span className="badge">필수</span>
        </div>

        <details css={accord}>
          <summary>전문 보기</summary>
          <div className="content">
            <h4>1. 수집·이용 목적</h4>
            <ul>
              <li>회원가입 및 본인확인, 고지·문의 처리</li>
              <li>서비스 제공/운영, 보안·접속 기록 관리, 부정 이용 방지</li>
            </ul>
            <h4>2. 수집 항목</h4>
            <ul>
              <li><b>필수</b>: 이메일, 비밀번호, 이름, 부서/직책, 휴대폰</li>
              <li><b>자동</b>: 접속 IP, 쿠키, 이용기록, 기기정보</li>
              <li><b>선택</b>: 마케팅 수신 여부</li>
            </ul>
            <h4>3. 보유·이용 기간</h4>
            탈퇴 시 지체 없이 파기(법령상 보존기간 예외), 접속기록은 3개월 보관.
            <h4>4. 파기 방법</h4>
            전자파일은 복구불가 방식 삭제, 출력물은 분쇄/소각.
            <h4>5. 제3자 제공/처리 위탁</h4>
            원칙적으로 동의 없이 제공하지 않으며, 위탁 시 수탁사/업무를 고지.
            <h4>6. 정보주체 권리</h4>
            열람·정정·삭제·처리정지 및 동의 철회 가능(고객센터 또는 이메일).
            <h4>7. 쿠키</h4>
            품질 향상을 위해 쿠키를 사용할 수 있으며, 브라우저 설정으로 거부 가능.
            <h4>8. 개인정보 보호책임자</h4>
            책임자/문의: 02-0000-0000 / support@nplus.co.kr
            <p style={{ color: muted }}>시행일: 2025-01-01</p>
          </div>
        </details>
      </div>

      {/* [선택] 마케팅 수신 동의 */}
      <div css={itemRow}>
        <div className="bar">
          <input
            type="checkbox"
            checked={!!data.marketing}
            onChange={(e) => set("marketing", e.target.checked)}
          />
          <span className="label">[선택] 마케팅 정보 수신 동의</span>
          <span className="badge">선택</span>
        </div>

        <details css={accord}>
          <summary>전문 보기</summary>
          <div className="content">
            <ul>
              <li>교육/이벤트/소식 등의 광고성 정보를 이메일·문자로 발송할 수 있어요.</li>
              <li>빈도: 수시(월 1~4회 내, 캠페인에 따라 변동)</li>
              <li>미동의해도 서비스 이용에는 제한이 없습니다.</li>
              <li>수신 거부는 각 메일/SMS 또는 마이페이지에서 언제든 철회 가능</li>
            </ul>
          </div>
        </details>
      </div>

      {!requiredOk && (
        <p css={warn}>
          필수 약관(이용약관, 개인정보 처리방침)에 동의해야 계속 진행할 수 있어요.
        </p>
      )}
    </div>
  );
}
