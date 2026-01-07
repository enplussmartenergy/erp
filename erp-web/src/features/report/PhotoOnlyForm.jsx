/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import Card from "../../ui/Card";
import Field from "../../ui/Field";
import PhotoSlotGrid from "../../ui/PhotoSlotGrid";

const grid = css`
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr;
`;
export default function PhotoOnlyForm({ schema, value, onChange }) {
  const sections = schema?.sections || [];
  const emit = (patch) => onChange?.({ ...(value || {}), ...patch });

  // 섹션별 비고 저장 (폼에서는 sectionNotes 키를 사용)
  const sectionNotes = value?.sectionNotes || {};
  const setNote = (sid, txt) =>
    emit({ sectionNotes: { ...sectionNotes, [sid]: txt } });

  // 모든 사진 슬롯 값
  const photoSlots = value?.photoSlots || {};
  const setSlots = (next) => emit({ photoSlots: next });

  // ✅ 표지/기준 페이지에서 쓰는 현황사진 슬롯 보장
  const setCover = (partial) =>
    setSlots({ ...photoSlots, ...partial });
  return (
    <div css={grid}>
      {/* ✅ 표지/기준 페이지용 현황사진 */}
      <Card title="점검 기준 · 현황사진">
        <PhotoSlotGrid
          slots={[{ id: "criteria_photo", label: "현황 사진 (표지/기준 페이지에 출력)" }]}
          value={{ criteria_photo: photoSlots.criteria_photo || [] }}
          onChange={(partial) => setCover(partial)}
          accept="image/jpeg,image/png,image/jpg,image/webp"
          capture="environment"
        />
      </Card>

      {/* 섹션들 */}
      {sections.map((sec) => {
        const secIds = new Set((sec.slots || []).map((s) => s.id));
        const scopedValue = Object.fromEntries(
          Object.entries(photoSlots).filter(([k]) => secIds.has(k))
        );
        const mergeBack = (partial) =>
          setSlots({ ...photoSlots, ...partial });

        return (
          <Card key={sec.id} title={sec.title}>
            <PhotoSlotGrid
              slots={sec.slots}
              value={scopedValue}
              onChange={mergeBack}
              accept="image/jpeg,image/png,image/jpg,image/webp"
              capture="environment"
            />
            <div style={{ marginTop: 10 }}>
              <Field label={sec.noteLabel || "비고"}>
                <textarea
                  value={sectionNotes[sec.id] || ""}
                  onChange={(e) => setNote(sec.id, e.target.value)}
                  style={{
                    width: "100%",
                    height: 90,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 14,
                    boxSizing: "border-ox",
                  }}
                />
              </Field>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
