// src/domain/equipment/schemas/waterHot.js

// 사진 전용 섹션들 (2x2 그리드 + 비고)
export const waterHotSchema = {
  key: "waterHot",
  mode: "photoOnly",          // ★ ReportBodyStep에서 이걸 기준으로 PhotoOnlyForm 렌더
  checklist: [],              // 사진전용은 체크리스트 없음
  sections: [
    {
      id: "hot_overview",
      title: "2. 급탕설비 육안 점검표",
      rows: 2, cols: 2,
      slots: [
        { id: "doc_list",     label: "급수·급탕설비 유지관리 점검표" },
        { id: "sv_safety",    label: "급탕용 안전밸브(정격 10kgf/cm²) 이하" },
        { id: "hot_pump_p",   label: "급탕 순환펌프 압력 측정" },
        { id: "hot_out_temp", label: "2차측 급탕 온도 60℃ 이하(정상)" },
      ],
      noteKey: "hot_overview_note",
      noteLabel: "결과/비고",
    },
    {
      id: "hot_trap",
      title: "3. 급탕설비 증기트랩 점검",
      rows: 2, cols: 2,
      slots: [
        { id: "trap_dir_1", label: "열교환기 스팀트랩 방향(정상)" },
        { id: "trap_op_1",  label: "스팀트랩 작동 체크" },
        { id: "trap_dir_2", label: "열교환기 스팀트랩 방향(정상)" },
        { id: "trap_op_2",  label: "스팀트랩 작동 체크" },
      ],
      noteKey: "hot_trap_note",
      noteLabel: "결과/비고",
    },
    {
      id: "cold_pump",
      title: "4. 급수설비 육안 점검표",
      rows: 2, cols: 2,
      slots: [
        { id: "ctrl_screen",  label: "급수펌프 콘트롤화면 상태" },
        { id: "inline_pumps", label: "기계실 인라인 급수펌프 상태" },
        { id: "pressure_tank",label: "급수펌프용 압력탱크 상태" },
        { id: "tank_gauge",   label: "압력탱크 압력 정상작동" },
      ],
      noteKey: "cold_pump_note",
      noteLabel: "결과/비고",
    },
  ],
};
