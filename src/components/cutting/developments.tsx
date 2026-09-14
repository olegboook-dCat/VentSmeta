import { useMemo } from "react";
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
// подписи под фигурой вместе с названием.
function StripSvg({ ot }: { ot: Otsechka }) {
  const clipId = useMemo(() => "strip-" + Math.random().toString(36).slice(2, 9), []);
  const totalW = ot.items.reduce((s, w) => s + w, 0);
  if (!(totalW > 0) || !(ot.h > 0)) return null;

  const scale = Math.min(240 / totalW, 150 / ot.h);
  const stripW = Math.max(2, totalW * scale);
  const stripH = Math.max(2, ot.h * scale);
  const TOP = 18; // полоса сверху под размеры ширины
  const LEFT = 24; // место слева под вертикальный размер высоты
  const PADR = 8;
  const PADB = 8;
  const svgW = LEFT + stripW + PADR;
  const svgH = TOP + stripH + PADB;

  const outPts = panelOutline(totalW, ot.h, ot.ang).map((p) => panelPoint(p, LEFT, TOP, scale, false));
  const polyStr = outPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  // Сегменты ширины + размеры над каждым.
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
    const fs = Math.min(11, wpx / (0.6 * label.length + 0.3));
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

  // Горизонтальные линии сгиба (отвороты по высоте).
  const folds = foldLines(LEFT, TOP, stripW, stripH, [], ot.hItems || [], false, scale).map((l, i) => (
    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={COL.fold} strokeWidth={0.7} strokeDasharray="4 3" />
  ));

  // Высота слева — вертикально (повёрнута на 90°). При отворотах — по сегментам.
  const hseg = (ot.hItems || []).filter((h) => h > 0);
  const heightLabels: React.ReactNode[] = [];
  const hx = LEFT - 7;
  if (hseg.length) {
    let cum = 0;
    hseg.forEach((h, i) => {
      const cy = TOP + (cum + h / 2) * scale;
      const label = fmt(h);
      const fs = Math.min(11, Math.max(6, (h * scale) / (0.6 * label.length + 0.3)));
      if (fs >= 6)
        heightLabels.push(
          <text
            key={i}
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
      cum += h;
    });
  } else {
    const cy = TOP + stripH / 2;
    heightLabels.push(
      <text
        key="h"
        x={hx}
        y={cy}
        textAnchor="middle"
        fontSize={11}
        fill={COL.dim}
        transform={`rotate(-90 ${hx} ${cy})`}
      >
        {fmt(ot.h)}
      </text>,
    );
  }

  return (
    <svg width={svgW.toFixed(1)} height={svgH.toFixed(1)} className="rounded bg-surface">
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

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-base">Развёртки отсечек</h2>
      {list.length ? (
        <>
          <p className="mt-1 text-sm text-muted">Каждая отсечка отдельной развёрткой с размерами.</p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            {list.map((ot) => (
              <div key={ot.no} className="flex-none text-center">
                <StripSvg ot={ot} />
                <div className="mt-1 max-w-[240px] text-xs text-muted">
                  №{ot.no}
                  {ot.name ? ` · ${ot.name}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Добавьте отсечки с высотой, чтобы увидеть развёртки.</p>
      )}
    </section>
  );
}
