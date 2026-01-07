/** @jsxImportSource @emotion/react */
import * as s from "../style";
import { EQUIP_TYPES } from "./EquipmentStep";

export default function ReviewStep({ building, floors, equipments, body }) {
  const eq = EQUIP_TYPES.map(t=>{
    const r=(equipments||[]).find(x=>x.key===t.key)||{};
    return { label:t.label, own:!!r.owned, count:r.count||0 };
  });

  return (
    <section css={s.section}>
      <h2 css={s.h2}>검토/제출</h2>
      <div css={s.hint} style={{marginBottom:12}}>제출 전에 요약을 확인하세요.</div>

      <div css={s.card} style={{padding:14,marginBottom:12}}>
        <div css={s.cardHead}>건물</div>
        <div css={s.row}><div css={s.label}>이름</div><div>{building?.name||"-"}</div></div>
        <div css={s.row}><div css={s.label}>주소</div><div>{building?.addressRoad||"-"} {building?.addressDetail||""}</div></div>
        <div css={s.row}><div css={s.label}>용도</div><div>{building?.useType||"-"}</div></div>
      </div>

      <div css={s.card} style={{padding:14,marginBottom:12}}>
        <div css={s.cardHead}>층 프로필</div>
        <div>전체 층수: <b>{(floors||[]).length}</b></div>
      </div>

      <div css={s.card} style={{padding:14}}>
        <div css={s.cardHead}>설비 현황</div>
        <div css={s.tableWrap}>
          <table css={s.table}>
            <thead><tr><th>설비</th><th>보유</th><th>수량</th></tr></thead>
            <tbody>
              {eq.map((r,i)=><tr key={i}><td>{r.label}</td><td>{r.own?"보유":"미보유"}</td><td>{r.count}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:10}}>작성된 점검표 수(공조기 등): <b>{Object.keys(body?.equipReports||{}).length}</b></div>
      </div>
    </section>
  );
}
