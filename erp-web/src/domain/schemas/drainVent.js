// src/domain/equipment/schemas/drainVentSchema.js
// 오·배수(통기/우수배수) 설비 - 사진전용 스키마
export const drainVentSchema = {
  key: "drainVent",
  mode: "photoOnly",
  checklist: [],

  // 표지/기준 페이지의 현황사진은 PhotoOnlyForm에 공용으로 있는 criteria_photo 사용
  sections: [
    {
      id: "dv_visual_1",
      title: "2. 오·배수 및 우수 배관 설비 육안 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "dv_doc_list", label: "유지관리 점검표" },
        { id: "dv_ctl_screen", label: "배수/우수 수위정보 자동제어 화면" },
        { id: "dv_pipe_a", label: "기계실 배관 상태 #1" },
        { id: "dv_pipe_b", label: "기계실 배관 상태 #2" },
      ],
      noteKey: "dv_visual_1_note",
      noteLabel: "점검 결과 사항",
    },
    {
      id: "dv_manhole",
      title: "4. 오·배수 및 우수 배관 설비 육안 점검표",
      rows: 4,
      cols: 2, // 위 2장 + 아래 6장 = 총 8칸
      slots: [
        { id: "dv_top_a", label: "기계실 오배수 입상배관" },
        { id: "dv_top_b", label: "기계실 오배수 횡주배관" },
        { id: "dv_mh_1", label: "맨홀 #1" },
        { id: "dv_mh_2", label: "맨홀 #2" },
        { id: "dv_mh_3", label: "맨홀 #3" },
        { id: "dv_mh_4", label: "맨홀 #4" },
        { id: "dv_mh_5", label: "맨홀 #5" },
        { id: "dv_mh_6", label: "맨홀 #6" },
      ],
      noteKey: "dv_manhole_note",
      noteLabel: "점검 결과 사항",
    },
    {
      id: "dv_pump_run_1",
      title: "5. 배수펌프 작동 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "dv_plan", label: "Pit/펌프 배치도" },
        { id: "dv_pump_area", label: "배수펌프 배관/밸브 상태" },
        { id: "dv_working", label: "배수펌프 오토키 작동 점검" },
        { id: "dv_panel_led", label: "제어반 Panel 램프/스위치" },
      ],
      noteKey: "dv_pump_run_1_note",
      noteLabel: "점검 결과 사항",
    },
    {
      id: "dv_pump_run_2",
      title: "6. 배수펌프 작동 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "dv_gauge_stop", label: "정지 시 압력게이지" },
        { id: "dv_gauge_run", label: "작동 시 압력게이지" },
        { id: "dv_ir_1", label: "절연저항 측정 #1" },
        { id: "dv_ir_2", label: "절연저항 측정 #2" },
      ],
      noteKey: "dv_pump_run_2_note",
      noteLabel: "점검 결과 사항",
    },
  ],
};
