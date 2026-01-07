// src/domain/equipment/registry.js
import { airCompSchema } from "../schemas/airComp";
import { genericSchema } from "../schemas/generic";
import { waterHotSchema } from "../schemas/waterHot";
import { waterTankSchema } from "../schemas/waterTank";
import { drainVentSchema } from "../schemas/drainVent";
import { wasteWaterSchema } from "../schemas/wasteWater";
import { ventSchema } from "../schemas/ventSchema";
import { sanitaryFixtureSchema } from "../schemas/sanitarySchema";
import { packageAcSchema } from "../schemas/packageAcSchema";
import { pumpChwSchema } from "../schemas/pumpChwSchema";

// ✅ 냉각탑
import { coolTowerSchema } from "../schemas/coolTowerSchema";
// ✅ 열교환기
import { heatExSchema } from "../schemas/heatExSchema";
// ✅ 배관설비
import { pipeSchema } from "../schemas/pipeSchema";
// ✅ 냉온수기
import { coldHotSchema } from "../schemas/coldHotSchema";

// ✅ 팬코일유닛(FCU)
import { fcuSchema } from "../schemas/fcuSchema";

export const EQUIP_TYPES = [
  { key: "boiler",          label: "보일러" },
  { key: "chiller",         label: "냉동기" },
  { key: "coolTower",       label: "냉각탑" },
  { key: "heatEx",          label: "열교환기" },
  { key: "pipe",            label: "배관설비" },

  // ✅ 추가
  { key: "coldHot",         label: "냉온수기" },
  { key: "fcu",             label: "팬코일유닛(FCU)" },

  { key: "airComp",         label: "공기조화기(AHU)" },
  { key: "vent",            label: "환기설비" },
  { key: "packageAc",       label: "패키지 에어컨" },
  { key: "pumpChw",         label: "펌프(냉수) 성능점검표" },
  { key: "waterHot",        label: "급수·급탕" },
  { key: "waterTank",       label: "고·저수조" },
  { key: "drainVent",       label: "오·배수/통기/우수배수" },
  { key: "wasteWater",      label: "오수 정화 설비" },
  { key: "sanitaryFixture", label: "위생기구설비" },
];

const REGISTRY = {
  airComp:         airCompSchema,
  vent:            ventSchema,
  packageAc:       packageAcSchema,
  pumpChw:         pumpChwSchema,
  coolTower:       coolTowerSchema,
  heatEx:          heatExSchema,
  pipe:            pipeSchema,

  // ✅ 추가
  coldHot:         coldHotSchema,
  fcu:             fcuSchema,

  waterHot:        waterHotSchema,
  waterTank:       waterTankSchema,
  drainVent:       drainVentSchema,
  wasteWater:      wasteWaterSchema,
  sanitaryFixture: sanitaryFixtureSchema,
  generic:         genericSchema,

  // alias
  ahu:             airCompSchema,
};

export const getSchema = (key) => REGISTRY[key] || genericSchema;
export const listKeys = () => Object.keys(REGISTRY);
export const getLabel = (key) =>
  EQUIP_TYPES.find((t) => t.key === key)?.label || key;
