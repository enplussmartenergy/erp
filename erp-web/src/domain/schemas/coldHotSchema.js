// src/domain/schemas/coldHotSchema.js
export const coldHotSchema = {
  key: "coldHot",
  label: "냉온수기",
  mode: "calc",
  checklist: ["유지/누설 상태", "이상 소음/진동", "배기가스/연소 상태"],

  // ✅ init/normalize에서 photoSlots 키 보존용 (packageAc처럼 최상위 photos 필수)
  photos: [
    { id: "criteria_photo", label: "현황 사진(기준/현황)" },

    // 육안 점검 #1
    { id: "ch_maint_table", label: "유지 관리 점검표" },
    { id: "ch_rust_state", label: "부식 상태" },
    { id: "ch_alarm_state", label: "경보/이상 상태" },
    { id: "ch_mano_vacuum", label: "마노미터/진공 상태" },

    // 육안 점검 #2
    { id: "ch_valve_state", label: "밸브 상태" },
    { id: "ch_interlock_panel", label: "인터록/패널 상태" },
    { id: "ch_level_sight", label: "레벨/사이트글라스" },
    { id: "ch_liquid_valve", label: "액밸브/배관 상태" },

    // 육안 점검 #3
    { id: "ch_head_pressure", label: "헤드 압력계" },
    { id: "ch_connected_head", label: "연결부/헤드 상태" },
    { id: "ch_exhaust_measure", label: "배기가스 측정 장비" },
    { id: "ch_exhaust_value", label: "배기가스 측정값" },

    // 측정 점검 #1
    { id: "ch_abs_pressure", label: "절대압" },
    { id: "ch_burner_state", label: "버너 상태" },
    { id: "ch_lpg_meter", label: "가스/유량계" },
    { id: "ch_delta_t", label: "입출수 온도차" },

    // 배기가스 측정지(기준/측정지)
    { id: "ch_exhaust_sheet", label: "배기가스 측정지(기준/측정지)" },
  ],

  // 폼에서 섹션 기반으로 사용하려면 sections도 제공(선택)
  sections: [
    {
      id: "ch_visual_1",
      title: "2. 냉온수기 육안 점검표 #1",
      slots: [
        { id: "ch_maint_table", label: "유지 관리 점검표" },
        { id: "ch_rust_state", label: "부식 상태" },
        { id: "ch_alarm_state", label: "경보/이상 상태" },
        { id: "ch_mano_vacuum", label: "마노미터/진공 상태" },
      ],
      noteKey: "visual1",
    },
    {
      id: "ch_visual_2",
      title: "2. 냉온수기 육안 점검표 #2",
      slots: [
        { id: "ch_valve_state", label: "밸브 상태" },
        { id: "ch_interlock_panel", label: "인터록/패널 상태" },
        { id: "ch_level_sight", label: "레벨/사이트글라스" },
        { id: "ch_liquid_valve", label: "액밸브/배관 상태" },
      ],
      noteKey: "visual2",
    },
    {
      id: "ch_visual_3",
      title: "3. 냉온수기 육안 점검표 #3",
      slots: [
        { id: "ch_head_pressure", label: "헤드 압력계" },
        { id: "ch_connected_head", label: "연결부/헤드 상태" },
        { id: "ch_exhaust_measure", label: "배기가스 측정 장비" },
        { id: "ch_exhaust_value", label: "배기가스 측정값" },
      ],
      noteKey: "visual3",
    },
    {
      id: "ch_measure_1",
      title: "3. 냉온수기 측정 점검표 #1",
      slots: [
        { id: "ch_abs_pressure", label: "절대압" },
        { id: "ch_burner_state", label: "버너 상태" },
        { id: "ch_lpg_meter", label: "가스/유량계" },
        { id: "ch_delta_t", label: "입출수 온도차" },
      ],
      noteKey: "measure1",
    },
  ],
};
