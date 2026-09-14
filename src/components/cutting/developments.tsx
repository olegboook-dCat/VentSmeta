import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { foldLines, panelOutline, panelPoint } from "@/lib/cutting/geometry";
import { collectOtsechki } from "@/lib/cutting/model";
import type { Otsechka } from "@/lib/cutting/types";
import { useCutting } from "@/store/cutting";

const COL = {
  seg: "#dce8e4",
  segStroke: "#9aa4b2",
  cut: "#0047ab",
  fold: "#2e8b57",
  dim: "#1b1a17",
  tick: "#9aa4b2",
};

const fmt = (mm: number) => String(Math.round(mm * 10) / 10);

// Развёртка одной отсечки: сегменты ширины с размерами сверху, высота слева
// (повёрнута вертикально), линии сгиба, контур реза. Номер НЕ рисуем — он в
// подписи под фигурой вместе с названием. fitW/fitH — габарит для вписывания.
function StripSvg({ ot, fitW = 240, fitH = 150 }: { ot: Otsechka; fitW?: number; fitH?: number }) {
  const clipId = useMemo(() => "strip-" + Math.random().toString(36).slice(2, 9), []);
  const totalW = ot.items.reduce((s, w) => s + w, 0);
  if (!(totalW > 0) || !(ot.h > 0)) return null;

  const scale = Math.min(fitW / totalW, fitH / ot.h);
  const stripW = Math.max(2, totalW * scale);
  const stripH = Math.max(2, ot.h * scale);
  const maxFs = Math.max(10, Math.min(26, fitH / 10));
  const TOP = maxFs + 8; // полоса сверху под размеры ширины
  const LEFT = maxFs + 12; // место слева под вертикальный размер высоты
  const PADR = 8;
  const PADB = 8;
  const svgW = LEFT + stripW + PADR;
  const svgH = TOP + stripH + PADB;

  const outPts = panelOutline(totalW, ot.h, ot.ang).map((p) => panelPoint(p, LEFT, TOP, scale, false));
  const polyStr = outPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const segRects: React.ReactNode[] = [];
  const widthLabels: React.ReactNode[] = [];
  let cxmm = 0;
  ot.items.forEach((w, i) => {
    const x = LEFT + cxmm * scale;
    const wpx = Math.max(2, w * scale);
    segRects.push(
      <rect key={i} x={x} y={TOP} width={wpx} height={stripH} fill={COL.seg} stroke={COL.segStroke} strokeWidth={0.6} />,
    );
    const label = fmt(w);
    const fs = Math.min(maxFs, wpx / (0.6 * label.length + 0.3));
    if (fs >= 6) {
      const cx = x + wpx / 2;
      widthLabels.push(
        <g key={i}>
          <text x={cx} y={TOP - 4} textAnchor="middle" fontSize={fs.toFixed(1)} fill={COL.dim}>
            {label}
          </text>
          <line x1={cx} y1={TOP - 2} x2={cx} y2={TOP} stroke={COL.tick} strokeWidth={0.6} />
        </g>,
      );
    }
    cxmm += w;
  });

  const folds = foldLines(LEFT, TOP, stripW, stripH, [], ot.hItems || [], false, scale).map((l, i) => (
    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={COL.fold} strokeWidth={0.7} strokeDasharray="4 3" />
  ));

  // Высота слева — вертикально (повёрнута на 90°). При отворотах — по сегментам.
  const hseg = (ot.hItems || []).filter((h) => h > 0);
  const heightLabels: React.ReactNode[] = [];
  const hx = LEFT - 7;
  const putH = (label: string, cy: number, fs: number) =>
    heightLabels.push(
      <text
        key={heightLabels.length}
        x={hx}
        y={cy}
        textAnchor="middle"
        fontSize={fs.toFixed(1)}
        fill={COL.dim}
        transform={`rotate(-90 ${hx} ${cy})`}
      >
        {label}
      </text>,
    );
  if (hseg.length) {
    let cum = 0;
    hseg.forEach((h) => {
      const cy = TOP + (cum + h / 2) * scale;
      const label = fmt(h);
      const fs = Math.min(maxFs, Math.max(6, (h * scale) / (0.6 * label.length + 0.3)));
      if (fs >= 6) putH(label, cy, fs);
      cum += h;
    });
  } else {
    putH(fmt(ot.h), TOP + stripH / 2, maxFs);
  }

  return (
    <svg width={svgW.toFixed(1)} height={svgH.toFixed(1)} className="bg-surface">
      <defs>
        <clipPath id={clipId}>
          <polygon points={polyStr} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {segRects}
        {folds}
      </g>
      <polygon points={polyStr} fill="none" stroke={COL.cut} strokeWidth={1.6} />
      {widthLabels}
      {heightLabels}
    </svg>
  );
}

export function Developments() {
  const cuts = useCutting((st) => st.cuts);
  const list = useMemo(() => collectOtsechki(cuts), [cuts]);
  const [zoomOt, setZoomOt] = useState<Otsechka | null>(null);
  const [zoom, setZoom] = useState(1);

  function openZoom(ot: Otsechka) {
    setZoom(1);
    setZoomOt(ot);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-base">Развёртки отсечек</h2>
      {list.length ? (
        <>
          <p className="mt-1 text-sm text-muted">Каждая отсечка отдельной развёрткой с размерами. Нажмите, чтобы увеличить.</p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            {list.map((ot) => (
              <button
                key={ot.no}
                type="button"
                className="flex-none cursor-zoom-in rounded text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => openZoom(ot)}
                title="Нажмите, чтобы увеличить"
              >
                <StripSvg ot={ot} />
                <div className="mt-1 max-w-[240px] text-xs text-muted">
                  №{ot.no}
                  {ot.name ? ` · ${ot.name}` : ""}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Добавьте отсечки с высотой, чтобы увидеть развёртки.</p>
      )}

      <Dialog open={!!zoomOt} onOpenChange={(o) => !o && setZoomOt(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {zoomOt ? `№${zoomOt.no}${zoomOt.name ? ` · ${zoomOt.name}` : ""}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z / 1.4))} aria-label="Отдалить">
              <Minus />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(6, z * 1.4))} aria-label="Приблизить">
              <Plus />
            </Button>
            <span className="text-sm text-muted">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-surface p-2">
            {zoomOt ? <StripSvg ot={zoomOt} fitW={640 * zoom} fitH={460 * zoom} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
