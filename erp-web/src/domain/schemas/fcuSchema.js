// src/domain/equipment/schemas/fcuSchema.js
export const fcuSchema = {
  key: "fcu",
  label: "팬코일유닛(FCU)",
  mode: "unitList", // photoOnly랑 다른 타입(호수/강의실 단위 리스트)
  version: 1,

  /* ✅ 표지 체크리스트(1페이지) */
  checklist: [
    "유지 관리 점검표",
    "노후 및 부식 상태",
    "전동밸브 정상 작동 상태",
    "조닝 점검 상태",
    "팬코일 풍량 조절 상태",
    "필터 오염 상태",
  ],

  /* ✅ 2페이지 기준/현황사진: 1장 크게 */
  criteria: {
    title: "팬코일유닛 성능 점검 단계 및 점검 기준",
    photoId: "criteria_photo",
  },

  /* ✅ 호수/강의실 1개당 “필수 사진 슬롯” (그래프는 항상 필수) */
  unit: {
    kinds: [
      { key: "room", label: "객실" },
      { key: "classroom", label: "강의실" },
    ],

    // 호수/강의실별 입력 필드(테이블/요약표에 사용)
    fields: [
      { id: "noiseDb", label: "소음", unit: "dB" },
      { id: "wind1", label: "풍속1", unit: "m/s" },
      { id: "wind2", label: "풍속2", unit: "m/s" },
      { id: "wind3", label: "풍속3", unit: "m/s" },
      { id: "note", label: "비고", unit: "" },
    ],

    // ✅ 사진 슬롯(호수 1개 단위) — 그래프는 필수
    photoSlots: [
      { id: "roomSign", label: "객실번호/호수", required: true },
      { id: "noise", label: "소음 측정", required: true },
      { id: "wind", label: "풍속 측정", required: true },
      { id: "graph", label: "그래프", required: true }, // ✅ 항상 들어감
      { id: "unit", label: "팬코일 유닛/필터", required: true },
    ],
  },

  /* ✅ PDF에서 반복되는 “호수 묶음 페이지” 설정 */
  pdf: {
    // 1페이지 표지 + 1페이지 기준/현황 + N페이지(호수/강의실)
    pages: {
      cover: true,
      criteria: true,
      unitPages: true,
    },

    // 한 페이지에 몇 “호수”를 넣을지 (샘플이 5개/페이지라면 5)
    unitsPerPage: 5,

    // 호수 페이지 테이블 컬럼 정의(샘플 그대로)
    unitTableColumns: [
      { key: "idx", label: "순번" },
      { key: "no", label: "객실번호" }, // kind=classroom이면 "강의실"로 표시하도록 PDF에서 분기
      { key: "noise", label: "소음" },
      { key: "wind", label: "풍속" },
      { key: "graph", label: "그래프" },
      { key: "note", label: "비고" },
    ],
  },

  /* ✅ 저장 기본값 생성용(ReportBodyStep init에서 사용) */
  initValue() {
    return {
      config: {
        hasClassroom: false,
        roomCount: 0,
        classroomCount: 0,

        // 호수 생성 규칙(기본은 수동)
        numbering: {
          mode: "manual", // "range" 가능
          start: 351,
          step: 2,
          count: 0,
          manualListText: "", // "351,353,355" 또는 줄바꿈 입력 지원(폼에서 파싱)
        },
      },

      // 호수/강의실 단위 데이터(개수 따라 자동 생성/유지)
      units: [],

      // 2페이지 현황사진
      photoSlots: {
        criteria_photo: [],
      },

      // 표지/섹션 메모
      notes: {
        engineer: "",
        actions: "",
        remark: "",
        // 선택: 전체 요약 특이사항
        summary: "",
      },
    };
  },
};
