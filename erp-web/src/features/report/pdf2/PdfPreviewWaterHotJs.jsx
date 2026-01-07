/** @jsxImportSource @emotion/react */
// src/features/report/pdf2/PdfPreviewWaterHotJs.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { buildWaterHotPdf } from "./buildWaterHotPdf";

const wrap = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  display: "flex",
  flexDirection: "column",
  zIndex: 1000,
};
const bar = {
  display: "flex",
  gap: 8,
  padding: 8,
  background: "#0f172a",
  color: "#fff",
  alignItems: "center",
};
const iframeBox = { flex: 1, background: "#111" };

export default function PdfPreviewWaterHotJS({
  onClose,
  fileName = "waterHot.pdf",
  building,
  reportMeta,
  report,
  schemaSections = [],
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ revoke 안전 처리
  const urlRef = useRef("");

  const deps = useMemo(
    () => ({ building, reportMeta, report, schemaSections }),
    [building, reportMeta, report, schemaSections]
  );

  useEffect(() => {
  let alive = true;

  (async () => {
    if (!report) {
      setBlobUrl("");
      return;
    }
    try {
      setError("");
      const blob = await buildWaterHotPdf(deps);
      if (!alive) return;

      const url = URL.createObjectURL(blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      if (!alive) return;
      setError(e?.message || "PDF 생성 중 오류가 발생했습니다.");
    }
  })();

  return () => {
    alive = false;
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };
}, [deps]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div style={wrap}>
      <div style={bar}>
        <button onClick={onClose} style={{ padding: "6px 10px" }}>
          닫기
        </button>
        <button onClick={handleDownload} disabled={!blobUrl} style={{ padding: "6px 10px" }}>
          PDF 다운로드
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.85 }}>
          {loading ? "PDF 생성 중…" : error ? "에러" : blobUrl ? "프리뷰 준비 완료" : ""}
        </div>
      </div>

      <div style={iframeBox}>
        {error ? (
          <div style={{ color: "#fecaca", padding: 16, whiteSpace: "pre-wrap" }}>{error}</div>
        ) : blobUrl ? (
          <iframe title="PDF Preview" src={blobUrl} style={{ width: "100%", height: "100%", border: 0 }} />
        ) : null}
      </div>
    </div>
  );
}
