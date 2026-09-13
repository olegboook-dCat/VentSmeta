// Экспорт раскроя для фрезерного станка (DXF R12 / SVG) в реальных размерах (мм).
// Все листы — в одном файле, разложены рядом с зазором и подписями.
// Слои: SHEET (габарит листа), CUT (контур реза), FOLD (линии сгиба), LABEL (номера).
// Перенос из web-calculator (ruler.html).
import { foldLines, panelOutline, panelPoint } from "./geometry";
import { buildCutPlan, panelWidth, type NestOptions } from "./nesting";
import type { Otsechka, Point, Sheet } from "./types";

const EXPORT_GAP = 100; // зазор между листами в выгрузке, мм
const EXPORT_LABEL_H = 40; // кегль подписей, мм

interface Layer {
  name: "SHEET" | "CUT" | "FOLD" | "LABEL";
  aci: number; // цвет AutoCAD ACI
  svg: string;
}

const EXPORT_LAYERS: Layer[] = [
  { name: "SHEET", aci: 8, svg: "#9aa4b2" },
  { name: "CUT", aci: 5, svg: "#0047ab" },
  { name: "FOLD", aci: 3, svg: "#2e8b57" },
  { name: "LABEL", aci: 7, svg: "#111111" },
];

interface Rect {
  layer: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Line {
  layer: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
interface Text {
  layer: string;
  x: number;
  y: number;
  h: number;
  dxf: string;
  svg: string;
}
interface Poly {
  layer: string;
  pts: Point[];
}

export interface CutPrimitives {
  rects: Rect[];
  lines: Line[];
  texts: Text[];
  polys: Poly[];
  totalW: number;
  totalH: number;
  sheets: Sheet[];
  oversize: Otsechka[];
}

// Раскладываем листы плана рядом по горизонтали и собираем примитивы (X вправо, Y вниз).
export function collectCutPlanPrimitives(list: Otsechka[], L: number, opts: NestOptions): CutPrimitives {
  const { sheets, oversize } = buildCutPlan(list, L, opts);
  const rects: Rect[] = [];
  const lines: Line[] = [];
  const texts: Text[] = [];
  const polys: Poly[] = [];
  let ox = 0;
  let maxL = 0;
  sheets.forEach((sheet, si) => {
    maxL = Math.max(maxL, sheet.L);
    rects.push({ layer: "SHEET", x: ox, y: 0, w: sheet.Wsheet, h: sheet.L });
    sheet.shelves.forEach((shelf) => {
      shelf.items.forEach((it) => {
        const px = ox + it.x;
        const py = it.y;
        polys.push({
          layer: "CUT",
          pts: panelOutline(panelWidth(it.ot), it.ot.h, it.ot.ang).map((p) => panelPoint(p, px, py, 1, it.rot)),
        });
        foldLines(px, py, it.pw, it.ph, it.ot.items || [], it.ot.hItems || [], it.rot, 1).forEach((l) =>
          lines.push({ layer: "FOLD", x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 }),
        );
        if (it.ot.no) {
          const fs = Math.min(EXPORT_LABEL_H, Math.max(20, Math.min(it.pw, it.ph) / 3));
          texts.push({
            layer: "LABEL",
            x: px + it.pw / 2,
            y: py + it.ph / 2,
            h: fs,
            dxf: "N" + it.ot.no,
            svg: "№" + it.ot.no,
          });
        }
      });
    });
    texts.push({
      layer: "LABEL",
      x: ox + sheet.Wsheet / 2,
      y: sheet.L + EXPORT_LABEL_H * 1.1,
      h: EXPORT_LABEL_H,
      dxf: `Sheet ${si + 1} ${sheet.Wsheet}x${Math.round(sheet.L)}`,
      svg: `Лист ${si + 1} · ${sheet.Wsheet}×${Math.round(sheet.L)}`,
    });
    ox += sheet.Wsheet + EXPORT_GAP;
  });
  const totalW = Math.max(0, ox - EXPORT_GAP);
  const totalH = maxL + EXPORT_LABEL_H * 2;
  return { rects, lines, texts, polys, totalW, totalH, sheets, oversize };
}

// --- DXF (AutoCAD R12 / AC1009) — совместимый ASCII-формат. Ось Y переворачиваем. ---
export function buildDxf(prim: CutPrimitives): string {
  const { rects, lines, texts, totalH } = prim;
  const g: string[] = [];
  const p = (code: number, val: string | number) => {
    g.push(String(code), String(val));
  };
  const fy = (y: number) => (totalH - y).toFixed(3);
  const fx = (x: number) => x.toFixed(3);
  p(0, "SECTION");
  p(2, "HEADER");
  p(9, "$ACADVER");
  p(1, "AC1009");
  p(9, "$INSUNITS");
  p(70, 4); // мм
  p(0, "ENDSEC");
  p(0, "SECTION");
  p(2, "TABLES");
  p(0, "TABLE");
  p(2, "LTYPE");
  p(70, 1);
  p(0, "LTYPE");
  p(2, "CONTINUOUS");
  p(70, 0);
  p(3, "Solid line");
  p(72, 65);
  p(73, 0);
  p(40, 0);
  p(0, "ENDTAB");
  p(0, "TABLE");
  p(2, "LAYER");
  p(70, EXPORT_LAYERS.length + 1);
  p(0, "LAYER");
  p(2, "0");
  p(70, 0);
  p(62, 7);
  p(6, "CONTINUOUS");
  EXPORT_LAYERS.forEach((l) => {
    p(0, "LAYER");
    p(2, l.name);
    p(70, 0);
    p(62, l.aci);
    p(6, "CONTINUOUS");
  });
  p(0, "ENDTAB");
  p(0, "ENDSEC");
  p(0, "SECTION");
  p(2, "ENTITIES");
  const polyRect = (layer: string, x: number, y: number, w: number, h: number) => {
    p(0, "POLYLINE");
    p(8, layer);
    p(66, 1);
    p(70, 1);
    p(10, 0);
    p(20, 0);
    p(30, 0);
    const corners = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
    corners.forEach((c) => {
      p(0, "VERTEX");
      p(8, layer);
      p(10, fx(c[0]));
      p(20, fy(c[1]));
    });
    p(0, "SEQEND");
  };
  rects.forEach((r) => polyRect(r.layer, r.x, r.y, r.w, r.h));
  prim.polys.forEach((pl) => {
    p(0, "POLYLINE");
    p(8, pl.layer);
    p(66, 1);
    p(70, 1);
    p(10, 0);
    p(20, 0);
    p(30, 0);
    pl.pts.forEach((pt) => {
      p(0, "VERTEX");
      p(8, pl.layer);
      p(10, fx(pt.x));
      p(20, fy(pt.y));
    });
    p(0, "SEQEND");
  });
  lines.forEach((l) => {
    p(0, "LINE");
    p(8, l.layer);
    p(10, fx(l.x1));
    p(20, fy(l.y1));
    p(11, fx(l.x2));
    p(21, fy(l.y2));
  });
  texts.forEach((t) => {
    p(0, "TEXT");
    p(8, t.layer);
    p(10, fx(t.x));
    p(20, fy(t.y));
    p(40, t.h.toFixed(3));
    p(1, t.dxf);
    p(72, 1);
    p(73, 2);
    p(11, fx(t.x));
    p(21, fy(t.y));
  });
  p(0, "ENDSEC");
  p(0, "EOF");
  return g.join("\n") + "\n";
}

// --- SVG — реальные размеры в мм, слои через <g>, ось Y как в SVG (вниз). ---
export function buildSvg(prim: CutPrimitives): string {
  const { rects, lines, texts, polys, totalW, totalH } = prim;
  let body = "";
  EXPORT_LAYERS.forEach((l) => {
    let g = "";
    if (l.name === "FOLD")
      lines
        .filter((x) => x.layer === l.name)
        .forEach((x) => {
          g += `<line x1="${x.x1.toFixed(2)}" y1="${x.y1.toFixed(2)}" x2="${x.x2.toFixed(2)}" y2="${x.y2.toFixed(2)}" stroke="${l.svg}" stroke-width="1" stroke-dasharray="8 6"/>`;
        });
    polys
      .filter((x) => x.layer === l.name)
      .forEach((x) => {
        g += `<polygon points="${x.pts.map((p) => p.x.toFixed(2) + "," + p.y.toFixed(2)).join(" ")}" fill="none" stroke="${l.svg}" stroke-width="2"/>`;
      });
    if (l.name === "SHEET" || l.name === "CUT")
      rects
        .filter((x) => x.layer === l.name)
        .forEach((x) => {
          g += `<rect x="${x.x.toFixed(2)}" y="${x.y.toFixed(2)}" width="${x.w.toFixed(2)}" height="${x.h.toFixed(2)}" fill="none" stroke="${l.svg}" stroke-width="${l.name === "CUT" ? 2 : 1}"${l.name === "SHEET" ? ' stroke-dasharray="20 12"' : ""}/>`;
        });
    if (l.name === "LABEL")
      texts
        .filter((x) => x.layer === l.name)
        .forEach((x) => {
          g += `<text x="${x.x.toFixed(2)}" y="${x.y.toFixed(2)}" font-size="${x.h.toFixed(2)}" font-family="sans-serif" text-anchor="middle" dominant-baseline="central" fill="${l.svg}">${escapeXml(x.svg)}</text>`;
        });
    if (g) body += `<g id="${l.name}" data-layer="${l.name}" stroke-linecap="round">${g}</g>`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW.toFixed(2)}mm" height="${totalH.toFixed(2)}mm" ` +
    `viewBox="0 0 ${totalW.toFixed(2)} ${totalH.toFixed(2)}">\n${body}\n</svg>\n`
  );
}

function escapeXml(s: string): string {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function downloadTextFile(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
