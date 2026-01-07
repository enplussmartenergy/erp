// src/features/report/pdf2/PdfPreviewSanitaryFixtureJs.jsx
/** @jsxImportSource @emotion/react */
import { useEffect, useMemo, useRef, useState } from "react";
import { buildSanitaryFixturePdf } from "./buildSanitaryFixturePdf";

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

export default function PdfPreviewSanitaryFixtureJs({
  onClose,
  fileName = "위생기구설비_성능점검표.pdf",
  building,
  reportMeta,
  report,
  schema,
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const urlRef = useRef("");

  const deps = useMemo(
    () => ({ building, reportMeta, report, schema }),
    [building, reportMeta, report, schema]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!report) {
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = "";
        }
        setBlobUrl("");
        setError("");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const blob = await buildSanitaryFixturePdf(deps);
        if (!alive) return;

        const nextUrl = URL.createObjectURL(blob);

        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = nextUrl;

        setBlobUrl(nextUrl);
      } catch (e) {
        if (!alive) return;
        console.error("buildSanitaryFixturePdf error", e);
        setError(e?.message || "PDF 생성 중 오류가 발생했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
      }
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
        <button
          onClick={handleDownload}
          disabled={!blobUrl}
          style={{ padding: "6px 10px" }}
        >
          PDF 다운로드
        </button>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {loading ? "PDF 생성 중…" : error ? "에러" : blobUrl ? "프리뷰 준비 완료" : ""}
        </div>
      </div>

      <div style={iframeBox}>
        {error ? (
          <div style={{ color: "#fecaca", padding: 16, whiteSpace: "pre-wrap" }}>
            {error}
          </div>
        ) : blobUrl ? (
          <iframe
            title="위생기구설비 성능 점검 PDF"
            src={blobUrl}
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        ) : null}
      </div>
    </div>
  );
}
