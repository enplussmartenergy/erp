/** @jsxImportSource @emotion/react */
import { useEffect, useMemo, useRef, useState } from "react";
import { buildPumpChwPdf } from "./buildPumpChwPdf";

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

export default function PdfPreviewPumpChwJs({
  onClose,
  fileName = "펌프(냉수)_성능점검표.pdf",
  building,
  reportMeta,
  report,
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");

  // ✅ 현재 URL을 ref로 들고 있다가 안전하게 revoke
  const urlRef = useRef("");

  const deps = useMemo(
    () => ({ building, reportMeta, report }),
    [building, reportMeta, report]
  );

  useEffect(() => {
    let alive = true;

    // 이전 URL 정리
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
    setBlobUrl("");
    setError("");

    (async () => {
      if (!report) {
        // report 없으면 그냥 종료
        return;
      }

      try {
        const built = await buildPumpChwPdf(deps);
        if (!alive) return;

        // ✅ build 함수가 Blob을 주든, jsPDF를 주든 Blob으로 통일
        let blob = null;

        if (built instanceof Blob) {
          blob = built;
        } else if (built && typeof built.output === "function") {
          // jsPDF 인스턴스일 가능성
          blob = built.output("blob");
        }

        if (!(blob instanceof Blob)) {
          throw new Error(
            "PDF 생성 결과가 Blob이 아닙니다. buildPumpChwPdf가 Blob 또는 jsPDF 인스턴스를 반환하도록 확인하세요."
          );
        }

        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        setBlobUrl(url);
      } catch (e) {
        if (!alive) return;
        console.error("buildPumpChwPdf error", e);
        setError(e?.message || "PDF 생성 중 오류가 발생했습니다.");
      }
    })();

    return () => {
      alive = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
      }
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
        <button type="button" onClick={onClose} style={{ padding: "6px 10px" }}>
          닫기
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!blobUrl}
          style={{ padding: "6px 10px" }}
        >
          PDF 다운로드
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {blobUrl ? "프리뷰 준비 완료" : error ? "에러" : "PDF 생성 중…"}
        </div>
      </div>

      <div style={iframeBox}>
        {error ? (
          <div style={{ color: "#fecaca", padding: 16, whiteSpace: "pre-wrap" }}>
            {error}
          </div>
        ) : blobUrl ? (
          <iframe
            title="펌프(냉수) 성능 점검 PDF"
            src={blobUrl}
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        ) : null}
      </div>
    </div>
  );
}
