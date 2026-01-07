// src/domain/equipment/schemas/heatExSchema.js

export const heatExSchema = {
  key: "heatEx",
  label: "열교환기",
  mode: "measuredCalc", // 폼/페이지 분기용(새 모드)

  // 1페이지 점검표 체크리스트(샘플)
  checklist: [
    { id: "maint_doc", label: "유지관리 점검표 확인" },
    { id: "aging_rust", label: "노후 및 부식 상태" },
    { id: "hx_eff", label: "열교환 효율 점검" },
    { id: "cond_temp", label: "응축수 배출 온도 상태(증기)" },
    { id: "safety_valve", label: "안전밸브 상태(증기)" },
    { id: "steam_trap", label: "증기트랩 상태(증기)" },
  ],

  // 사진 슬롯(키 100% 일치 중요)
  photos: [
    "criteria_photo",         // 2페이지 하단 현황사진 1장 크게
    "maint_table",            // 유지관리 점검표
    "aging_rust_photo",       // 노후/부식
    "safety_valve_photo",     // 안전밸브
    "circulation_pump_photo", // 순환펌프
    "thermal_steam_in",       // 열화상(증기입구)
    "temp_cond_out",          // 응축수 배출 온도
    "temp_hot_in",            // 온수 입구 온도
    "temp_hot_out",           // 온수 출구 온도
    "gauge_hot_pump",         // 온수 펌프 공급 압력
    "gauge_steam_head",       // 증기헤드 압력
    "flow_measure",           // 온수 유량 측정
    "flow_value",             // 온수 유량 측정값
  ],

  // 섹션(사진페이지 구성) - 네가 올린 샘플 3~5페이지 느낌으로
  sections: [
    {
      id: "visual",
      title: "2. 열교환기 육안 점검표",
      slots: ["maint_table", "aging_rust_photo", "safety_valve_photo", "circulation_pump_photo"],
      noteKey: "visual",
    },
    {
      id: "measure",
      title: "3. 열교환기 측정 점검표",
      slots: ["thermal_steam_in", "temp_cond_out", "temp_hot_in", "temp_hot_out"],
      noteKey: "measure",
    },
    {
      id: "flow",
      title: "4. 열교환기 측정 점검표",
      slots: ["gauge_hot_pump", "gauge_steam_head", "flow_measure", "flow_value"],
      noteKey: "flow",
    },
  ],

  // “측정 계산식” 입력 필드 정의 (폼 자동 렌더링/검증용)
  fields: {
    rated: {
      hxType: { label: "형식", type: "text" },          // 쉘튜브/판형 등
      maker: { label: "제조사", type: "text" },
      heatArea: { label: "전열면적", type: "number", unit: "㎡" },
      capacity: { label: "용량", type: "number", unit: "kcal/h" },
    },
    measured: {
      steamPressure: { label: "증기압력", type: "number", unit: "kg/cm²" },
      steamTemp: { label: "증기온도", type: "number", unit: "℃" },

      hotInTemp: { label: "온수 입구 온도", type: "number", unit: "℃" },
      hotOutTemp: { label: "온수 출구 온도", type: "number", unit: "℃" },
      hotFlow: { label: "온수 유량", type: "number", unit: "m³/h" },

      // 엔탈피는 “측정값(빨간)”로 취급할지 “표 기반 자동”으로 취급할지 선택 가능
      // 일단 입력값으로 두고, 추후 표 기반 자동 계산으로 바꿔도 구조 유지됨.
      hSteamIn: { label: "증기 엔탈피", type: "number", unit: "kcal/kg" },   // 빨간
      hCondOut: { label: "응축수 엔탈피", type: "number", unit: "kcal/kg" }, // 빨간
      waterRho: { label: "물 밀도", type: "number", unit: "kg/m³", default: 1000 }, // 자동 기본
      condRho: { label: "응축수 밀도(기준)", type: "number", unit: "kg/m³", default: 960 }, // 102℃ 기준값
    },
    notes: {
      actions: { label: "조치필요사항", type: "textarea" },
      followups: { label: "추진사항 목록", type: "textarea" },
      remark: { label: "비고", type: "textarea" },
      visual: { label: "점검 결과 사항(육안)", type: "textarea" },
      measure: { label: "점검 결과 사항(측정)", type: "textarea" },
      flow: { label: "점검 결과 사항(유량)", type: "textarea" },
      calc: { label: "점검 결과 사항(계산식)", type: "textarea" },
    },
  },
};
