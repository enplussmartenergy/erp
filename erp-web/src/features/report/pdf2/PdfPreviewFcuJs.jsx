// src/features/report/pdf2/PdfPreviewFcuJs.jsx
/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef, useState } from "react";
import { css } from "@emotion/react";
import { buildFcuPdf } from "./buildFcuPdf";

const bar = css`
  height: 46px;
  background: #0f172a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
`;

const btn = css`
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.14); }
`;

const wrap = css`
  height: calc(100vh - 46px);
  background: #0b1220;
`;

const iframeCss = css`
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
`;

export default function PdfPreviewFcuJs({ building, reportMeta, report, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blobUrl, setBlobUrl] = useState("");
  const urlRef = useRef("");

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const blob = await buildFcuPdf({ building, reportMeta, report });

        if (!alive) return;

        const url = URL.createObjectURL(blob);

        // ✅ stale url revoke
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;

        setBlobUrl(url);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "PDF 생성 중 오류");
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();

    return () => {
      alive = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    };
  }, [building, reportMeta, report]);

  const download = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "FCU_Report.pdf";
    a.click();
  };

  return (
    <div>
      <div css={bar}>
        <div style={{ fontWeight: 900 }}>PDF 미리보기 · 팬코일유닛(FCU)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button css={btn} type="button" onClick={download} disabled={!blobUrl || loading}>
            다운로드
          </button>
          <button css={btn} type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      <div css={wrap}>
        {loading ? (
          <div style={{ color: "rgba(255,255,255,.8)", padding: 14 }}>PDF 생성 중…</div>
        ) : error ? (
          <div style={{ color: "#fff", padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>에러</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
          </div>
        ) : (
          <iframe title="fcu-pdf" css={iframeCss} src={blobUrl} />
        )}
      </div>
    </div>
  );
}
