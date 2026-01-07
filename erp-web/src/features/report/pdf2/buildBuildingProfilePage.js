// src/features/report/pdf2/buildBuildingProfilePage.js
import autoTable from "jspdf-autotable";

/* ───────── 공통 상수 ───────── */
const FRAME = { L: 10, R: 10, T: 20, B: 8 };
const SAFE = { L: FRAME.L + 4, R: FRAME.R + 4 };
const BLACK = 0;

function innerWidth(doc) {
  const W = doc.internal.pageSize.getWidth();
  return Math.max(40, W - SAFE.L - SAFE.R);
}

/* ───────── KR 세팅 ───────── */
function setKR(doc) {
  doc.setFont("NotoSansKR", "normal");
  doc.setTextColor(BLACK);
  doc.setDrawColor(BLACK);
}

/* ───────── 상단 크롬 ───────── */
function pageChrome(doc, title, frame = FRAME) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);

  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(14.5);
  doc.text(title, frame.L + 8, 16);

  doc.setLineWidth(0.6);
  doc.rect(frame.L, frame.T, W - frame.L - frame.R, H - frame.T - frame.B, "S");
  doc.setLineWidth(0.2);
}

/* ───────── 하단 페이지번호 ───────── */
function footerNo(doc, pageNo = 1) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setKR(doc);
  doc.setFont("NotoSansKR", "normal");
  doc.setFontSize(9);
  doc.text(String(pageNo), W / 2, H - 10, { align: "center" });
}

/* ───────── 데이터 유틸 ───────── */
const N = (x) => {
  const n = +String(x ?? "").replaceAll(",", "");
  return Number.isFinite(n) ? n : null;
};
const fmt = (v) => (v == null ? "" : String(v));
const fmtNum = (v) => {
  const n = N(v);
  return n == null ? "" : n.toLocaleString("ko-KR");
};
const joinAddr = (b) => [b?.addressRoad, b?.addressDetail].filter(Boolean).join(" ");

const toLabel = (isBasement, no) => (isBasement ? `B${no}` : `${no}`);
function normalizeFloors(input) {
  if (!Array.isArray(input) || !input.length) return [];
  return input.map((f) => {
    let isB = false,
      no = 1;
    if (typeof f.level === "string" && /^B\d+$/i.test(f.level)) {
      isB = true;
      no = parseInt(f.level.slice(1), 10) || 1;
    } else if (typeof f.level === "number" && f.level < 0) {
      isB = true;
      no = Math.abs(f.level);
    } else if (typeof f.level === "number") {
      isB = false;
      no = f.level;
    } else if (typeof f.isBasement === "boolean" && typeof f.no === "number") {
      isB = f.isBasement;
      no = f.no;
    }
    const isBasement = "isBasement" in f ? f.isBasement : isB;
    const num = "no" in f ? f.no : no;
    return {
      isBasement,
      no: num,
      label: f.label || toLabel(isBasement, num),
      zones: f.zones || "",
      use: f.use || "",
      area: f.area || "",
    };
  });
}

/* ───────── 페이지 렌더 ───────── */
export function renderBuildingProfilePage(
  doc,
  { building, floors, titleSuffix = "", pageNo = 1 } = {},
) {
  setKR(doc);

  const left = SAFE.L;
  const width = innerWidth(doc);

  pageChrome(doc, `건물 현황${titleSuffix ? ` ${titleSuffix}` : ""}`, FRAME);

  const base = {
    theme: "grid",
    styles: {
      font: "NotoSansKR",
      fontSize: 9,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
      cellPadding: { top: 1.8, right: 1.8, bottom: 1.8, left: 1.8 },
      valign: "middle",
      halign: "center", // ✅ 전부 가운데 정렬(요청)
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

  const b = building || {};

  const cellLabel = (t) => ({
    content: t,
    styles: { fontStyle: "bold", halign: "center" },
  });

  // ✅ 스샷처럼: 빈 박스 없도록 6컬럼 고정
  // [라벨, 값, 단위, 라벨, 값, 단위]
  // 특정 줄(업체명 등)은 값 colSpan=2로 단위칸까지 합쳐서 “깔끔하게”
  const rowsA = [
    [
      cellLabel("업체명"),
      { content: fmt(b.name), colSpan: 2 },
      cellLabel("대표"),
      { content: fmt(b.ceo), colSpan: 2 },
    ],
    [
      cellLabel("소재지"),
      { content: joinAddr(b), colSpan: 2 },
      cellLabel("전화번호"),
      { content: fmt(b.tel), colSpan: 2 },
    ],
    [
      cellLabel("팩스번호"),
      { content: fmt(b.fax), colSpan: 2 },
      cellLabel("주용도"),
      { content: fmt(b.buildingNo), colSpan: 2 },
    ],
    [
      cellLabel("건물용도"),
      { content: fmt(b.useType), colSpan: 2 },
      cellLabel("주구조"),
      { content: fmt(b.structure), colSpan: 2 },
    ],

    // ✅ 여기서부터 “빈 박스 제거” 핵심(단위 칸을 실제로 사용)
    [
      cellLabel("용적률"),
      { content: fmtNum(b.floorAreaRatio) },
      { content: "[%]" },
      cellLabel("건폐율"),
      { content: fmtNum(b.buildingCoverage) },
      { content: "[%]" },
    ],
    [
      cellLabel("대지면적"),
      { content: fmtNum(b.siteArea) },
      { content: "[m²]" },
      cellLabel("연면적"),
      { content: fmtNum(b.grossFloorArea) },
      { content: "[m²]" },
    ],
    [
      cellLabel("에너지 사용량"),
      { content: fmtNum(b.energyToe) },
      { content: "[toe/년]" },
      cellLabel("에너지 사용금액"),
      { content: fmtNum(b.energyCostM) },
      { content: "[백만원/년]" },
    ],

    // ✅ 업무담당자 (스샷 형태로 2줄 구성)
    [
      {
        content: "업무담당자",
        colSpan: 6,
        styles: { fontStyle: "bold", halign: "center", fillColor: [245, 245, 245] },
      },
    ],
    [
      cellLabel("담당부서"),
      { content: fmt(b.contactDept), colSpan: 2 },
      cellLabel("성명"),
      { content: fmt(b.contactName), colSpan: 2 },
    ],
    [
      cellLabel("직책"),
      { content: fmt(b.contactPosition), colSpan: 2 },
      cellLabel("E-mail"),
      { content: fmt(b.contactEmail), colSpan: 2 },
    ],
  ];

  autoTable(doc, {
    ...base,
    startY: FRAME.T + 14,
    margin: { left: SAFE.L, right: SAFE.R },
    tableWidth: width,
    body: rowsA,
    // ✅ 컬럼 폭: 라벨/값/단위/라벨/값/단위
    columnStyles: {
      0: { cellWidth: width * 0.16, halign: "center" }, // 라벨
      1: { cellWidth: width * 0.27, halign: "center" }, // 값
      2: { cellWidth: width * 0.07, halign: "center" }, // 단위
      3: { cellWidth: width * 0.16, halign: "center" }, // 라벨
      4: { cellWidth: width * 0.27, halign: "center" }, // 값
      5: { cellWidth: width * 0.07, halign: "center" }, // 단위
    },
  });

  let y = doc.lastAutoTable.finalY + 8;

  // ---- 나. 건물 용도 프로필 ----
  doc.setFont("NotoSansKR", "bold");
  doc.setFontSize(11);
  doc.text("나. 건물 용도 프로필", left + 1.5, y);
  y += 4;

  const floorsNorm = normalizeFloors(floors);
  const bodyB = (floorsNorm.length ? floorsNorm : [{ label: "", zones: "", use: "", area: "" }]).map((f) => [
    "주",
    f.label,
    fmt(f.zones),
    fmt(f.use),
    fmtNum(f.area),
  ]);

  autoTable(doc, {
    ...base,
    startY: y + 2,
    margin: { left: SAFE.L, right: SAFE.R },
    tableWidth: width,
    pageBreak: "avoid",
    head: [["구분", "번호", "구획/주요실", "용도", "면적 (m²)"]],
    body: bodyB,
    columnStyles: {
      0: { cellWidth: width * 0.10, halign: "center" },
      1: { cellWidth: width * 0.12, halign: "center" },
      2: { cellWidth: width * 0.43, halign: "center" }, // ✅ 가운데로 통일
      3: { cellWidth: width * 0.15, halign: "center" },
      4: { cellWidth: width * 0.20, halign: "center" }, // ✅ 숫자도 가운데(요청)
    },
  });

  footerNo(doc, pageNo);
}
