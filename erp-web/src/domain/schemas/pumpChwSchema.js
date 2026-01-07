// src/domain/schemas/pumpChwSchema.js

export const pumpChwSchema = {
  key: "pumpChw",
  label: "펌프(냉수)",
  mode: "calc",
  checklist: ["유지 관리 점검표", "이상 소음/진동", "유량/양정/동력 적정"],
  sections: [
    {
      id: "pump_visual",
      title: "펌프 육안 점검표",
      slots: [
        { id: "pump_maint_table", label: "유지관리 점검표" },
        { id: "pump_base_coupling", label: "베이스 앵커볼트 노후 및 풀림 상태" },
        { id: "pump_shaft_wear", label: "샤프트 및 패킹 마모 상태 점검" },
        { id: "pump_pressure_gauge", label: "펌프 압력 게이지 점검" },
      ],
      noteKey: "visual",
    },
    {
      id: "pump_measure_1",
      title: "펌프 측정 점검표(1)",
      slots: [
        { id: "pump_noise", label: "가동 시 모터 소음 점검" },
        { id: "pump_vib", label: "가동 시 모터 진동 점검" },
        { id: "pump_overheat_temp", label: "베어링 및 모터 과열 온도 점검" },
        { id: "pump_breaker", label: "이상 전류 차단 장치 동작 상태" },
      ],
      noteKey: "measure",
    },
    {
      id: "pump_measure_2",
      title: "펌프 측정 점검표(2)",
      slots: [
        { id: "pump_voltage", label: "모터 전압 측정" },
        { id: "pump_current", label: "모터 전류 측정" },
        { id: "pump_ultra_flow", label: "초음파 유량 측정" },
        { id: "pump_ultra_flow_value", label: "초음파 유량 측정값" },
      ],
    },
    { id: "pump_result_perf", title: "펌프 성능 점검 결과 수치표(성능)" },
    { id: "pump_result_nv", title: "펌프 성능 점검 결과 수치표(소음/진동)" },
  ],
};

// ✅ PhotoSlotGrid가 바로 쓸 수 있게 photos를 자동 생성해서 export에 붙여줌
pumpChwSchema.photos = pumpChwSchema.sections
  .flatMap((sec) => sec.slots || [])
  .map((s) => ({
    id: s.id,
    label: s.label,
    max: 1,
  }));
