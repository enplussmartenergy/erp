// src/features/report/pdf2/PdfPreviewCoolTowerJs.jsx
/** @jsxImportSource @emotion/react */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { buildCoolTowerPdf } from "./buildCoolTowerPdf";

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

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS가 Mac처럼 찍히는 경우도 있어 touch로 보정
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document);
}

export default function PdfPreviewCoolTowerJs({
  onClose,
  fileName = "냉각탑_성능점검표.pdf",
  building,
  reportMeta,
  report,
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ stale 방지: url/blob은 ref로 관리
  const urlRef = useRef("");
  const blobRef = useRef(null);

  const deps = useMemo(() => ({ building, reportMeta, report }), [building, reportMeta, report]);

  const revokeUrl = useCallback((url) => {
    try {
      if (url) URL.revokeObjectURL(url);
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!report) {
        // report 없으면 정리
        revokeUrl(urlRef.current);
        urlRef.current = "";
        blobRef.current = null;
        setBlobUrl("");
        setError("");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const blob = await buildCoolTowerPdf(deps);
        if (!alive) return;

        // 이전 URL 정리
        revokeUrl(urlRef.current);

        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        blobRef.current = blob;

        setBlobUrl(url);
      } catch (e) {
        if (!alive) return;
        console.error("buildCoolTowerPdf error", e);
        setError(e?.message || "PDF 생성 중 오류가 발생했습니다.");
        setBlobUrl("");
        blobRef.current = null;
        revokeUrl(urlRef.current);
        urlRef.current = "";
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      // ✅ 최신 urlRef를 revoke
      revokeUrl(urlRef.current);
      urlRef.current = "";
      blobRef.current = null;
    };
  }, [deps, revokeUrl]);

  const openInNewTab = useCallback(() => {
    const url = urlRef.current || blobUrl;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [blobUrl]);

  const handleDownload = useCallback(async () => {
    // iOS는 download 속성이 거의 안 먹어서, "열기" 또는 "공유"로 처리
    const url = urlRef.current || blobUrl;
    const blob = blobRef.current;

    if (!url) return;

    // ✅ 1) Web Share(가능하면 파일로 공유/저장)
    // iOS Safari 16+ / 일부 Android Chrome에서 동작
    try {
      if (blob && navigator.share && window.File) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        // canShare가 있으면 안전하게 체크
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fileName });
          return;
        }
      }
    } catch (e) {
      // 사용자가 취소해도 여기로 올 수 있으니 조용히 fallback
      console.warn("share fallback", e);
    }

    // ✅ 2) iOS는 새 탭으로 열어서 "공유/저장" 유도
    if (isIOS()) {
      openInNewTab();
      return;
    }

    // ✅ 3) 그 외(데스크탑/안드로이드 대부분)는 download로 시도
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [blobUrl, fileName, openInNewTab]);

  return (
    <div style={wrap}>
      <div style={bar}>
        <button type="button" onClick={onClose} style={{ padding: "6px 10px" }}>
          닫기
        </button>

        <button type="button" onClick={handleDownload} disabled={!blobUrl || loading} style={{ padding: "6px 10px" }}>
          PDF 다운로드
        </button>

        {/* ✅ 모바일/iframe 문제 대비: 새 탭 열기 버튼 */}
        <button type="button" onClick={openInNewTab} disabled={!blobUrl || loading} style={{ padding: "6px 10px" }}>
          새 탭으로 열기
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {loading ? "PDF 생성 중…" : blobUrl ? "프리뷰 준비 완료" : error ? "에러" : "대기"}
        </div>
      </div>

      <div style={iframeBox}>
        {error ? (
          <div style={{ color: "#fecaca", padding: 16, whiteSpace: "pre-wrap" }}>{error}</div>
        ) : blobUrl ? (
          // iOS에서 iframe blob이 흰 화면 나올 수 있음 → 그래도 일단 시도, 안 되면 "새 탭" 사용
          <iframe
            title="냉각탑 성능 점검 PDF"
            src={blobUrl}
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
          />
        ) : null}
      </div>
    </div>
  );
}
