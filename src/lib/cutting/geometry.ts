// Геометрия панели: контур (прямоугольник / трапеция при диагональном резе),
// линии сгиба, перевод локальных координат на лист. Перенос из web-calculator.
import type { Ang, AngEdge, Point } from "./types";

export interface FoldLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function normalizeAngEdge(v: unknown): AngEdge {
  return v === "left" || v === "right" || v === "both" ? v : "none";
}

const RECT = (W: number, H: number): Point[] => [
  { x: 0, y: 0 },
  { x: W, y: 0 },
  { x: W, y: H },
  { x: 0, y: H },
];

function angRun(len: number, deg: number): number {
  const d = Math.max(0, Math.min(89, deg || 0));
  return len * Math.tan((d * Math.PI) / 180);
}

// Наклон по боковой стороне (во всю высоту): сдвигаем верхние или нижние углы по X.
function slantSides(W: number, H: number, edge: AngEdge, corner: string, run: number): Point[] {
  const top = corner !== "bottom";
  const L = edge === "left" || edge === "both";
  const R = edge === "right" || edge === "both";
  return [
    L && !top ? { x: run, y: 0 } : { x: 0, y: 0 },
    R && !top ? { x: W - run, y: 0 } : { x: W, y: 0 },
    R && top ? { x: W - run, y: H } : { x: W, y: H },
    L && top ? { x: run, y: H } : { x: 0, y: H },
  ];
}

// Наклон по верхней/нижней стороне (во всю ширину): сдвигаем углы кромки по Y.
function slantTops(W: number, H: number, edge: AngEdge, corner: string, run: number): Point[] {
  const atTop = corner !== "bottom";
  const L = edge === "left" || edge === "both";
  const R = edge === "right" || edge === "both";
  return [
    L && atTop ? { x: 0, y: run } : { x: 0, y: 0 },
    R && atTop ? { x: W, y: run } : { x: W, y: 0 },
    R && !atTop ? { x: W, y: H - run } : { x: W, y: H },
    L && !atTop ? { x: 0, y: H - run } : { x: 0, y: H },
  ];
}

// Контур панели (мм, локально W×H, Y вниз): прямоугольник или трапеция.
export function panelOutline(W: number, H: number, ang?: Ang): Point[] {
  const edge = normalizeAngEdge(ang?.edge);
  if (edge === "none") return RECT(W, H);
  const axis = ang?.axis === "width" ? "width" : "height";
  const perp = axis === "width" ? H : W;
  const refLen = axis === "width" ? W : H;
  const w2 = Math.max(0, ang?.w2 ?? 0);
  let run = w2 > 0 ? Math.abs(perp - w2) : angRun(refLen, ang?.deg ?? 0);
  run = Math.min(perp, Math.max(0, run));
  if (!(run > 0)) return RECT(W, H);
  const corner = ang?.corner === "bottom" ? "bottom" : "top";
  return axis === "width" ? slantTops(W, H, edge, corner, run) : slantSides(W, H, edge, corner, run);
}

// Авто-угол наклонной кромки (°) по текущим размерам, когда задан второй размер.
export function angAutoDeg(W: number, H: number, ang?: Ang): number {
  const axis = ang?.axis === "width" ? "width" : "height";
  const perp = axis === "width" ? H : W;
  const refLen = axis === "width" ? W : H;
  const w2 = Math.max(0, ang?.w2 ?? 0);
  const run = Math.min(perp, Math.abs(perp - w2));
  return refLen > 0 ? (Math.atan2(run, refLen) * 180) / Math.PI : 0;
}

// Точка панели (локально W×H) → координаты на листе (масштаб s, поворот rot).
export function panelPoint(pt: Point, px: number, py: number, s: number, rot: boolean): Point {
  return rot ? { x: px + pt.y * s, y: py + pt.x * s } : { x: px + pt.x * s, y: py + pt.y * s };
}

// Внутренние линии сгиба. wItems — сегменты вдоль исходной ширины (вертикальные),
// hItems — вдоль высоты (горизонтальные). rot=true меняет оси местами.
export function foldLines(
  px: number,
  py: number,
  pw: number,
  ph: number,
  wItems: number[],
  hItems: number[],
  rot: boolean,
  scale: number,
): FoldLine[] {
  const out: FoldLine[] = [];
  const addAxis = (segs: number[], alongOrigWidth: boolean) => {
    const horiz = alongOrigWidth ? !rot : rot;
    let cum = 0;
    (segs || []).forEach((s, idx, arr) => {
      cum += s;
      if (idx < arr.length - 1) {
        const off = cum * scale;
        if (horiz) out.push({ x1: px + off, y1: py, x2: px + off, y2: py + ph });
        else out.push({ x1: px, y1: py + off, x2: px + pw, y2: py + off });
      }
    });
  };
  addAxis(wItems, true);
  addAxis(hItems, false);
  return out;
}
