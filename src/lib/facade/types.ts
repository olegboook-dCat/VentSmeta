export type CladdingId =
  | "porcelain"
  | "acp"
  | "fiber"
  | "stone"
  | "cassette"
  | "hpl"
  | "profile";

export type Fixing = "klyammer" | "rivet" | "hanger" | "screw";

export type SubsystemMaterial = "galvanized" | "aluminum" | "stainless";

export type Scheme = "vertical" | "hv" | "interfloor";

export type InsulationKind = "mineral" | "stonewool" | "pir";

export type InputMode = "simple" | "walls";

export type OpeningKind = "window" | "door";

export type SpecGroup =
  | "cladding"
  | "subsystem"
  | "insulation"
  | "fasteners"
  | "flashings"
  | "labor";

export interface Wall {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface Opening {
  id: string;
  kind: OpeningKind;
  width: number;
  height: number;
  count: number;
}

export interface Project {
  id: string;
  name: string;
  cityId: string;
  wallTypeId: string;
  inputMode: InputMode;
  simpleArea: number;
  simplePerimeter: number;
  simpleHeight: number;
  simpleOpeningsArea: number;
  simpleOpeningsPerim: number;
  simpleSillLength: number;
  outerCorners: number;
  innerCorners: number;
  includeParapet: boolean;
  walls: Wall[];
  openings: Opening[];
  claddingId: CladdingId;
  panelW: number;
  panelH: number;
  panelT: number;
  material: SubsystemMaterial;
  scheme: Scheme;
  guideStep: number;
  bracketStep: number;
  autoSteps: boolean;
  insulationOn: boolean;
  insulationKind: InsulationKind;
  insulationMm: number;
  membraneOn: boolean;
  ventGap: number;
  wastePercent: number;
  includeLabor: boolean;
  includeDesign: boolean;
  includeScaffold: boolean;
  vatOn: boolean;
  vatPercent: number;
  priceOverrides: Record<string, number>;
  discountMaterialsPct: number;
  discountLaborPct: number;
  partnerByGroup: Partial<Record<SpecGroup, string>>;
}

// Партнёр/магазин (заводит пользователь; трекинг не ведётся — только показ).
export interface Partner {
  id: string;
  name: string;
  contact: string; // телефон / город / сайт
  link: string; // реф-ссылка
  promo: string; // промокод / метка
}

// Сценарий прайса: снимок переопределений цен и скидок с подписью.
export interface PricePreset {
  id: string;
  name: string;
  savedAt: number;
  overrides: Record<string, number>;
  discountMaterialsPct: number;
  discountLaborPct: number;
}

export interface SpecRow {
  id: string;
  group: SpecGroup;
  name: string;
  unit: string;
  qty: number;
  qtyReserve: number;
  perM2: number;
  price: number;
  sum: number;
  weight: number;
}

export interface CalcResult {
  grossArea: number;
  openingArea: number;
  netArea: number;
  openingPerim: number;
  buildingPerim: number;
  height: number;
  sillLength: number;
  outerCorners: number;
  innerCorners: number;
  claddingKgM2: number;
  recommendedGuideStep: number;
  recommendedBracketStep: number;
  rBase: number;
  rIns: number;
  rTotal: number;
  rRequired: number;
  rOk: boolean;
  lambda: number;
  windW0: number;
  windPressure: number;
  cityName: string;
  rows: SpecRow[];
  materialsSum: number; // до скидки
  laborSum: number; // до скидки
  discountMaterialsSum: number;
  discountLaborSum: number;
  subtotal: number; // после скидок, без НДС
  vatSum: number;
  total: number;
  perM2: number;
  totalWeight: number;
  totalVolume: number;
}

export interface SavedProject {
  id: string;
  name: string;
  savedAt: number;
  project: Project;
  cutting?: import("@/lib/cutting/types").CuttingSnapshot;
}
