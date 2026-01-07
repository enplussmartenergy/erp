// src/domain/equipment/schemas/packageAcSchema.js
export const packageAcSchema = {
  key: "packageAc",
  label: "패키지 에어컨",
  mode: "calc",
  checklist: ["유지/누설 상태", "이상 소음/진동", "전기/결선 상태"],

  // ✅ 중요: init/normalize에서 photoSlots 키가 날아가지 않게 최상위 photos를 명시
  // - Form/PDF에서 사용하는 id와 100% 동일해야 함
  photos: [
    // PAGE2 현황사진 2장
    { id: "criteria_outdoor", label: "현황 사진(실외기)" },
    { id: "criteria_indoor", label: "현황 사진(실내기)" },

    // PAGE3(육안) 4장
    { id: "pk_maint_table", label: "유지 관리 점검표" },
    { id: "pk_outdoor_status", label: "실외기 외관/고정 상태" },
    { id: "pk_indoor_status", label: "실내기 필터 점검" },
    { id: "pk_overheat_status", label: "과열차단기 작동상태" },

    // PAGE4(측정) 4장
    { id: "pk_filter", label: "실외기 가동 시 소음 측정" },
    { id: "pk_noise_meas", label: "실내기 가동 시 소음 측정" },
    { id: "pk_flow_meas", label: "실내기 풍량 측정" },
    { id: "pk_flow_graph", label: "풍량 조절 측정 결과" },
  ],

  sections: [
    // ✅ PAGE2도 sections로 명시(스키마 기준으로 슬롯 “공식 등록”)
    {
      id: "pk_criteria",
      title: "패키지에어컨 성능 점검 단계 및 점검 기준",
      slots: [
        { id: "criteria_outdoor", label: "현황 사진(실외기)" },
        { id: "criteria_indoor", label: "현황 사진(실내기)" },
      ],
    },

    {
      id: "pk_visual",
      title: "패키지에어컨 육안 점검표",
      slots: [
        { id: "pk_maint_table", label: "유지 관리 점검표" },
        { id: "pk_outdoor_status", label: "실외기 외관/고정 상태" },
        { id: "pk_indoor_status", label: "실내기 필터 점검" },
        { id: "pk_overheat_status", label: "과열차단기 작동상태" },
      ],
      // ✅ Form / buildPackageAcPdf에서 notes.pk_visual_note 사용
      noteKey: "pk_visual_note",
    },

    {
      id: "pk_measure",
      title: "패키지에어컨 측정 점검표",
      slots: [
        { id: "pk_filter", label: "실외기 가동 시 소음 측정" },
        { id: "pk_noise_meas", label: "실내기 가동 시 소음 측정" },
        { id: "pk_flow_meas", label: "실내기 풍량 측정" },
        { id: "pk_flow_graph", label: "풍량 조절 측정 결과" },
      ],
      // ✅ Form / buildPackageAcPdf에서 notes.pk_measure_note 사용
      noteKey: "pk_measure_note",
    },

    { id: "pk_result", title: "패키지에어컨 성능 점검 결과 수치표" },
  ],
};
