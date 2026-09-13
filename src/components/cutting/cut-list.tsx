import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { angAutoDeg } from "@/lib/cutting/geometry";
import { cutArea, cutHeight, cutWidth } from "@/lib/cutting/model";
import type { AngEdge, Cut } from "@/lib/cutting/types";
import { useCutting } from "@/store/cutting";
import { cn } from "@/lib/utils";

function parseNum(v: string): number {
  const n = Number(String(v).replace(",", ".").replace(/\s+/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

// Управляемый числовой ввод (мм). Показывает fmt(value), пишет parseNum наружу.
function NumInput({
  value,
  onChange,
  className,
  placeholder,
  readOnly,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      inputMode="decimal"
      readOnly={readOnly}
      placeholder={placeholder}
      className={cn("h-9", className)}
      value={draft ?? (value ? fmt(value) : "")}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseNum(e.target.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

const ANG_LABEL: Record<AngEdge, string> = {
  none: "рез: нет",
  left: "рез: лев",
  right: "рез: прав",
  both: "рез: обе",
};

function CutRow({ cut, index, total }: { cut: Cut; index: number; total: number }) {
  const s = useCutting();
  const [openW, setOpenW] = useState(false);
  const [openH, setOpenH] = useState(false);
  const height = cutHeight(cut);
  const width = cutWidth(cut);
  const overH = s.sheetH > 0 && height > s.sheetH;
  const nearW = s.sheetW > 0 && width >= s.sheetW * 0.95;
  const hasHSegs = cut.hItems.filter((h) => h > 0).length > 0;

  function cycleEdge() {
    const order: AngEdge[] = ["none", "left", "right", "both"];
    s.setAng(cut.id, { edge: order[(order.indexOf(cut.ang.edge) + 1) % 4] });
  }

  const autoDeg = angAutoDeg(width, height, cut.ang);
  const angBase = cut.ang.w2 > 0 ? autoDeg : cut.ang.deg;
  const angShown = cut.angMode === "corner" ? angBase * 2 : angBase;

  return (
    <li className="rounded-lg border border-border bg-surface p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex size-6 flex-none items-center justify-center rounded bg-accent-soft text-xs font-semibold text-accent">
          {index + 1}
        </span>
        <Input
          className="h-9 w-32 flex-none"
          placeholder="Название"
          value={cut.name}
          onChange={(e) => s.updateCut(cut.id, { name: e.target.value })}
        />
        <span className="text-xs text-muted">= {cutArea(cut).toFixed(2)} м²</span>
        <span className="ml-auto flex items-center gap-1.5 text-sm">
          <span className={cn("tabular-nums", nearW && "font-semibold text-danger")}>{fmt(width)}</span>
          <span className="text-xs text-muted">×</span>
          <span className="w-16">
            <NumInput
              value={hasHSegs ? height : cut.height}
              onChange={(v) => s.updateCut(cut.id, { height: v })}
              readOnly={hasHSegs}
              placeholder="выс."
              className={cn("h-9", overH && "border-warn text-warn")}
            />
          </span>
          <span className="text-xs text-muted">мм</span>
        </span>
        <div className="flex flex-none items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => s.moveCut(cut.id, -1)} aria-label="Выше">
            ↑
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === total - 1} onClick={() => s.moveCut(cut.id, 1)} aria-label="Ниже">
            ↓
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => s.copyCut(cut.id)} aria-label="Копия">
            <Copy className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 text-danger" onClick={() => s.removeCut(cut.id)} aria-label="Удалить">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpenW((v) => !v)}>
          {openW ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} ширина ({cut.items.length})
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpenH((v) => !v)}>
          {openH ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} отвороты ({cut.hItems.length})
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(cut.ang.edge !== "none" && "text-accent")}
          onClick={cycleEdge}
        >
          {ANG_LABEL[cut.ang.edge]}
        </Button>
      </div>

      {openW ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {cut.items.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="text-xs text-subtle">{i + 1}.</span>
              <span className="w-20">
                <NumInput value={v} onChange={(nv) => s.updateWidthSeg(cut.id, i, nv)} placeholder="мм" />
              </span>
              <button type="button" className="text-danger" onClick={() => s.removeWidthSeg(cut.id, i)} aria-label="Удалить">
                🗑
              </button>
            </span>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => s.addWidthSeg(cut.id)}>
            ＋ сегмент
          </Button>
        </div>
      ) : null}

      {openH ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {cut.hItems.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="text-xs text-subtle">{i + 1}.</span>
              <span className="w-20">
                <NumInput value={v} onChange={(nv) => s.updateHeightSeg(cut.id, i, nv)} placeholder="мм" />
              </span>
              <button type="button" className="text-danger" onClick={() => s.removeHeightSeg(cut.id, i)} aria-label="Удалить">
                🗑
              </button>
            </span>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => s.addHeightSeg(cut.id)}>
            ＋ отворот
          </Button>
          {hasHSegs ? <span className="text-xs text-muted">высота = сумма отворотов = {fmt(height)} мм</span> : null}
        </div>
      ) : null}

      {cut.ang.edge !== "none" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md bg-accent-soft/40 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-accent"
            onClick={() => s.setAng(cut.id, { axis: cut.ang.axis === "width" ? "height" : "width" })}
          >
            {cut.ang.axis === "width" ? "⇔ во всю ширину" : "⇕ во всю высоту"}
          </Button>
          <span className="text-xs text-muted">{cut.ang.axis === "width" ? "2-я выс:" : "2-я шир:"}</span>
          <span className="w-20">
            <NumInput value={cut.ang.w2} onChange={(v) => s.setAng(cut.id, { w2: v })} placeholder="мм" />
          </span>
          <span className="text-xs text-muted">рез:</span>
          <span className="w-16">
            <NumInput
              value={angShown}
              readOnly={cut.ang.w2 > 0}
              onChange={(v) => {
                if (cut.ang.w2 > 0) return;
                s.setAng(cut.id, { deg: cut.angMode === "corner" ? v / 2 : v });
              }}
            />
          </span>
          <span className="text-xs text-muted">°</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => s.setAngMode(cut.id, cut.angMode === "corner" ? "edge" : "corner")}
          >
            {cut.angMode === "corner" ? "поворота" : "кромки"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => s.setAng(cut.id, { corner: cut.ang.corner === "bottom" ? "top" : "bottom" })}
          >
            {cut.ang.axis === "width"
              ? cut.ang.corner === "bottom"
                ? "снизу"
                : "сверху"
              : cut.ang.corner === "bottom"
                ? "от низа"
                : "от верха"}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function CutList() {
  const cuts = useCutting((st) => st.cuts);
  const addCut = useCutting((st) => st.addCut);
  const clearAll = useCutting((st) => st.clearAll);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base">Отсечки ({cuts.length})</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addCut()}>
            ＋ отсечка
          </Button>
          {cuts.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => confirm("Очистить все отсечки?") && clearAll()}>
              Очистить
            </Button>
          ) : null}
        </div>
      </div>
      {cuts.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {cuts.map((cut, i) => (
            <CutRow key={cut.id} cut={cut} index={i} total={cuts.length} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Пока нет отсечек. Добавьте вручную или сделайте «Отсечь» из линейки.</p>
      )}
    </section>
  );
}
