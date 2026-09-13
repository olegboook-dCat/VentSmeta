// Производные величины по отсечкам и сбор списка панелей для раскроя/экспорта.
import { normalizeAngEdge } from "./geometry";
import { defaultAng, type Ang, type Cut, type Otsechka } from "./types";

export function cutWidth(cut: Cut): number {
  return (cut.items || []).reduce((s, v) => s + Math.max(0, v), 0);
}

// Высота = сумма отворотов (hItems) либо поле height.
export function cutHeight(cut: Cut): number {
  const hi = (cut.hItems || []).filter((h) => h > 0);
  return hi.length ? hi.reduce((s, h) => s + h, 0) : Math.max(0, cut.height);
}

export function cutArea(cut: Cut): number {
  return (cutWidth(cut) * cutHeight(cut)) / 1e6; // мм² → м²
}

// Панели для раскроя: только отсечки с положительной шириной и высотой.
export function collectOtsechki(cuts: Cut[]): Otsechka[] {
  const list: Otsechka[] = [];
  cuts.forEach((cut, ci) => {
    const h = cutHeight(cut);
    const items = (cut.items || []).map((v) => Math.max(0, v)).filter((w) => w > 0);
    if (h > 0 && items.length) {
      list.push({
        no: ci + 1,
        name: cut.name || "",
        h,
        items,
        hItems: (cut.hItems || []).filter((v) => v > 0),
        ang: normalizeAng(cut.ang),
      });
    }
  });
  return list;
}

function normalizeAng(ang?: Ang): Ang {
  if (!ang) return defaultAng();
  return {
    edge: normalizeAngEdge(ang.edge),
    deg: Math.max(0, ang.deg || 0),
    corner: ang.corner === "bottom" ? "bottom" : "top",
    axis: ang.axis === "width" ? "width" : "height",
    w2: Math.max(0, ang.w2 || 0),
  };
}
