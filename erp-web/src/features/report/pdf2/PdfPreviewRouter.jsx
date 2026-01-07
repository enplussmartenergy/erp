// src/features/report/pdf2/PdfPreviewRouter.jsx
import React from "react";
import { PDF_PREVIEW_BY_KEY } from "./previewRegistry";

export default function PdfPreviewRouter({ equipKey, building, reportMeta, report }) {
  const Preview = PDF_PREVIEW_BY_KEY[equipKey] || null;

  if (!Preview) {
    return (
      <div style={{ padding: 12 }}>
        이 설비({equipKey})는 아직 PDF 미리보기가 연결되지 않았습니다.
      </div>
    );
  }

  return <Preview building={building} reportMeta={reportMeta} report={report} />;
}
