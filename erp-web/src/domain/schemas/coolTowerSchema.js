// src/domain/schemas/coolTowerSchema.js
export const coolTowerSchema = {
  key: "coolTower",
  label: "냉각탑",
  mode: "custom", // photoOnly 아님
  checklist: [
    "유지관리 점검표 확인",
    "냉각탑 수조 상태",
    "노후 및 부식 상태",
    "살수 장치 상태",
    "송풍기 회전 상태",
    "충진물 상태",
    "송풍기 소음 상태",
    "냉각수 유량 상태",
    "부하 전류 상태",
    "레지오넬라균 관리(수질검사 등)",
  ],
  // ✅ slot id를 이 파일 기준으로 “고정”
  photos: [
    { id: "criteria_photo",   label: "현황 사진" },

    // 육안 #1
    { id: "ct_maint_table",   label: "유지관리 점검표" },
    { id: "ct_rust_state",    label: "노후 및 부식 상태" },
    { id: "ct_fill_state",    label: "냉각탑 충진물 상태" },
    { id: "ct_water_basin",   label: "냉각수 수조 및 분출 작동 상태" },

    // 육안 #2
    { id: "ct_strainer",      label: "살수 장치 상태" },
    { id: "ct_fan_rotation",  label: "송풍기 회전 상태" },
    { id: "ct_anchor_state",  label: "냉각탑 고정 상태" },
    { id: "ct_motor_noise",   label: "송풍기 모터 소음 측정" },

    // 측정
    { id: "ct_flow_measure",  label: "냉각수 유량 측정" },
    { id: "ct_flow_value",    label: "냉각수 유량 측정값" },
    { id: "ct_voltage",       label: "냉각수 송풍기 전압 측정" },
    { id: "ct_current",       label: "냉각수 송풍기 전류 측정" },
  ],
};
