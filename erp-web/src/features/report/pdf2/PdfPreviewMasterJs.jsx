/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { buildMasterReportPdf } from "./buildMasterReportPdf";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") &&
      typeof document !== "undefined" &&
      "ontouchend" in document)
  );
}

async function blobToDataUrl(blob) {
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("dataUrl 변환 실패"));
    fr.onload = () => res(String(fr.result));
    fr.readAsDataURL(blob);
  });
}

export default function PdfPreviewMasterJs({
  onClose,
  fileName = "통합보고서.pdf",
  building,
  reportMeta,
  report,        // 공통( floors 포함 + energy 포함 가능 )
  equipReports,  // body.equipReports
  equipOrder,    // optional
  equipments,    // 설비현황(EquipmentStep) 데이터
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [blobUrl, setBlobUrl] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [useDataUrlPreview, setUseDataUrlPreview] = useState(false);

  const urlRef = useRef("");
  const blobRef = useRef(null);

  const deps = useMemo(
    () => ({ building, reportMeta, report, equipReports, equipOrder, equipments }),
    [building, reportMeta, report, equipReports, equipOrder, equipments]
  );

  const revoke = useCallback((u) => {
    try {
      if (u) URL.revokeObjectURL(u);
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setUseDataUrlPreview(false);
        setDataUrl("");

        const blob = await buildMasterReportPdf(deps);

        if (!alive) return;

        const nextUrl = URL.createObjectURL(blob);

        revoke(urlRef.current);
        urlRef.current = nextUrl;
        blobRef.current = blob;

        setBlobUrl(nextUrl);

        // iOS는 blob iframe이 흰 화면 나는 경우가 많아서 미리 dataUrl도 준비(폴백)
        if (isIOS()) {
          try {
            const du = await blobToDataUrl(blob);
            if (!alive) return;
            setDataUrl(du);
          } catch {}
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "PDF 생성 중 오류가 발생했습니다.");
        setBlobUrl("");
        setDataUrl("");
        blobRef.current = null;
        revoke(urlRef.current);
        urlRef.current = "";
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      revoke(urlRef.current);
      urlRef.current = "";
      blobRef.current = null;
    };
  }, [deps, revoke]);

  const downloadName = (fileName || "통합보고서.pdf").endsWith(".pdf")
    ? fileName
    : `${fileName}.pdf`;

  const openInNewTab = useCallback(() => {
    const u = urlRef.current || blobUrl || dataUrl;
    if (!u) return;
    window.open(u, "_blank", "noopener,noreferrer");
  }, [blobUrl, dataUrl]);

  const handleDownload = useCallback(async () => {
    const u = urlRef.current || blobUrl;
    const blob = blobRef.current;
    if (!u) return;

    // iOS: 공유 가능한 경우 파일 공유 우선
    try {
      if (blob && navigator.share && window.File) {
        const file = new File([blob], downloadName, { type: "application/pdf" });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: downloadName });
          return;
        }
      }
    } catch {}

    if (isIOS()) {
      openInNewTab();
      return;
    }

    const a = document.createElement("a");
    a.href = u;
    a.download = downloadName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [blobUrl, downloadName, openInNewTab]);

  const handleIframeError = useCallback(async () => {
    if (useDataUrlPreview) return;

    if (dataUrl) {
      setUseDataUrlPreview(true);
      return;
    }

    try {
      const blob = blobRef.current;
      if (!blob) return;
      const du = await blobToDataUrl(blob);
      setDataUrl(du);
      setUseDataUrlPreview(true);
    } catch {}
  }, [dataUrl, useDataUrlPreview]);

  const previewSrc = useDataUrlPreview ? dataUrl : blobUrl;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0f172a",
        zIndex: 2000,
        display: "grid",
        gridTemplateRows: "52px 1fr",
      }}
    >
      {/* top bar */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,.12)",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>통합 보고서 미리보기</strong>
          <span
            style={{
              opacity: 0.75,
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {building?.name || ""}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.22)",
              background: "transparent",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            닫기
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!blobUrl || loading || !!err}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.22)",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 900,
              cursor: !blobUrl || loading || !!err ? "not-allowed" : "pointer",
              opacity: !blobUrl || loading || !!err ? 0.65 : 1,
            }}
          >
            다운로드
          </button>

          <button
            type="button"
            onClick={openInNewTab}
            disabled={!previewSrc || loading || !!err}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.22)",
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              fontWeight: 900,
              cursor: !previewSrc || loading || !!err ? "not-allowed" : "pointer",
              opacity: !previewSrc || loading || !!err ? 0.65 : 1,
            }}
          >
            새 탭
          </button>
        </div>
      </div>

      {/* body */}
      <div style={{ background: "#fff", position: "relative" }}>
        {loading && <div style={{ padding: 14, fontWeight: 800 }}>PDF 생성 중…</div>}

        {!loading && err && (
          <div style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>에러</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{err}</div>
          </div>
        )}

        {!loading && !err && previewSrc && (
          <iframe
            title="master-pdf"
            src={previewSrc}
            style={{ width: "100%", height: "100%", border: 0 }}
            onError={handleIframeError}
          />
        )}

        {/* 강제 폴백 스위치 */}
        {!loading && !err && blobUrl && (
          <div style={{ position: "fixed", right: 12, bottom: 12, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setUseDataUrlPreview(false)}
              disabled={!blobUrl}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,.15)",
                background: useDataUrlPreview ? "#fff" : "#0f172a",
                color: useDataUrlPreview ? "#0f172a" : "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Blob
            </button>

            <button
              type="button"
              onClick={async () => {
                if (dataUrl) {
                  setUseDataUrlPreview(true);
                  return;
                }
                try {
                  const blob = blobRef.current;
                  if (!blob) return;
                  const du = await blobToDataUrl(blob);
                  setDataUrl(du);
                  setUseDataUrlPreview(true);
                } catch {}
              }}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,.15)",
                background: useDataUrlPreview ? "#0f172a" : "#fff",
                color: useDataUrlPreview ? "#fff" : "#0f172a",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              DataURL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
