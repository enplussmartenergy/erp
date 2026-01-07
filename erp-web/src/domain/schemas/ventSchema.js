// src/features/report/domain/equipment/schemas/ventSchema.js

export const ventSchema = {
  key: "vent",
  label: "환기설비",
  mode: "photoAndCalc",

  checklist: [],

  /* ------------------------------------------------------------------
    1) 점검 기준 · 현황사진 페이지
    criteria_photo : 환기설비 점검 기준/단계 페이지 아래 현황 사진
  ------------------------------------------------------------------ */
  criteriaSlots: [{ id: "criteria_photo", label: "현황 사진" }],

  /* ------------------------------------------------------------------
    2) 육안 점검 페이지 (환기설비 육안 점검표 #1)
  ------------------------------------------------------------------ */
  visualSection: {
    id: "vent_visual_1",
    title: "환기설비 육안 점검표 #1",
    rows: 2,
    cols: 2,
    slots: [
      { id: "vt_maint_table", label: "유지관리 점검표" },
      { id: "vt_motor_status", label: "노후 및 부식 상태" },
      { id: "vt_fix_status", label: "고정 장치 및 풀림 상태" },
      { id: "vt_co2", label: "CO₂ 측정" },
    ],
    noteKey: "vt_visual_note",
    noteLabel: "점검 결과 사항",
  },

  /* ------------------------------------------------------------------
    3) 풍량 · 전력 측정 페이지 (환기설비 측정 점검표 #1)
  ------------------------------------------------------------------ */
  measureSection: {
    id: "vent_measure_1",
    title: "환기설비 측정 점검표 #1",
    rows: 2,
    cols: 2,
    slots: [
      { id: "vt_voltage", label: "가동 시 전압 측정" },
      { id: "vt_current", label: "가동 시 전류 측정" },
      { id: "vt_flow_graph", label: "배기 풍량 측정 그래프" },
      { id: "vt_extra", label: "추가 사진(필요 시)" },
    ],
    noteKey: "vt_measure_note",
    noteLabel: "측정 결과 사항",
  },
};

export default ventSchema;
