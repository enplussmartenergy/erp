// src/features/report/pdf2/PdfPreviewPackageAcJs.jsx
/** @jsxImportSource @emotion/react */
import { useEffect, useMemo, useState } from "react";
import { buildPackageAcPdf } from "./buildPackageAcPdf";

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

export default function PdfPreviewPackageAcJs({
  onClose,
  fileName = "패키지에어컨_성능점검표.pdf",
  building,
  reportMeta,
  report,
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");

  const deps = useMemo(() => ({ building, reportMeta, report }), [building, reportMeta, report]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!report) {
        setBlobUrl("");
        return;
      }

      try {
        setError("");
        const blob = await buildPackageAcPdf(deps);
        if (!alive) return;

        const url = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        if (!alive) return;
        console.error("buildPackageAcPdf error", e);
        setError(e?.message || "PDF 생성 중 오류가 발생했습니다.");
      }
    })();

    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <button onClick={onClose} style={{ padding: "6px 10px" }}>닫기</button>
        <button onClick={handleDownload} disabled={!blobUrl} style={{ padding: "6px 10px" }}>
          PDF 다운로드
        </button>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {blobUrl ? "프리뷰 준비 완료" : error ? "에러" : "PDF 생성 중…"}
        </div>
      </div>

      <div style={iframeBox}>
        {error ? (
          <div style={{ color: "#fecaca", padding: 16, whiteSpace: "pre-wrap" }}>{error}</div>
        ) : blobUrl ? (
          <iframe title="패키지 에어컨 성능 점검 PDF" src={blobUrl} style={{ width: "100%", height: "100%", border: 0 }} />
        ) : null}
      </div>
    </div>
  );
}
