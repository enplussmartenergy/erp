/** @jsxImportSource @emotion/react */
import { useEffect, useMemo, useRef, useState } from "react";
import { buildDrainVentPdf } from "./buildDrainVentPdf";

const wrap = { position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", flexDirection:"column", zIndex:1000 };
const bar  = { display:"flex", gap:8, padding:8, background:"#0f172a", color:"#fff", alignItems:"center" };
const box  = { flex:1, background:"#111" };

export default function PdfPreviewDrainVentJs({
  onClose,
  fileName = "배수_통기_우수.pdf",
  building,
  reportMeta,
  report,
  schema, // drainVentSchema.sections
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");
  const urlRef = useRef(""); // ✅ 최신 blobUrl만 보관

  const deps = useMemo(
    () => ({ building, reportMeta, report, schema }),
    [building, reportMeta, report, schema]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");

        // ✅ 새로 만들기 전에 이전 URL 정리
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = "";
        }
        setBlobUrl("");

        const blob = await buildDrainVentPdf(deps);
        if (!alive) return;

        const nextUrl = URL.createObjectURL(blob);
        urlRef.current = nextUrl;
        setBlobUrl(nextUrl);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "PDF 생성 오류");
      }
    })();

    return () => {
      alive = false;
      // ✅ 언마운트/재실행 시에도 최신 URL 정리
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
      }
    };
  }, [deps]);

  const download = () => {
    const url = urlRef.current || blobUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  return (
    <div style={wrap}>
      <div style={bar}>
        <button onClick={onClose} style={{ padding:"6px 10px" }}>닫기</button>
        <button onClick={download} disabled={!blobUrl} style={{ padding:"6px 10px" }}>PDF 다운로드</button>
        <div style={{ marginLeft:"auto", opacity:.8 }}>
          {blobUrl ? "프리뷰 준비 완료" : (error || "PDF 생성 중…")}
        </div>
      </div>

      <div style={box}>
        {error ? (
          <div style={{ color:"#fecaca", padding:16, whiteSpace:"pre-wrap" }}>{error}</div>
        ) : blobUrl ? (
          <iframe title="PDF" src={blobUrl} style={{ width:"100%", height:"100%", border:0 }} />
        ) : null}
      </div>
    </div>
  );
}
