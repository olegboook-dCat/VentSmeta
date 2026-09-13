// Модель данных раскроя (перенос «Линейки +» из web-calculator).
// Все линейные размеры — в миллиметрах.

export type AngEdge = "none" | "left" | "right" | "both";
export type AngCorner = "top" | "bottom";
export type AngAxis = "height" | "width";
export type AngMode = "edge" | "corner";

// Диагональный рез кромки (стык в плоскости) / трапеция.
export interface Ang {
  edge: AngEdge;
  deg: number; // угол наклонной от опорной кромки
  corner: AngCorner;
  axis: AngAxis;
  w2: number; // второй размер противоположной кромки (мм); >0 — скос задаётся размером
}

// Отсечка: панель, ширина которой сложена из сегментов items (вертикальные линии
// сгиба между ними), высота — height или сумма hItems (горизонтальные отвороты).
export interface Cut {
  id: string;
  name: string;
  items: number[]; // сегменты ширины, мм
  height: number; // высота, мм (если hItems пуст)
  hItems: number[]; // сегменты высоты (отвороты), мм
  ang: Ang;
  angMode: AngMode; // как трактуется угол в UI: рез кромки / готовый поворот
}

// Нормализованная отсечка для раскроя и экспорта.
export interface Otsechka {
  no: number | null;
  name: string;
  h: number;
  items: number[];
  hItems: number[];
  ang: Ang;
}

export interface Point {
  x: number;
  y: number;
}

// Деталь, уложенная на лист.
export interface PlacedItem {
  x: number;
  y: number;
  pw: number; // ширина на листе (с учётом поворота)
  ph: number; // высота на листе
  ot: Otsechka;
  rot: boolean;
}

export interface Shelf {
  y: number;
  h: number;
  usedW: number;
  items: PlacedItem[];
}

export interface Sheet {
  Wsheet: number;
  L: number;
  red: boolean; // деталь легла на лист шире минимального
  shelves: Shelf[];
  usedLen: number;
}

export interface CutPlan {
  sheets: Sheet[];
  oversize: Otsechka[];
}

export interface SheetStandard {
  id: string;
  label: string;
  widths: number[];
}

// Стандартные наборы ширин листа (высота задаётся отдельно).
export const SHEET_STANDARDS: SheetStandard[] = [
  { id: "1220_1500", label: "1220 / 1500 — композит, металл", widths: [1220, 1500] },
  { id: "1000_1250", label: "1000 / 1250 — сталь, жесть", widths: [1000, 1250] },
  { id: "1250", label: "1250 — ГКЛ, ОСП, фанера", widths: [1250] },
  { id: "1220", label: "1220", widths: [1220] },
  { id: "1500", label: "1500", widths: [1500] },
];

export function widthsOfStandard(standardId: string): number[] {
  const s = SHEET_STANDARDS.find((x) => x.id === standardId);
  return (s ? s.widths : [1220, 1500]).slice().sort((a, b) => a - b);
}

export function defaultAng(): Ang {
  return { edge: "none", deg: 0, corner: "top", axis: "height", w2: 0 };
}
