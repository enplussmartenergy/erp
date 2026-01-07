/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useId, useRef } from "react";
import Card from "./Card";

/* ============ styles ============ */
const drop = css`
  padding: 12px; border: 2px dashed #cbd5e1; border-radius: 10px;
  background: #f8fafc; text-align: center; cursor: pointer;
`;
const thumbs = css`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;
`;
const thumb = css`
  position: relative; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff;
  height: clamp(140px, 22vw, 220px); display: flex; align-items: center; justify-content: center;
  img { max-width: 100%; max-height: 100%; object-fit: contain; background: #f8fafc; }
`;
const del = css`
  position: absolute; right: 6px; top: 6px; font-size: 12px; font-weight: 800;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 999px; padding: 2px 8px;
`;
const grid = css`
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`;
const slotHead = css` font-weight: 800; margin-bottom: 8px; `;

/* ============ helpers ============ */
const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("이미지 변환 실패"));
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(file);
  });

async function normalizeToDataUrlObjects(listLike) {
  const arr = Array.from(listLike || []);
  return Promise.all(
    arr.map(async (f) => {
      if (typeof f === "string") return { dataUrl: f };
      if (f?.dataUrl) return { dataUrl: f.dataUrl, name: f.name };
      return { dataUrl: await fileToDataUrl(f), name: f.name };
    })
  );
}

/* ============ Single slot ============ */
export function PhotoSlot({
  files = [],
  onChange = () => {},
  accept = "image/*;capture=camera",
  capture = "environment",
  placeholder = "여기에 끌어다 놓거나 클릭하여 촬영/선택",
}) {
  const inputId = useId();
  const ref = useRef(null);

  const add = async (fileList) => {
    const reads = await normalizeToDataUrlObjects(fileList);
    onChange([...(files || []), ...reads]);
  };

  return (
    <>
      <input
        id={inputId}
        ref={ref}
        type="file"
        accept={accept}
        capture={capture}
        multiple
        onChange={(e) => { add(e.target.files); e.currentTarget.value = ""; }}
        style={{ display: "none" }}
      />

      {!files?.length ? (
        <div
          css={drop}
          role="button"
          tabIndex={0}
          onClick={() => ref.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") ref.current?.click(); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        >
          {placeholder}
        </div>
      ) : (
        <div css={thumbs}>
          {(files || []).map((p, i) => (
            <div css={thumb} key={`${p?.dataUrl?.slice?.(0, 32) || i}-${i}`}>
              <img src={p?.dataUrl} alt={p?.name || "photo"} />
              <button
                css={del}
                type="button"
                onClick={() => onChange((files || []).filter((_, idx) => idx !== i))}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============ Grid (여러 슬롯) ============ */
export function PhotoSlotGrid({ slots = [], value = {}, onChange = () => {} }) {
  const setSlot = (id, files) => onChange({ ...(value || {}), [id]: files });

  return (
    <div css={grid}>
      {(Array.isArray(slots) ? slots : []).map((s) => (
        <Card key={s.id ?? String(s.label ?? Math.random())}>
          <div css={slotHead}>{s.label ?? ""}</div>
          <PhotoSlot
            files={(value && value[s.id]) || []}
            onChange={(list) => setSlot(s.id, list)}
          />
        </Card>
      ))}
    </div>
  );
}

/* default = 단일 슬롯 */
export default PhotoSlotGrid;
