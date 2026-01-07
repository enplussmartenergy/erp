/** @jsxImportSource @emotion/react */
import * as s from "../style";

export default function CompanyStep({ data, setData }) {
  const c = data.company;
  const on = (k) => (e) =>
    setData((p) => ({ ...p, company: { ...p.company, [k]: e.target.value }}));

  return (
    <section css={s.section}>
      <h3 css={s.sectionHead}>사업자 정보</h3>

      <form css={s.form} onSubmit={(e) => e.preventDefault()}>
        <div css={s.grid2}>
          <div css={s.field}>
            <label css={s.label}>기업명</label>
            <input css={s.input} value={c.name} onChange={on("name")} placeholder="기업명을 입력하세요" />
          </div>

          <div css={s.field}>
            <label css={s.label}>대표자명</label>
            <input css={s.input} value={c.ceo} onChange={on("ceo")} placeholder="대표자명을 입력하세요" />
          </div>
        </div>

        <div css={s.field}>
          <label css={s.label}>사업자등록번호</label>
          <input css={s.input} value={c.regNo} onChange={on("regNo")} placeholder="000-00-00000" />
          <p css={s.hint}>숫자만 입력해도 자동으로 포맷팅됩니다.</p>
        </div>

        <div css={s.field}>
          <label css={s.label}>기업 주소</label>

          {/* 우편번호 / 도로명 / 상세 + 버튼 구조 */}
          <div css={s.addrGrid}>
            <input css={s.input} value={c.zip} onChange={on("zip")} placeholder="우편번호" />
            <input css={s.input} value={c.addr1} onChange={on("addr1")} placeholder="도로명 주소" />
            <button type="button" css={s.btn} onClick={() => alert("주소검색 연결 예정")}>
              주소찾기
            </button>
          </div>

          <input css={s.input} value={c.addr2} onChange={on("addr2")} placeholder="상세 주소" />
        </div>

        <div css={s.grid2}>
          <div css={s.field}>
            <label css={s.label}>업태/업종</label>
            <input css={s.input} value={c.industry} onChange={on("industry")} placeholder="예: 제조/기계" />
          </div>

          <div css={s.field}>
            <label css={s.label}>대표 전화</label>
            <input css={s.input} value={c.phone} onChange={on("phone")} placeholder="연락처를 입력하세요" />
          </div>
        </div>
      </form>
    </section>
  );
}
