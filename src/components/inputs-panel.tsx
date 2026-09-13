import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField, SelectField, ToggleRow } from "@/components/fields";
import { CLADDINGS, CITIES, INSULATIONS, MATERIALS, SCHEMES, WALL_TYPES } from "@/lib/facade/catalog";
import { uid } from "@/lib/facade/format";
import type { CladdingId, InsulationKind, Scheme, SubsystemMaterial } from "@/lib/facade/types";
import { useProject } from "@/store/project";
import { cn } from "@/lib/utils";

export function InputsPanel() {
  const { project: p, patch, setCladding } = useProject();

  return (
    <div className="flex flex-col gap-5">
      <Section title="Объект" n="01">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="pname">
              Название проекта
            </label>
            <Input id="pname" value={p.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <SelectField
            id="city"
            label="Город"
            hint="По городу берём климат (ГСОП) и ветровой район — от этого зависят толщина утеплителя и шаг кронштейнов."
            value={p.cityId}
            onChange={(v) => patch({ cityId: v })}
            options={CITIES.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            id="wall"
            label="Несущая стена"
            hint="Сопротивление теплопередаче существующей стены. Нужно, чтобы понять, хватает ли утеплителя по СП 50.13330."
            value={p.wallTypeId}
            onChange={(v) => patch({ wallTypeId: v })}
            options={WALL_TYPES.map((w) => ({ value: w.id, label: w.name }))}
          />
        </div>
      </Section>

      <Section title="Геометрия" n="02">
        <div className="mb-3 flex rounded-lg bg-surface-2 p-1">
          {(
            [
              ["simple", "Простой ввод"],
              ["walls", "По стенам"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => patch({ inputMode: id })}
              className={cn(
                "h-10 flex-1 rounded-md text-sm font-medium",
                p.inputMode === id ? "bg-surface text-ink shadow-sm" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {p.inputMode === "simple" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField id="area" label="Площадь фасадов" unit="м²" hint="Сумма площадей всех стен до вычета окон и дверей." value={p.simpleArea} onChange={(n) => patch({ simpleArea: n })} step={1} />
            <NumberField id="perim" label="Периметр здания" unit="м" hint="Сумма длин всех фасадных стен по земле." value={p.simplePerimeter} onChange={(n) => patch({ simplePerimeter: n })} step={0.5} />
            <NumberField id="h" label="Высота фасада" unit="м" hint="От отмостки до парапета. Если не знаете — оставьте 0, высота посчитается как площадь / периметр." value={p.simpleHeight} onChange={(n) => patch({ simpleHeight: n })} step={0.1} />
            <NumberField id="oa" label="Площадь окон и дверей" unit="м²" hint="Её вычтем из площади фасада. Одностворчатое окно ≈ 1,5 м², двустворчатое ≈ 2,5 м²." value={p.simpleOpeningsArea} onChange={(n) => patch({ simpleOpeningsArea: n })} step={0.5} />
            <NumberField id="op" label="Периметр проёмов" unit="м" hint="Нужен для откосов и дополнительных направляющих вокруг окон." value={p.simpleOpeningsPerim} onChange={(n) => patch({ simpleOpeningsPerim: n })} step={0.5} />
            <NumberField id="sill" label="Длина отливов" unit="м" hint="Обычно равна сумме ширин всех окон." value={p.simpleSillLength} onChange={(n) => patch({ simpleSillLength: n })} step={0.5} />
          </div>
        ) : (
          <WallsEditor />
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NumberField id="oc" label="Наружных углов" unit="шт" value={p.outerCorners} onChange={(n) => patch({ outerCorners: Math.round(n) })} step={1} hint="Внешние углы здания. На каждый угол идёт угловой элемент на всю высоту." />
          <NumberField id="ic" label="Внутренних углов" unit="шт" value={p.innerCorners} onChange={(n) => patch({ innerCorners: Math.round(n) })} step={1} />
        </div>
        <div className="mt-3">
          <ToggleRow label="Парапетные крышки" hint="Закрывают верх стены. Обычно периметр здания." checked={p.includeParapet} onChange={(v) => patch({ includeParapet: v })} />
        </div>
      </Section>

      <Section title="Облицовка" n="03">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CLADDINGS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCladding(c.id as CladdingId)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-150",
                p.claddingId === c.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <span className="block h-8 w-full rounded-sm" style={{ background: c.swatch }} />
              <span className="text-sm font-medium text-ink">{c.name}</span>
              <span className="text-xs text-muted">{c.kgM2} кг/м²</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{CLADDINGS.find((c) => c.id === p.claddingId)?.blurb}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SelectField
            id="size"
            label="Формат плиты"
            value={`${p.panelW}x${p.panelH}`}
            onChange={(v) => {
              const [w, h] = v.split("x").map(Number);
              patch({ panelW: w, panelH: h });
            }}
            options={CLADDINGS.find((c) => c.id === p.claddingId)!.sizes.map(([w, h]) => ({
              value: `${w}x${h}`,
              label: `${w}×${h} мм`,
            }))}
          />
          <NumberField id="th" label="Толщина" unit="мм" value={p.panelT} onChange={(n) => patch({ panelT: n })} step={1} min={0.4} />
          <NumberField id="waste" label="Запас на подрезку" unit="%" hint="На простую прямоугольную раскладку 7–8%, на сложную с большим числом окон — 10–12%." value={p.wastePercent} onChange={(n) => patch({ wastePercent: n })} step={1} min={0} max={25} />
        </div>
      </Section>

      <Section title="Подсистема" n="04">
        <div className="grid gap-2">
          {MATERIALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => patch({ material: m.id as SubsystemMaterial })}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors duration-150",
                p.material === m.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <span className="block text-sm font-medium">{m.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{m.hint}</span>
            </button>
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-subtle">Схема каркаса</p>
        <div className="grid gap-2">
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ scheme: s.id as Scheme })}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors duration-150",
                p.scheme === s.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <span className="block text-sm font-medium">{s.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{s.hint}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <ToggleRow label="Автоматический шаг" hint="Шаг направляющих и кронштейнов подберём по весу облицовки, высоте и ветру. Можно выключить и задать вручную." checked={p.autoSteps} onChange={(v) => patch({ autoSteps: v })} />
        </div>
        {!p.autoSteps ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField id="gs" label="Шаг направляющих" unit="мм" value={p.guideStep} onChange={(n) => patch({ guideStep: n })} step={50} min={300} max={1500} />
            <NumberField id="bs" label="Шаг кронштейнов" unit="мм" value={p.bracketStep} onChange={(n) => patch({ bracketStep: n })} step={50} min={400} max={2000} />
          </div>
        ) : null}
      </Section>

      <Section title="Утепление" n="05">
        <ToggleRow label="Утеплитель" hint="Фасадная минвата или PIR в зоне вентфасада. Толщину сверяем с нормой по городу." checked={p.insulationOn} onChange={(v) => patch({ insulationOn: v })} />
        {p.insulationOn ? (
          <div className="mt-3 grid gap-3">
            <SelectField id="ins" label="Тип утеплителя" value={p.insulationKind} onChange={(v) => patch({ insulationKind: v as InsulationKind })} options={INSULATIONS.map((i) => ({ value: i.id, label: i.name }))} />
            <NumberField id="imm" label="Толщина" unit="мм" value={p.insulationMm} onChange={(n) => patch({ insulationMm: n })} step={10} min={50} max={250} />
            <div className="flex flex-wrap gap-2">
              {[50, 80, 100, 120, 150, 180, 200].map((n) => (
                <button key={n} type="button" onClick={() => patch({ insulationMm: n })} className={cn("h-9 rounded-full border px-3 text-xs font-medium", p.insulationMm === n ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}>
                  {n} мм
                </button>
              ))}
            </div>
            <NumberField id="gap" label="Вентилируемый зазор" unit="мм" hint="Обычно 40–60 мм. Нельзя перекрывать — через него уходит конденсат." value={p.ventGap} onChange={(n) => patch({ ventGap: n })} step={5} min={20} max={100} />
            <ToggleRow label="Гидроветрозащитная мембрана" hint="Ставят поверх утеплителя с нахлёстом 100–150 мм." checked={p.membraneOn} onChange={(v) => patch({ membraneOn: v })} />
          </div>
        ) : null}
      </Section>

      <Section title="Смета и работы" n="06">
        <div className="flex flex-col gap-2">
          <ToggleRow label="Включить монтажные работы" checked={p.includeLabor} onChange={(v) => patch({ includeLabor: v })} />
          <ToggleRow label="Проектные работы" hint="Ориентир на КМ / КМД. Точный проект делается отдельно." checked={p.includeDesign} onChange={(v) => patch({ includeDesign: v })} />
          <ToggleRow label="Леса и люльки" hint="Грубая оценка. На высотных объектах считают отдельно." checked={p.includeScaffold} onChange={(v) => patch({ includeScaffold: v })} />
          <ToggleRow label={`НДС ${p.vatPercent}%`} checked={p.vatOn} onChange={(v) => patch({ vatOn: v })} />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, n, children }: { title: string; n: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-xs text-subtle">{n}</span>
        <h2 className="font-display text-base font-medium tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function WallsEditor() {
  const { project: p, patch } = useProject();
  return (
    <div className="flex flex-col gap-3">
      {p.walls.map((w, i) => (
        <div key={w.id} className="grid grid-cols-[1fr_4.5rem_4.5rem_2.75rem] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            {i === 0 ? <span className="text-xs text-muted">Стена</span> : null}
            <Input value={w.name} onChange={(e) => patch({ walls: p.walls.map((x) => (x.id === w.id ? { ...x, name: e.target.value } : x)) })} />
          </div>
          <NumberMini label={i === 0 ? "Ширина, м" : undefined} value={w.width} onChange={(n) => patch({ walls: p.walls.map((x) => (x.id === w.id ? { ...x, width: n } : x)) })} />
          <NumberMini label={i === 0 ? "Высота, м" : undefined} value={w.height} onChange={(n) => patch({ walls: p.walls.map((x) => (x.id === w.id ? { ...x, height: n } : x)) })} />
          <Button type="button" variant="ghost" size="icon" className="size-11" onClick={() => patch({ walls: p.walls.filter((x) => x.id !== w.id) })} aria-label="Удалить стену">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => patch({ walls: [...p.walls, { id: uid("w"), name: `Фасад ${p.walls.length + 1}`, width: 8, height: 6 }] })}>
        <Plus className="size-4" />
        Добавить стену
      </Button>

      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-subtle">Проёмы</p>
      {p.openings.map((o, i) => (
        <div key={o.id} className="grid grid-cols-[5.5rem_4.2rem_4.2rem_4.2rem_2.75rem] items-end gap-2">
          <select
            className="h-11 rounded-md border border-border bg-surface px-2 text-sm"
            value={o.kind}
            onChange={(e) => patch({ openings: p.openings.map((x) => (x.id === o.id ? { ...x, kind: e.target.value as "window" | "door" } : x)) })}
          >
            <option value="window">Окно</option>
            <option value="door">Дверь</option>
          </select>
          <NumberMini label={i === 0 ? "Ш, м" : undefined} value={o.width} onChange={(n) => patch({ openings: p.openings.map((x) => (x.id === o.id ? { ...x, width: n } : x)) })} />
          <NumberMini label={i === 0 ? "В, м" : undefined} value={o.height} onChange={(n) => patch({ openings: p.openings.map((x) => (x.id === o.id ? { ...x, height: n } : x)) })} />
          <NumberMini label={i === 0 ? "Шт" : undefined} value={o.count} onChange={(n) => patch({ openings: p.openings.map((x) => (x.id === o.id ? { ...x, count: Math.round(n) } : x)) })} />
          <Button type="button" variant="ghost" size="icon" className="size-11" onClick={() => patch({ openings: p.openings.filter((x) => x.id !== o.id) })} aria-label="Удалить проём">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => patch({ openings: [...p.openings, { id: uid("o"), kind: "window", width: 1.5, height: 1.5, count: 1 }] })}>
        <Plus className="size-4" />
        Добавить проём
      </Button>
    </div>
  );
}

function NumberMini({ label, value, onChange }: { label?: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label ? <span className="text-xs text-muted">{label}</span> : <span className="sr-only">число</span>}
      <input type="number" className="h-11 w-full rounded-md border border-border bg-surface px-2 text-center text-sm tabular-nums" value={value} min={0} step={0.1} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </label>
  );
}
