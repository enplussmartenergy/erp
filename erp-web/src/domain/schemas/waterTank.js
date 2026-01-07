// 사진 전용 섹션들 (2x2 그리드 + 비고)
export const waterTankSchema = {
  key: "waterTank",
  mode: "photoOnly", // ReportBodyStep에서 PhotoOnlyForm/WaterTankForm로 렌더
  sections: [
    // 2. 고·저수조 육안 점검표
    {
      id: "tank_visual",
      title: "2. 고·저수조 육안 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "checklist_doc", label: "저수조 유지관리 점검표" },
        { id: "leak_crack",    label: "저수조 파손, 변형, 누수, 결로 상태" },
        { id: "panel_screen",  label: "저수조 판넬 수위센스 화면" },
        { id: "auto_ctrl",     label: "저수조 수위센스 자동제어 동작 상태" },
      ],
      noteKey: "tank_visual_note",
      noteLabel: "점검 결과 사항",
    },

    // 3. 고·저수조 측정 점검표
    {
      id: "tank_measure",
      title: "3. 고·저수조 측정 점검표",
      rows: 2,
      cols: 2,
      slots: [
        { id: "sensor_state", label: "저수조 수위센스 상태" },
        { id: "gauge_state",  label: "저수조 수위게이지 상태" },
        { id: "vent_state",   label: "저수조 내 볼탑 상태" },
        { id: "ladder_state", label: "저수조 내 사다리 상태" },
      ],
      noteKey: "tank_measure_note",
      noteLabel: "점검 결과 사항",
    },

    // 4. 수도시설(급수설비) 증빙 – 예: 청소필증/수질검사서
    {
      id: "tank_docs_1",
      title: "4. 수도시설(급수설비) 저수조 청소필증",
      rows: 1,
      cols: 1,
      slots: [
        { id: "clean_cert", label: "저수조 청소·소독 필증(원본 사진)" },
      ],
      noteKey: "tank_docs_1_note",
      noteLabel: "작성 방법 메모",
    },
    {
      id: "tank_docs_2",
      title: "4. 수도시설(급수설비) 저수조 수질검사서1",
      rows: 1,
      cols: 1,
      slots: [
        { id: "water_test_1", label: "수질검사 성적서 1" },
      ],
      noteKey: "tank_docs_2_note",
      noteLabel: "작성 방법 메모",
    },
    {
      id: "tank_docs_3",
      title: "4. 수도시설(급수설비) 저수조 수질검사서2",
      rows: 1,
      cols: 1,
      slots: [
        { id: "water_test_2", label: "수질검사 성적서 2" },
      ],
      noteKey: "tank_docs_3_note",
      noteLabel: "작성 방법 메모",
    },
  ],
};
