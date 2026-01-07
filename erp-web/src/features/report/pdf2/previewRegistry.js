// src/features/report/pdf2/previewRegistry.js
import PdfPreviewJs from "./PdfPreviewJs";
import PdfPreviewColdHotJs from "./PdfPreviewColdHotJs";
import PdfPreviewCoolTowerJs from "./PdfPreviewCoolTowerJs";
import PdfPreviewHeatExJs from "./PdfPreviewHeatExJs";
import PdfPreviewPackageAcJs from "./PdfPreviewPackageAcJs";
import PdfPreviewPipeJs from "./PdfPreviewPipeJs";
import PdfPreviewPumpChwJs from "./PdfPreviewPumpChwJs";
import PdfPreviewSanitaryFixtureJs from "./PdfPreviewSanitaryFixtureJs";
import PdfPreviewVentJs from "./PdfPreviewVentJs";
import PdfPreviewWasteWaterJs from "./PdfPreviewWasteWaterJs";
import PdfPreviewWaterHotJs from "./PdfPreviewWaterHotJs";
import PdfPreviewWaterTankJs from "./PdfPreviewWaterTankJs";
import PdfPreviewDrainVentJs from "./PdfPreviewDrainVentJs";

// ✅ FCU
import PdfPreviewFcuJs from "./PdfPreviewFcuJs";

/**
 * key -> PDF 미리보기 컴포넌트
 * (스크린샷에 있는 것들 기준으로 전부 넣음)
 */
export const PDF_PREVIEW_BY_KEY = {
  // AHU(airComp) 통합/기본 프리뷰가 PdfPreviewJs인 구조
  airComp: PdfPreviewJs,

  coldHot: PdfPreviewColdHotJs,
  coolTower: PdfPreviewCoolTowerJs,
  heatEx: PdfPreviewHeatExJs,
  packageAc: PdfPreviewPackageAcJs,

  pipe: PdfPreviewPipeJs,
  pumpChw: PdfPreviewPumpChwJs,

  sanitaryFixture: PdfPreviewSanitaryFixtureJs,
  vent: PdfPreviewVentJs,

  wasteWater: PdfPreviewWasteWaterJs,
  waterHot: PdfPreviewWaterHotJs,
  waterTank: PdfPreviewWaterTankJs,
  drainVent: PdfPreviewDrainVentJs,

  // ✅ 추가
  fcu: PdfPreviewFcuJs,
};
