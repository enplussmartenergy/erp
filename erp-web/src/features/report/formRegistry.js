// src/features/report/formRegistry.js
import AHUForm from "./AHUForm";
import ColdHotForm from "./ColdHotForm";
import CoolTowerForm from "./CoolTowerForm";
import HeatExForm from "./HeatExForm";
import PackageAcForm from "./PackageAcForm";
import PhotoOnlyForm from "./PhotoOnlyForm";
import PipeForm from "./PipeForm";
import PumpChwForm from "./PumpChwForm";
import SanitaryFixtureForm from "./SanitaryFixtureForm";
import VentForm from "./VentForm";
import WaterTankForm from "./WaterTankForm";

// ✅ FCU
import FcuForm from "./FCUForm";

/**
 * key -> 폼 컴포넌트
 * - airComp(AHU)처럼 전용 폼
 * - photoOnly 계열(급수/급탕, 고저수조, 통기/우수/오배수 등)은 PhotoOnlyForm
 * - 나머지 설비는 전용 폼 있으면 추가
 */
export const FORM_BY_KEY = {
  airComp: AHUForm,

  coldHot: ColdHotForm,
  coolTower: CoolTowerForm,
  heatEx: HeatExForm,
  packageAc: PackageAcForm,

  pipe: PipeForm,
  pumpChw: PumpChwForm,

  sanitaryFixture: SanitaryFixtureForm,
  vent: VentForm,

  waterTank: WaterTankForm,

  // ✅ FCU
  fcu: FcuForm,

  // ✅ photoOnly 설비들(프로젝트 key에 맞춰 추가/수정)
  waterHot: PhotoOnlyForm,
  wasteWater: PhotoOnlyForm,
  drainVent: PhotoOnlyForm,
};
