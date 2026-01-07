/** @jsxImportSource @emotion/react */
import { useEffect, useMemo, useState } from "react";
import { buildWasteWaterPdf } from "./buildWasteWaterPdf";

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
const box = { flex: 1, background: "#111" };

export default function PdfPreviewWasteWaterJs({
  onClose,
  fileName = "오수정화설비_성능점검표.pdf",
  building,
  reportMeta,
  report,
  schema, // wasteWaterSchema.sections
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");

  const deps = useMemo(
    () => ({ building, reportMeta, report, schema }),
    [building, reportMeta, report, schema]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError("");
        const blob = await buildWasteWaterPdf(deps);
        if (!alive) return;
        setBlobUrl(URL.createObjectURL(blob));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "PDF 생성 오류");
      }
    })();
    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);

  const download = () => {
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
        <button
          onClick={download}
          disabled={!blobUrl}
          style={{ padding: "6px 10px" }}
        >
          PDF 다운로드
        </button>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {blobUrl ? "프리뷰 준비 완료" : error || "PDF 생성 중…"}
        </div>
      </div>
      <div style={box}>
        {error ? (
          <div style={{ color: "#fecaca", padding: 16, whiteSpace: "pre-wrap" }}>
            {error}
          </div>
        ) : blobUrl ? (
          <iframe
            title="PDF"
            src={blobUrl}
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        ) : null}
      </div>
    </div>
  );
}
