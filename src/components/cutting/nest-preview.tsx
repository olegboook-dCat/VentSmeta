import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { foldLines, panelOutline, panelPoint } from "@/lib/cutting/geometry";
import { buildCutPlan, kimPct, panelWidth, usedArea, type NestOptions } from "@/lib/cutting/nesting";
import { collectOtsechki } from "@/lib/cutting/model";
import {
  buildDxf,
  buildSvg,
  collectCutPlanPrimitives,
  downloadTextFile,
  exportDateStamp,
} from "@/lib/cutting/export";
import type { PlacedItem, Sheet } from "@/lib/cutting/types";
import { widthsOfStandard } from "@/lib/cutting/types";
import { useCutting } from "@/store/cutting";

const COL = {
  sheet: "#9aa4b2",
  seg: "#dce8e4",
  segStroke: "#9aa4b2",
  cut: "#0047ab",
  fold: "#2e8b57",
  num: "#1b1a17",
  redSeg: "#f0dede",
  redStroke: "#8f2d2d",
};

function PanelShapes({ it, ox, oy, scale, red }: { it: PlacedItem; ox: number; oy: number; scale: number; red: boolean }) {
  const px = ox + it.x * scale;
  const py = oy + it.y * scale;
  const pw = Math.max(2, it.pw * scale);
  const ph = Math.max(2, it.ph * scale);
  const clipId = useMemo(() => "clip-" + Math.random().toString(36).slice(2, 9), []);
  const outPts = panelOutline(panelWidth(it.ot), it.ot.h, it.ot.ang).map((p) => panelPoint(p, px, py, scale, it.rot));
  const polyStr = outPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const segs: React.ReactNode[] = [];
  let cxmm = 0;
  it.ot.items.forEach((w, i) => {
    const sw = Math.max(1, w * scale);
    if (it.rot) {
      const sy = py + cxmm * scale;
      segs.push(
        <rect key={i} x={px} y={sy} width={pw} height={sw} fill={red ? COL.redSeg : COL.seg} stroke={COL.segStroke} strokeWidth={0.6} />,
      );
    } else {
      const sx = px + cxmm * scale;
      segs.push(
        <rect key={i} x={sx} y={py} width={sw} height={ph} fill={red ? COL.redSeg : COL.seg} stroke={COL.segStroke} strokeWidth={0.6} />,
      );
    }
    cxmm += w;
  });

  const folds = foldLines(px, py, pw, ph, [], it.ot.hItems || [], it.rot, scale).map((l, i) => (
    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={COL.fold} strokeWidth={0.7} strokeDasharray="4 3" />
  ));

  const nfs = Math.max(9, Math.min(pw, ph) / 3);

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <polygon points={polyStr} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {segs}
        {folds}
      </g>
      <polygon points={polyStr} fill="none" stroke={red ? COL.redStroke : COL.cut} strokeWidth={1.6} />
      {it.ot.no ? (
        <text
          x={px + pw / 2}
          y={py + ph / 2 + nfs * 0.35}
          textAnchor="middle"
          fontSize={nfs}
          fontWeight={700}
          fill={COL.num}
        >
          №{it.ot.no}
        </text>
      ) : null}
    </>
  );
}

function SheetPreview({ sheet, scale }: { sheet: Sheet; scale: number }) {
  const pxW = Math.max(1, sheet.Wsheet * scale);
  const pxL = Math.max(1, sheet.L * scale);
  return (
    <svg width={pxW.toFixed(1)} height={pxL.toFixed(1)} className="bg-surface">
      <rect
        x={0}
        y={0}
        width={pxW}
        height={pxL}
        fill="none"
        stroke={sheet.red ? COL.redStroke : COL.sheet}
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
      {sheet.shelves.flatMap((shelf, si) =>
        shelf.items.map((it, ii) => (
          <PanelShapes key={`${si}-${ii}`} it={it} ox={0} oy={0} scale={scale} red={sheet.red} />
        )),
      )}
    </svg>
  );
}

export function NestPreview() {
  const { cuts, sheetH, kerf, allowRotate, standardId, setKerf, setAllowRotate } = useCutting();

  const { plan, opts, L } = useMemo(() => {
    const widths = widthsOfStandard(standardId);
    const list = collectOtsechki(cuts);
    const Lh = sheetH || 4000;
    const o: NestOptions = { kerf, allowRotate, widths };
    return { plan: buildCutPlan(list, Lh, o), opts: o, L: Lh };
  }, [cuts, sheetH, kerf, allowRotate, standardId]);

  const { sheets, oversize } = plan;
  const widths = opts.widths;
  const maxW = widths[widths.length - 1];

  const totalUsed = sheets.reduce((s, sh) => s + usedArea(sh), 0);
  const totalArea = sheets.reduce((s, sh) => s + sh.Wsheet * sh.L, 0);
  const kimAll = kimPct(totalUsed, totalArea);
  const byWidth = widths.map((w) => ({ w, n: sheets.filter((s) => s.Wsheet === w).length })).filter((x) => x.n);
  const breakdown = byWidth.map((x) => `${x.w}×${Math.round(L)}: ${x.n}`).join(", ");

  const scale = Math.min(150 / maxW, 430 / L);

  function doExport(kind: "dxf" | "svg") {
    const list = collectOtsechki(cuts);
    const prim = collectCutPlanPrimitives(list, L, opts);
    if (!prim.sheets.length) {
      toast.error("Нет раскроя: добавьте отсечки с высотой");
      return;
    }
    const stamp = exportDateStamp();
    if (kind === "dxf") downloadTextFile(`raskroy-${stamp}.dxf`, buildDxf(prim), "application/dxf");
    else downloadTextFile(`raskroy-${stamp}.svg`, buildSvg(prim), "image/svg+xml;charset=utf-8");
    const over = prim.oversize.length ? `, не вошло: ${prim.oversize.length}` : "";
    toast.success(`Выгружено: ${prim.sheets.length} лист(ов), ${kind.toUpperCase()}${over}`);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-base">Раскрой на листе (для фрезера)</h2>

      {/* Рез и поворот — здесь, рядом с КИМ, чтобы не листать наверх */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface-2/60 px-3 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs text-muted">Рез (пропил), мм</span>
          <Input
            inputMode="decimal"
            className="h-9 w-20"
            value={String(Math.round(kerf * 1000) / 1000)}
            onChange={(e) => setKerf(Number(String(e.target.value).replace(",", ".")) || 0)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={allowRotate} onCheckedChange={setAllowRotate} />
          поворот деталей
        </label>
      </div>

      {sheets.length ? (
        <p className="mt-1 text-sm text-muted">
          Листов: {sheets.length}
          {breakdown ? ` (${breakdown})` : ""} · КИМ {kimAll}% (использование листа)
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Добавьте отсечки с высотой, чтобы разложить их на листах.</p>
      )}

      {oversize.length ? (
        <p className="mt-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠ Не помещается на лист: {oversize.length} шт. (шире {maxW} или выше {Math.round(L)} мм).
        </p>
      ) : null}

      {sheets.length ? (
        <div className="mt-3 flex items-start gap-4 overflow-x-auto pb-2">
          {sheets.map((sheet, si) => (
            <div key={si} className="flex-none text-center">
              <SheetPreview sheet={sheet} scale={scale} />
              <div className={`mt-1 text-xs ${sheet.red ? "text-danger" : "text-muted"}`}>
                Лист {sheet.Wsheet}×{Math.round(L)} · КИМ {kimPct(usedArea(sheet), sheet.Wsheet * sheet.L)}%
                {sheet.red ? " (шире мин.)" : ""}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="default" size="sm" onClick={() => doExport("dxf")} disabled={!sheets.length}>
          ⬇ Чертёж DXF (для станка)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => doExport("svg")} disabled={!sheets.length}>
          ⬇ Чертёж SVG
        </Button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Реальные размеры (мм). Слои: <b>CUT</b> — контур реза, <b>FOLD</b> — линии сгиба, <b>SHEET</b> — габарит листа,{" "}
        <b>LABEL</b> — номера. DXF (AutoCAD R12) открывают ArtCAM, Aspire, Fusion 360, nanoCAD; SVG — для лазеров и
        Inkscape.
      </p>
    </section>
  );
}
