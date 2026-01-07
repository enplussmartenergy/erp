/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

const wrap = css`
  /* 래퍼가 셀 높이에 끌려 늘어나지 않도록 */
  position: relative;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  width: 100%;
  height: 40px; /* input과 동일 높이 */
`;

const inputCss = css`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  padding-right: 56px; /* 단위 배지 공간 확보 */
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
  }

  &[readonly] {
    background: #F9FAFB;
  }
`;

const unitCss = css`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%); /* 항상 인풋 세로 중앙 */
  color: #64748B;
  font-weight: 700;
  pointer-events: none;
`;

export default function InputWithUnit({
  unit,
  value,
  onChange,
  readOnly,
  type = "text",
  step,
  placeholder,
}) {
  return (
    <div css={wrap}>
      <input
        css={inputCss}
        type={type}
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
      <span css={unitCss}>{unit}</span>
    </div>
  );
}
