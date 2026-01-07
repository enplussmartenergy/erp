// src/features/report/FormRouter.jsx
import React from "react";
import { FORM_BY_KEY } from "./formRegistry";

export default function FormRouter({ equipKey, value, onChange, schema, meta }) {
  const Form = FORM_BY_KEY[equipKey] || null;

  if (!Form) {
    return (
      <div style={{ padding: 12 }}>
        이 설비({equipKey})는 아직 폼이 연결되지 않았습니다.
      </div>
    );
  }

  // 기존 폼들의 props 형태가 제각각이면 여기에서 통일해주면 됨.
  // 일단 value/onChange는 공통으로 전달 + 필요 시 schema/meta도 전달.
  return <Form value={value} onChange={onChange} schema={schema} meta={meta} />;
}
