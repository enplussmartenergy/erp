/** @jsxImportSource @emotion/react */
import { useEffect, useMemo, useRef, useState } from "react";
import { buildPipePdf } from "./buildPipePdf";
import { getSchema } from "../../../domain/equipment/registry";

const wrap = { position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", flexDirection:"column", zIndex:1000 };
const bar = { display:"flex", gap:8, padding:8, background:"#0f172a", color:"#fff", alignItems:"center" };
const iframeBox = { flex:1, background:"#111" };

export default function PdfPreviewPipeJs({ onClose, fileName="배관설비_성능점검표.pdf", building, reportMeta, report }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");
  const urlRef = useRef("");

  const deps = useMemo(() => ({ building, reportMeta, report }), [building, reportMeta, report]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError("");
        const schema = getSchema("pipe");
        const blob = await buildPipePdf({ ...deps, schema });
        if (!alive) return;

        const url = URL.createObjectURL(blob);
        setBlobUrl(() => {
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url;
          return url;
        });
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setError(e?.message || "PDF 생성 오류");
      }
    })();

    return () => {
      alive = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    };
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
        <button type="button" onClick={onClose} style={{ padding:"6px 10px" }}>닫기</button>
        <button type="button" onClick={download} disabled={!blobUrl} style={{ padding:"6px 10px" }}>PDF 다운로드</button>
        <div style={{ marginLeft:"auto", opacity:.85 }}>{blobUrl ? "프리뷰 준비 완료" : error ? "에러" : "PDF 생성 중…"}</div>
      </div>
      <div style={iframeBox}>
        {error ? (
          <div style={{ color:"#fecaca", padding:16, whiteSpace:"pre-wrap" }}>{error}</div>
        ) : blobUrl ? (
          <iframe title="배관설비 성능점검 PDF" src={blobUrl} style={{ width:"100%", height:"100%", border:0, background:"#fff" }} />
        ) : null}
      </div>
    </div>
  );
}
