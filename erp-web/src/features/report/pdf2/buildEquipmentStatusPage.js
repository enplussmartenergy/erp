// src/features/report/pdf2/buildEquipmentStatusPage.js
import autoTable from "jspdf-autotable";

/* ───────── 공통 상수 ───────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
// ✅ 프레임 안쪽 여유(건물현황 페이지와 동일)
const SAFE = { L: FRAME.L + 4, R: FRAME.R + 4 };
const BLACK = 0;

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

function setKR(doc) {
  doc.setFont("NotoSansKR", "normal");
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
}

function pageChrome(doc, title, frame = FRAME, pageInfo = "") {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(14.5);
  doc.text(title, frame.L + 8, 16);

  if (pageInfo) {
    doc.setFont("NotoSansKR", "normal");
    doc.setFontSize(10);
    doc.text(pageInfo, W - (frame.R + 8), 16, { align: "right" });
  }

  doc.setLineWidth(0.6);
  doc.rect(frame.L, frame.T, W - frame.L - frame.R, H - frame.T - frame.B, "S");
  doc.setLineWidth(0.2);
}

function footerNo(doc, pageNo = 1) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);
  doc.text(String(pageNo), W / 2, H - 10, { align: "center" });
}

/* ───────── util ───────── */
const fmt = (v) => (v == null ? "" : String(v));
const safeArr = (v) => (Array.isArray(v) ? v : []);
const toInt = (v) => {
  const n = Math.floor(+v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * equipments: EquipmentStep에서 저장한 그대로
 * [
 *   { key, label, owned, count, details:[{ equipName, purpose, engineer, dateTxt, location, ...}] }
 * ]
 */
function buildEquipmentRows(equipments = []) {
  const ownedList = safeArr(equipments).filter((e) => e?.owned && toInt(e?.count) > 0);
  const rows = [];

  ownedList.forEach((eq) => {
    const count = toInt(eq.count);
    const details = safeArr(eq.details);
    const effective = Array.from({ length: count }).map((_, i) => details[i] || {});

    effective.forEach((d, idx) => {
      // ✅ 설비명 매핑: equipName 우선
      const name =
        fmt(d?.equipName) ||
        fmt(d?.model) ||
        fmt(d?.name) ||
        `${fmt(eq.label || eq.key)} ${idx + 1}호기`;

      // ✅ 용도 매핑: purpose 우선(레거시 use도 허용)
      const purpose = fmt(d?.purpose || d?.use || "");

      // ✅ 설치위치
      const location = fmt(d?.location || "");

      const qty = "1";

      if (idx === 0) {
        // 첫 줄: 설비구분 셀 rowSpan
        rows.push([
          {
            content: fmt(eq.label || eq.key),
            rowSpan: count,
            styles: { halign: "center", valign: "middle", fontStyle: "bold" },
          },
          { content: name, styles: { halign: "center" } },
          { content: purpose, styles: { halign: "center" } },
          { content: qty, styles: { halign: "center" } },
          { content: location, styles: { halign: "center" } },
        ]);
      } else {
        // ✅ 핵심 수정:
        // rowSpan 이어지는 줄은 "설비 구분" 컬럼 셀을 넣으면 안 됨(placeholder 금지)
        rows.push([
          { content: name, styles: { halign: "center" } },
          { content: purpose, styles: { halign: "center" } },
          { content: qty, styles: { halign: "center" } },
          { content: location, styles: { halign: "center" } },
        ]);
      }
    });
  });

  return rows.length
    ? rows
    : [[{ content: "점검대상 설비가 없습니다.", colSpan: 5, styles: { halign: "center" } }]];
}

/* ───────── 메인: 다. 점검 설비 현황 페이지 ───────── */
export function renderEquipmentStatusPage(
  doc,
  { equipments = [], pageNo = 1, totalPages = 1, titleSuffix = "" } = {}
) {
  setKR(doc);

  pageChrome(
    doc,
    `다. 점검 설비 현황${titleSuffix ? ` ${titleSuffix}` : ""}`,
    FRAME,
    totalPages ? `페이지 ${pageNo}/${totalPages}` : ""
  );

  const base = {
    theme: "grid",
    styles: {
      font: "NotoSansKR",
      fontSize: 9.2,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      cellPadding: { top: 2.0, right: 2.0, bottom: 2.0, left: 2.0 },
      valign: "middle",
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      fontStyle: "bold",
      halign: "center",
    },
  };

  const body = buildEquipmentRows(equipments);

  const y = FRAME.T + 8;

  autoTable(doc, {
    ...base,
    startY: y,
    margin: { left: SAFE.L, right: SAFE.R },
    tableWidth: innerWidth(doc),
    head: [["설비 구분", "설비명", "용도", "수량", "설치위치"]],
    body,
    columnStyles: {
      0: { cellWidth: innerWidth(doc) * 0.18, halign: "center" },
      1: { cellWidth: innerWidth(doc) * 0.24, halign: "center" },
      2: { cellWidth: innerWidth(doc) * 0.20, halign: "center" },
      3: { cellWidth: innerWidth(doc) * 0.10, halign: "center" },
      4: { cellWidth: innerWidth(doc) * 0.28, halign: "center" },
    },
  });

  footerNo(doc, pageNo);
}
