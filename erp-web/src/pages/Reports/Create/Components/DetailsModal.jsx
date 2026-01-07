/** @jsxImportSource @emotion/react */
import { useEffect, useState } from "react";
import * as s from "../style";

const blank = () => ({ model: "", capacity: "", year: "" });

export default function DetailsModal({ equip, onClose, onSave }) {
  const [rows, setRows] = useState(() => Array.from({ length: equip.count }, blank));

  // 수량 변경 시 자동 동기화
  useEffect(() => {
    setRows((prev) => {
      const a = [...prev].slice(0, equip.count);
      while (a.length < equip.count) a.push(blank());
      return a;
    });
  }, [equip.count]);

  const set = (idx, key, val) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  return (
    <div css={s.overlay} onClick={onClose}>
      <div css={s.modal} onClick={(e) => e.stopPropagation()}>
        <div css={s.modalHead}>
          <div>{equip.label} 상세 입력</div>
          <button onClick={onClose}>✕</button>
        </div>

        <div css={s.modalBody}>
          <div css={s.smHint}>수량이 {equip.count}대로 설정되어, 동일 개수만큼 입력 필드가 자동 생성됩니다.</div>
          {rows.map((r, i) => (
            <div key={i} css={s.g3} style={{ marginTop: 10 }}>
              <input css={s.input} placeholder="모델명" value={r.model} onChange={(e)=>set(i,"model",e.target.value)} />
              <input css={s.input} placeholder="용량" value={r.capacity} onChange={(e)=>set(i,"capacity",e.target.value)} />
              <input css={s.input} placeholder="설치연도" value={r.year} onChange={(e)=>set(i,"year",e.target.value)} />
            </div>
          ))}
        </div>

        <div css={s.modalFoot}>
          <button css={s.btnGhost} onClick={onClose}>취소</button>
          <button css={s.btn} onClick={()=>onSave(rows)}>저장</button>
        </div>
      </div>
    </div>
  );
}
