// src/domain/schemas/pipeSchema.js
export const pipeSchema = {
  key: "pipe",
  id: "pipe",
  label: "배관설비",
  mode: "custom",

  checklist: [
    "유지관리 점검표 확인",
    "신축이음 상태",
    "경과연수에 따른 노후 및 부식 상태",
    "배관의 고정 지지 상태",
    "배관 열교환/두께 측정 점검(옵션)",
  ],

  photos: [
    { id: "criteria_photo", label: "현황 사진" },

    // P3 육안 #1
    { id: "pipe_maint_table", label: "유지관리 점검표" },
    { id: "pipe_guide_shoe", label: "기계실 팽창배관 가이드슈 상태" },
    { id: "pipe_exp_joint_cw", label: "냉각수 입상배관 신축이음 상태" },
    { id: "pipe_exp_joint_ws", label: "급수 횡주배관 신축이음 상태" },

    // P4 육안 #2
    { id: "pipe_support_hvac_cw", label: "공조용 냉수 횡주배관 지지대" },
    { id: "pipe_support_mech_room", label: "기계실 횡주배관 지지대" },
    { id: "pipe_support_pit_hot_end", label: "Pit실 온수 입상배관 말단부 지지대" },
    { id: "pipe_support_pit_ws_hot", label: "Pit실 급수/온수 입상배관 지지대" },

    // P5 두께 측정
    { id: "pipe_thk_points", label: "배관 두께 측정 포인터(사진)" },

    // P6 참고 이미지(선택)
    { id: "pipe_ref_calc", label: "측정 계산식/참고(선택)" },
  ],

  sections: [
    {
      title: "2. 배관 설비 육안 점검표",
      noteKey: "visual1",
      rows: 2,
      cols: 2,
      slots: [
        { id: "pipe_maint_table", label: "유지관리 점검표" },
        { id: "pipe_guide_shoe", label: "기계실 팽창배관 가이드슈 상태" },
        { id: "pipe_exp_joint_cw", label: "냉각수 입상배관 신축이음 상태" },
        { id: "pipe_exp_joint_ws", label: "급수 횡주배관 신축이음 상태" },
      ],
    },
    {
      title: "2. 배관 설비 육안 점검표",
      noteKey: "visual2",
      rows: 2,
      cols: 2,
      slots: [
        { id: "pipe_support_hvac_cw", label: "공조용 냉수 횡주배관 지지대" },
        { id: "pipe_support_mech_room", label: "기계실 횡주배관 지지대" },
        { id: "pipe_support_pit_hot_end", label: "Pit실 온수 입상배관 말단부 지지대" },
        { id: "pipe_support_pit_ws_hot", label: "Pit실 급수/온수 입상배관 지지대" },
      ],
    },
  ],
};
