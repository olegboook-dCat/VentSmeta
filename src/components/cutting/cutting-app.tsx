import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CutList } from "@/components/cutting/cut-list";
import { Developments } from "@/components/cutting/developments";
import { NestPreview } from "@/components/cutting/nest-preview";
import { PageScroller } from "@/components/cutting/page-scroller";
import { UndoDock, useUndoKeyboard } from "@/components/cutting/undo-dock";
import { SHEET_STANDARDS } from "@/lib/cutting/types";
import { useCutting } from "@/store/cutting";
import { cn } from "@/lib/utils";

function parseNum(v: string): number {
  const n = Number(String(v).replace(",", ".").replace(/\s+/g, ""));
  return Number.isFinite(n) ? n : 0;
}
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

export function CuttingApp() {
  const s = useCutting();
  const [entryDraft, setEntryDraft] = useState("");
  const groupSum = s.entries.reduce((a, v) => a + v, 0);

  useUndoKeyboard(s.undo, s.redo);

  function addEntry() {
    if (entryDraft.trim() === "") return;
    s.addEntry(parseNum(entryDraft));
    setEntryDraft("");
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-bg text-ink">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden>
              <Scissors className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-medium tracking-tight sm:text-base">Раскрой</p>
              <p className="truncate text-xs text-muted">Замер, оптимизация листа и чертёж на станок</p>
            </div>
            <nav className="flex items-center gap-1 rounded-lg bg-surface-2 p-1 text-sm">
              <Link to="/" className="rounded-md px-3 py-1.5 font-medium text-muted hover:text-ink">
                Смета
              </Link>
              <span className="rounded-md bg-surface px-3 py-1.5 font-medium shadow-sm">Раскрой</span>
            </nav>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:py-8">
          <aside className="flex min-w-0 flex-col gap-4">
            {/* Настройки листа и раскроя */}
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="font-display text-base">Лист и раскрой</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="text-xs text-muted">Ширина листа, мм</span>
                  <div className="mt-1 flex gap-1">
                    <Input inputMode="decimal" className="h-9" value={fmt(s.sheetW)} onChange={(e) => s.setSheetW(parseNum(e.target.value))} />
                  </div>
                </label>
                <label className="text-sm">
                  <span className="text-xs text-muted">Высота листа, мм</span>
                  <Input inputMode="decimal" className="mt-1 h-9" value={fmt(s.sheetH)} onChange={(e) => s.setSheetH(parseNum(e.target.value))} />
                </label>
              </div>
              <div className="mt-2 flex gap-1">
                {[1000, 1220, 1250, 1500].map((w) => (
                  <Button key={w} type="button" variant="outline" size="sm" onClick={() => s.setSheetW(w)}>
                    {w}
                  </Button>
                ))}
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-xs text-muted">Стандарт листа (ширины для раскроя)</span>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                  value={s.standardId}
                  onChange={(e) => s.setStandard(e.target.value)}
                >
                  {SHEET_STANDARDS.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {/* Линейка: собрать ширину из кусков и «отсечь» */}
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="font-display text-base">Линейка</h2>
              <p className="mt-1 text-xs text-muted">Введите ширины кусков (Enter) — сумма станет шириной отсечки.</p>
              <div className="mt-3 flex gap-2">
                <Input
                  inputMode="decimal"
                  placeholder="Ширина куска, мм"
                  value={entryDraft}
                  onChange={(e) => setEntryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEntry();
                    }
                  }}
                />
                <Button type="button" onClick={addEntry}>
                  ＋
                </Button>
              </div>
              {s.entries.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.entries.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-sm">
                      {fmt(v)}
                      <button type="button" className="text-danger" onClick={() => s.removeEntry(i)} aria-label="Удалить">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <label className="text-sm">
                  <span className="text-xs text-muted">Высота, мм</span>
                  <Input
                    inputMode="decimal"
                    className="mt-1 h-9 w-28"
                    value={s.groupHeight ? fmt(s.groupHeight) : ""}
                    onChange={(e) => s.setGroupHeight(parseNum(e.target.value))}
                  />
                </label>
                <span className="mt-4 text-sm text-muted">
                  сумма: <b className="tabular-nums text-ink">{fmt(groupSum)}</b> мм
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                disabled={!s.entries.length}
                onClick={s.cutGroup}
              >
                <Scissors className="size-4" /> Отсечь
              </Button>
            </section>

            {/* Генератор стыка из двух панелей */}
            <JointForm />
          </aside>

          <main className="flex min-w-0 flex-col gap-6">
            <CutList />
            <Developments />
            <NestPreview />
          </main>
        </div>
        <PageScroller />
        <UndoDock undo={s.undo} redo={s.redo} canUndo={s.past.length > 0} canRedo={s.future.length > 0} />
      </div>
    </TooltipProvider>
  );
}

function JointForm() {
  const addJoint = useCutting((st) => st.addJoint);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [h, setH] = useState("");
  const [deg, setDeg] = useState("45");
  const [mode, setMode] = useState<"edge" | "corner">("edge");
  const [axis, setAxis] = useState<"height" | "width">("height");
  const [open, setOpen] = useState(false);

  function create() {
    const av = parseNum(a);
    const bv = parseNum(b);
    const hv = parseNum(h);
    const raw = Math.max(0, parseNum(deg));
    const edgeDeg = mode === "corner" ? raw / 2 : raw;
    if (!(av > 0) || !(bv > 0) || !(hv > 0) || !(edgeDeg > 0) || edgeDeg >= 90) return;
    addJoint(av, bv, hv, edgeDeg, mode, axis);
    setA("");
    setB("");
    setH("");
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <button type="button" className="flex w-full items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <h2 className="font-display text-base">◺ Стык в плоскости (диагональный рез)</h2>
        <span className="text-muted">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <LabeledInput label="Сторона A, мм" value={a} onChange={setA} />
            <LabeledInput label="Сторона B, мм" value={b} onChange={setB} />
            <LabeledInput label="Высота, мм" value={h} onChange={setH} />
            <LabeledInput label="Угол, °" value={deg} onChange={setDeg} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode(mode === "corner" ? "edge" : "corner")}>
              угол: {mode === "corner" ? "поворота" : "кромки"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAxis(axis === "width" ? "height" : "width")}>
              {axis === "width" ? "⇔ во всю ширину" : "⇕ во всю высоту"}
            </Button>
          </div>
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={create}>
            Создать стык (2 панели)
          </Button>
          <p className="mt-2 text-xs text-muted">Две панели A×H и B×H с реальным диагональным резом кромок — стыкуются встык.</p>
        </>
      ) : null}
    </section>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={cn("text-sm")}>
      <span className="text-xs text-muted">{label}</span>
      <Input inputMode="decimal" className="mt-1 h-9" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
