// src/features/report/pdf2/PdfPreviewColdHotJs.jsx
/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef, useState } from "react";
import { buildColdHotPdf } from "./buildColdHotPdf";

export default function PdfPreviewColdHotJs({ building, reportMeta, report, schema, onClose }) {
  const urlRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const blob = await buildColdHotPdf({ building, reportMeta, report, schema });

        if (cancelled) return;

        const nextUrl = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = nextUrl;
        setBlobUrl(nextUrl);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "PDF 생성 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [building, reportMeta, report, schema]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999 }}>
      <div style={{ position: "absolute", inset: 20, background: "#fff", borderRadius: 16, overflow: "hidden" }}>
        <div
          style={{
            height: 48,
            background: "#0f172a",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700 }}>냉온수기 PDF 미리보기</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (!blobUrl) return;
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = "coldhot.pdf";
                a.click();
              }}
              style={{ height: 30, padding: "0 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,.35)", background: "transparent", color: "#fff" }}
            >
              다운로드
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ height: 30, padding: "0 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,.35)", background: "transparent", color: "#fff" }}
            >
              닫기
            </button>
          </div>
        </div>

        <div style={{ position: "absolute", inset: "48px 0 0 0" }}>
          {loading ? (
            <div style={{ padding: 16 }}>PDF 생성 중...</div>
          ) : err ? (
            <div style={{ padding: 16, color: "#b91c1c" }}>{err}</div>
          ) : (
            <iframe title="coldhot-pdf" src={blobUrl} style={{ width: "100%", height: "100%", border: 0 }} />
          )}
        </div>
      </div>
    </div>
  );
}
