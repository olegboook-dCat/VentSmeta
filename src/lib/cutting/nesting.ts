// Оптимизирующая укладка деталей на листы: FFD + Next-Fit по «полкам», поворот
// на 90°, перебор порядков и упаковщиков, минимизация суммарной площади листов.
// Перенос из web-calculator (ruler.html).
import type { CutPlan, Otsechka, Sheet } from "./types";

const NEST_EPS = 1e-6;

export interface NestOptions {
  kerf: number; // ширина реза (пропил), мм
  allowRotate: boolean; // разрешён поворот деталей на 90°
  widths: number[]; // доступные ширины листа (отсортированы по возрастанию)
}

interface Oriented {
  pw: number;
  ph: number;
  ot: Otsechka;
  rot: boolean;
}

export function panelWidth(ot: Otsechka): number {
  return ot.items.reduce((s, w) => s + w, 0);
}

// Ориентация детали (с учётом поворота), которая помещается на лист W×L; берём ту,
// у которой меньше высота ряда, или null, если не помещается ни так, ни так.
function chooseOrient(Worig: number, Horig: number, W: number, L: number, rot: boolean): Oriented | null {
  const cand = [{ pw: Worig, ph: Horig, rot: false }];
  if (rot && Math.abs(Worig - Horig) > NEST_EPS) cand.push({ pw: Horig, ph: Worig, rot: true });
  const fit = cand.filter((o) => o.pw <= W + NEST_EPS && o.ph <= L + NEST_EPS);
  if (!fit.length) return null;
  const best = fit.sort((a, b) => a.ph - b.ph)[0];
  return { pw: best.pw, ph: best.ph, rot: best.rot, ot: undefined as unknown as Otsechka };
}

function newSheet(W: number, L: number, red: boolean): Sheet {
  return { Wsheet: W, L, red, shelves: [], usedLen: 0 };
}

// First-Fit-Decreasing по полкам: деталь в первый ряд (на любом листе), где хватает
// ширины и высоты ряда; иначе новый ряд на листе с запасом по длине, иначе новый лист.
function packFFD(parts: Oriented[], W: number, L: number, red: boolean, kerf: number): Sheet[] {
  const k = Math.max(0, kerf);
  const sheets: Sheet[] = [];
  parts.forEach((p) => {
    let shelf = null as Sheet["shelves"][number] | null;
    for (const s of sheets) {
      for (const sh of s.shelves) {
        if (p.ph <= sh.h + NEST_EPS && sh.usedW + p.pw <= W + NEST_EPS) {
          shelf = sh;
          break;
        }
      }
      if (shelf) break;
    }
    if (!shelf) {
      let target = sheets.find((s) => s.usedLen + p.ph <= L + NEST_EPS);
      if (!target) {
        target = newSheet(W, L, red);
        sheets.push(target);
      }
      shelf = { y: target.usedLen, h: p.ph, usedW: 0, items: [] };
      target.shelves.push(shelf);
      target.usedLen += p.ph + k;
    }
    shelf.items.push({ x: shelf.usedW, y: shelf.y, pw: p.pw, ph: p.ph, ot: p.ot, rot: p.rot });
    shelf.usedW += p.pw + k;
  });
  return sheets;
}

// Next-Fit с наращиванием высоты ряда — ещё один кандидат.
function packNextFit(parts: Oriented[], W: number, L: number, red: boolean, kerf: number): Sheet[] {
  const k = Math.max(0, kerf);
  const sheets: Sheet[] = [];
  let sheet: Sheet | null = null;
  let shelf: Sheet["shelves"][number] | null = null;
  const open = () => {
    sheet = newSheet(W, L, red);
    sheets.push(sheet);
    shelf = null;
  };
  parts.forEach((p) => {
    if (!sheet) open();
    if (!shelf || shelf.usedW + p.pw > W + NEST_EPS || shelf.y + p.ph > L + NEST_EPS) {
      if (sheet!.usedLen + p.ph > L + NEST_EPS) open();
      shelf = { y: sheet!.usedLen, h: 0, usedW: 0, items: [] };
      sheet!.shelves.push(shelf);
    }
    shelf.items.push({ x: shelf.usedW, y: shelf.y, pw: p.pw, ph: p.ph, ot: p.ot, rot: p.rot });
    shelf.usedW += p.pw + k;
    const nh = Math.max(shelf.h, p.ph + k);
    sheet!.usedLen += nh - shelf.h;
    shelf.h = nh;
  });
  return sheets;
}

function planSheetArea(sheets: Sheet[]): number {
  return sheets.reduce((s, sh) => s + sh.Wsheet * sh.L, 0);
}

const NEST_SORTS: (((a: Oriented, b: Oriented) => number) | null)[] = [
  (a, b) => b.ph - a.ph || b.pw - a.pw,
  (a, b) => b.pw - a.pw || b.ph - a.ph,
  (a, b) => b.pw * b.ph - a.pw * a.ph,
  null,
];

// Лучшая укладка группы деталей на листы ширины W (перебор порядков × упаковщиков).
function bestPackGroup(oriented: Oriented[], W: number, L: number, red: boolean, kerf: number): Sheet[] {
  let best: { sheets: Sheet[]; area: number } | null = null;
  NEST_SORTS.forEach((sf) => {
    const s = sf ? oriented.slice().sort(sf) : oriented;
    [packFFD, packNextFit].forEach((pack) => {
      const sheets = pack(s, W, L, red, kerf);
      const area = planSheetArea(sheets);
      if (!best || area < best.area || (area === best.area && sheets.length < best.sheets.length)) {
        best = { sheets, area };
      }
    });
  });
  return best!.sheets;
}

function planForRotation(list: Otsechka[], L: number, rot: boolean, opts: NestOptions) {
  const widths = opts.widths;
  const minW = widths[0];
  const groups: Otsechka[][] = widths.map(() => []);
  const oversize: Otsechka[] = [];
  list.forEach((ot) => {
    const Worig = panelWidth(ot);
    const Horig = ot.h;
    const gi = widths.findIndex((w) => chooseOrient(Worig, Horig, w, L, rot));
    if (gi < 0) oversize.push(ot);
    else groups[gi].push(ot);
  });
  let sheets: Sheet[] = [];
  groups.forEach((arr, gi) => {
    const W = widths[gi];
    const oriented: Oriented[] = arr.map((ot) => {
      const o = chooseOrient(panelWidth(ot), ot.h, W, L, rot)!;
      return { pw: o.pw, ph: o.ph, ot, rot: o.rot };
    });
    sheets = sheets.concat(bestPackGroup(oriented, W, L, W > minW, opts.kerf));
  });
  return { sheets, area: planSheetArea(sheets), oversize };
}

// Итоговый план: сначала меньше «не влезло», потом меньше суммарной площади.
export function buildCutPlan(list: Otsechka[], L: number, opts: NestOptions): CutPlan {
  const modes = opts.allowRotate ? [true, false] : [false];
  let best: ReturnType<typeof planForRotation> | null = null;
  modes.forEach((rot) => {
    const p = planForRotation(list, L, rot, opts);
    if (
      !best ||
      p.oversize.length < best.oversize.length ||
      (p.oversize.length === best.oversize.length && p.area < best.area)
    ) {
      best = p;
    }
  });
  return { sheets: best!.sheets, oversize: best!.oversize };
}

// КИМ — коэффициент использования материала (площадь деталей / площадь листа).
export function usedArea(sheet: Sheet): number {
  return sheet.shelves.reduce((s, sh) => s + sh.items.reduce((a, it) => a + it.pw * it.ph, 0), 0);
}

export function kimPct(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}
