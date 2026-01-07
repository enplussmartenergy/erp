/** @jsxImportSource @emotion/react */
import PhotoOnlyForm from "./PhotoOnlyForm";

/**
 * 고·저수조 전용 폼 (사진 전용)
 * - 내부적으로 PhotoOnlyForm을 그대로 사용
 * - schema: waterTankSchema (sections, noteLabel, slots 등)
 * - value: { photoSlots: {...}, sectionNotes: {...} }
 */
export default function WaterTankForm({ schema, value, onChange }) {
  // 표지/기준 페이지에 들어갈 현황사진(criteria_photo)도
  // PhotoOnlyForm에서 함께 처리합니다.
  return (
    <PhotoOnlyForm
      schema={schema}     // waterTankSchema 전달
      value={value}
      onChange={onChange}
    />
  );
}
