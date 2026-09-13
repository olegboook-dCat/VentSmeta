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
  materialsSum: number;
  laborSum: number;
  subtotal: number;
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
}
