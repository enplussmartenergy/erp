/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useMemo } from "react";
import * as p from "../../styles/primitives";
import { tokens as c } from "../../styles/tokens";

const group = p.card;
const gtitle = p.groupTitle;
const grid2 = p.grid2;
const field = p.row;
const input = p.inputBase;

const chips = css`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  button {
    height: 2.4rem;
    padding: 0 0.9rem;
    border-radius: 999px;
    border: 1px solid ${c.line};
    background: #fff;
    font-weight: 800;
  }
  button[aria-pressed="true"] {
    background: rgba(37, 99, 235, 0.08);
    border-color: ${c.primary};
    color: ${c.primary};
    box-shadow: 0 0 0 0.24rem ${c.ring};
  }
`;

export default function SelectBuildingStep({ building, setBuilding, existing = [] }) {
  const isNew = useMemo(() => !building?.id, [building?.id]);
  const set = (k, v) => setBuilding((b) => ({ ...(b || {}), [k]: v }));

  const onPickExisting = (id) => {
    if (!id || id === "new") {
      setBuilding({
        name: "",
        ceo: "",
        addressRoad: "",
        addressDetail: "",
        buildingNo: "",
        useType: "상업",
        structure: "철근 콘크리트",

        // ✅ 추가: 대지면적/연면적
        siteArea: "",
        grossFloorArea: "",

        buildingCoverage: "",
        floorAreaRatio: "",
        householdCount: "",

        // 연락
        manager: "",
        tel: "",
        fax: "",

        // 일정
        firstCheckAt: "",
        nextCheckAt: "",

        // ✅ 에너지(건물 현황 표에 쓰는 값)
        // (에너지 사용 페이지랑 별개로, 건물 프로필에 ‘요약’로 박아넣는 값)
        energyYear: "",
        energyToe: "",
        energyCostM: "",

        // ✅ 업무담당자(표 안)
        contactDept: "",
        contactName: "",
        contactPosition: "",
        contactEmail: "",
      });
      return;
    }
    const result = existing.find((x) => String(x.id) === String(id));
    if (result) setBuilding(result);
  };

  const openPostcode = () => {
    alert("주소 검색 모듈 연동 전입니다. 예시 값을 채웠어요.");
    set("addressRoad", "서울시 OO구 OO로 123");
  };

  const isApt = building?.useType === "아파트";

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {/* 등록된 건물 */}
      <div css={group}>
        <div css={gtitle}>
          <span className="dot" />
          <span>등록된 건물</span>
          <span className="sub">기존 건물을 고르거나 ‘신규 등록’을 선택하세요.</span>
        </div>
        <div css={field}>
          <label css={p.label}>목록</label>
          <select css={input} value={isNew ? "new" : building?.id} onChange={(e) => onPickExisting(e.target.value)}>
            <option value="new">신규 등록</option>
            {existing.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 기본 정보 */}
      <div css={group}>
        <div css={gtitle}>
          <span className="dot" />
          <span>기본 정보</span>
          <span className="sub">보고서에 표시될 건물 기본 프로필</span>
        </div>

        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>
              건물명 <small style={{ color: c.muted }}>(필수)</small>
            </label>
            <input css={input} placeholder="건물명을 입력하세요" value={building?.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>대표자명</label>
            <input css={input} placeholder="대표자명을 입력하세요" value={building?.ceo || ""} onChange={(e) => set("ceo", e.target.value)} />
          </div>
        </div>

        <div css={field} style={{ marginTop: ".6rem" }}>
          <label css={p.label}>주소지</label>
          <div style={{ display: "grid", gap: ".6rem", gridTemplateColumns: "1fr auto" }}>
            <input css={input} placeholder="도로명 주소" value={building?.addressRoad || ""} onChange={(e) => set("addressRoad", e.target.value)} />
            <button type="button" css={p.pillGhost} onClick={openPostcode}>
              주소찾기
            </button>
          </div>
          <input css={input} placeholder="상세주소" value={building?.addressDetail || ""} onChange={(e) => set("addressDetail", e.target.value)} />
        </div>

        <div css={grid2} style={{ marginTop: ".2rem" }}>
          <div css={field}>
            <label css={p.label}>주용도</label>
            <input css={input} placeholder="예) 아파트" value={building?.buildingNo || ""} onChange={(e) => set("buildingNo", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>건물 용도</label>
            <div css={chips}>
              {["상업", "공업", "아파트", "기타"].map((k) => (
                <button key={k} type="button" aria-pressed={building?.useType === k} onClick={() => set("useType", k)}>
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ 대지면적 / 연면적 / 세대수 */}
        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>대지면적 (㎡)</label>
            <input css={input} placeholder="예) 130,523.8" value={building?.siteArea || ""} onChange={(e) => set("siteArea", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>연면적 (㎡)</label>
            <input css={input} placeholder="예) 73,361.94" value={building?.grossFloorArea || ""} onChange={(e) => set("grossFloorArea", e.target.value)} />
          </div>
        </div>

        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>건폐율 (%)</label>
            <input css={input} placeholder="예) 16.23" value={building?.buildingCoverage || ""} onChange={(e) => set("buildingCoverage", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>용적률 (%)</label>
            <input css={input} placeholder="예) 31.26" value={building?.floorAreaRatio || ""} onChange={(e) => set("floorAreaRatio", e.target.value)} />
          </div>
        </div>

        {isApt && (
          <div css={field}>
            <label css={p.label}>세대수 (아파트)</label>
            <input css={input} placeholder="예) 300" value={building?.householdCount || ""} onChange={(e) => set("householdCount", e.target.value)} />
          </div>
        )}
      </div>

      {/* 연락/일정/에너지 */}
      <div css={group}>
        <div css={gtitle}>
          <span className="dot" />
          <span>연락 · 일정 · 에너지</span>
        </div>

        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>유지관리 담당자</label>
            <input css={input} placeholder="담당자 이름" value={building?.manager || ""} onChange={(e) => set("manager", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>전화번호</label>
            <input css={input} placeholder="예) 054-750-4500" value={building?.tel || ""} onChange={(e) => set("tel", e.target.value)} />
          </div>
        </div>

        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>팩스번호</label>
            <input css={input} placeholder="예) 054-741-7384" value={building?.fax || ""} onChange={(e) => set("fax", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>향후 성능점검 예정일</label>
            <input css={input} type="date" value={building?.nextCheckAt || ""} onChange={(e) => set("nextCheckAt", e.target.value)} />
          </div>
        </div>

        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>최초 준공일</label>
            <input css={input} type="date" value={building?.firstCheckAt || ""} onChange={(e) => set("firstCheckAt", e.target.value)} />
          </div>
          
        </div>

        {/* ✅ 에너지(스샷2처럼 toe/년, 백만원/년) */}
        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>에너지 사용량 (toe/년)</label>
            <input css={input} placeholder="예) 834.68" value={building?.energyToe || ""} onChange={(e) => set("energyToe", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>에너지 사용금액 (백만원/년)</label>
            <input css={input} placeholder="예) 754.4" value={building?.energyCostM || ""} onChange={(e) => set("energyCostM", e.target.value)} />
          </div>
        </div>

        {/* ✅ 업무담당자(표 안에 출력) */}
        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>담당부서</label>
            <input css={input} placeholder="예) 담당부서" value={building?.contactDept || ""} onChange={(e) => set("contactDept", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>성명</label>
            <input css={input} placeholder="예) 홍길동" value={building?.contactName || ""} onChange={(e) => set("contactName", e.target.value)} />
          </div>
        </div>

        <div css={grid2}>
          <div css={field}>
            <label css={p.label}>직책</label>
            <input css={input} placeholder="예) 시설과장" value={building?.contactPosition || ""} onChange={(e) => set("contactPosition", e.target.value)} />
          </div>
          <div css={field}>
            <label css={p.label}>E-mail</label>
            <input css={input} placeholder="예) user@company.com" value={building?.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} />
          </div>
        </div>
      </div>
    </section>
  );
}
