// 오수 정화 설비 설비 - 사진전용 스키마
// 표지/기준 페이지의 현황사진은 PhotoOnlyForm 공용 criteria_photo 사용

export const wasteWaterSchema = {
  key: "wasteWater",
  label: "오수 정화 설비",
  mode: "photoOnly",
  checklist: [],

  sections: [
    // 2페이지: 기준표 밑에 들어갈 육안점검/제어 관련 사진들
    {
      id: "ww_visual_panel",
      title: "2. 오수 정화 설비 육안 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "ww_doc_list",   label: "유지관리 점검표" },
        { id: "ww_ctl_panel",  label: "제어반(표시등/스위치) 상태" },
        { id: "ww_hmi_over",   label: "감시/제어 HMI 화면 #1" },
        { id: "ww_hmi_detail", label: "감시/제어 HMI 화면 #2" },
      ],
      noteKey: "ww_visual_panel_note",
      noteLabel: "점검 결과 사항",
    },

    // 3페이지: 공정 설비(탱크/배관) 위주 사진
    {
      id: "ww_visual_process",
      title: "3. 오수 정화 설비 육안 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "ww_tank_a",   label: "오수 정화 탱크/조 #1" },
        { id: "ww_tank_b",   label: "오수 정화 탱크/조 #2" },
        { id: "ww_pipe_room_a", label: "기계실 배관/밸브 상태 #1" },
        { id: "ww_pipe_room_b", label: "기계실 배관/밸브 상태 #2" },
      ],
      noteKey: "ww_visual_process_note",
      noteLabel: "점검 결과 사항",
    },

    // 4페이지: 현장 전경 + 기타 필요 사진
    {
      id: "ww_visual_field",
      title: "3. 오수 정화 설비 육안 점검표(현장 전경)",
      rows: 2,
      cols: 2,
      slots: [
        { id: "ww_room_over_1", label: "설비실 전경 #1" },
        { id: "ww_room_over_2", label: "설비실 전경 #2" },
        { id: "ww_room_detail_1", label: "상세 부위 #1" },
        { id: "ww_room_detail_2", label: "상세 부위 #2" },
      ],
      noteKey: "ww_visual_field_note",
      noteLabel: "점검 결과 사항",
    },

    // 5페이지: 방류수 검사서
    {
      id: "ww_discharge_report",
      title: "4. 오수정화설비 방류수 검사서",
      rows: 1,
      cols: 1,
      slots: [
        { id: "ww_report_scan", label: "방류수 수질 검사 성적서" },
      ],
      noteKey: "ww_discharge_report_note",
      noteLabel: "검사 결과 요약",
    },
  ],
};

export default wasteWaterSchema;
