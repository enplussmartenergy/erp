// src/domain/schemas/sanitarySchema.js

export const sanitaryFixtureSchema = {
  id: "sanitaryFixture",
  key: "sanitaryFixture",
  label: "위생기구설비",
  mode: "photoOnly", // ✅ 여기 중요: photoOnly여야 기존 흐름(폼/프리뷰/빌더)랑 맞음

  photos: [
    { id: "criteria_photo", label: "현황 사진" },

    // 육안
    { id: "sv_vis_maint_table", label: "유지관리 점검표" },
    { id: "sv_vis_gj2_male_sink", label: "남자화장실 소재 싱크 상태" },
    { id: "sv_vis_ss3_female_sink1", label: "남자화장실 세면대 수전 트랩 점검" },
    { id: "sv_vis_gj1_female_sink", label: "여자화장실 세면대 수전 트랩 점검" },

    // 측정 #1
    { id: "sv_meas_gj2_female_tap", label: "여자화장실 수격 작동 점검" },
    { id: "sv_meas_ss3_male_tap", label: "남자화장실 수격 작동 점검" },
    { id: "sv_meas_gj1_male_urinal", label: "남자화장실 소변기 점검" },
    { id: "sv_meas_ssL_toilet", label: "양변기 작동 및 배수 상태 점검" },

    // 측정 #2
    { id: "sv_meas_gj2_aircurtain", label: "화장실 동파방지 난방기 상태" },
    { id: "sv_meas_ss3_aircurtain", label: "화장실 동파방지 난방기 상태" },
    { id: "sv_meas_top_pressure", label: "최상층 수전 수압 상태" },
    { id: "sv_meas_low_pressure", label: "최하층 수전 수압 상태" },
  ],

  sections: [
    {
      id: "visual_page",
      title: "위생기구설비 육안 점검표 #1",
      rows: 2,
      cols: 2,
      slots: [
        { id: "sv_vis_maint_table", label: "유지관리 점검표" },
        { id: "sv_vis_gj2_male_sink", label: "남자화장실 소재 싱크 상태" },
        { id: "sv_vis_ss3_female_sink1", label: "남자화장실 세면대 수전 트랩 점검" },
        { id: "sv_vis_gj1_female_sink", label: "여자화장실 세면대 수전 트랩 점검" },
      ],
      noteKey: "sv_visual_note",
    },
    {
      id: "measure_page_1",
      title: "위생기구설비 측정 점검표 #1",
      rows: 2,
      cols: 2,
      slots: [
        { id: "sv_meas_gj2_female_tap", label: "여자화장실 수격 작동 점검" },
        { id: "sv_meas_ss3_male_tap", label: "남자화장실 수격 작동 점검" },
        { id: "sv_meas_gj1_male_urinal", label: "남자화장실 소변기 점검" },
        { id: "sv_meas_ssL_toilet", label: "양변기 작동 및 배수 상태 점검" },
      ],
      noteKey: "sv_measure_note_1",
    },
    {
      id: "measure_page_2",
      title: "위생기구설비 측정 점검표 #2",
      rows: 2,
      cols: 2,
      slots: [
        { id: "sv_meas_gj2_aircurtain", label: "화장실 동파방지 난방기 상태" },
        { id: "sv_meas_ss3_aircurtain", label: "화장실 동파방지 난방기 상태" },
        { id: "sv_meas_top_pressure", label: "최상층 수전 수압 상태" },
        { id: "sv_meas_low_pressure", label: "최하층 수전 수압 상태" },
      ],
      noteKey: "sv_measure_note_2",
    },
  ],

  fields: {},
};

// ✅ (선택) 기존 이름으로도 쓰는 코드가 있으면 alias도 같이 제공
export const sanitarySchema = sanitaryFixtureSchema;
