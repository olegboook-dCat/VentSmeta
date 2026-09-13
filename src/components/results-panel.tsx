import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionView } from "@/components/section-view";
import { GROUP_LABEL, MATERIALS } from "@/lib/facade/catalog";
import { calculate } from "@/lib/facade/calc";
import { money, num, qty } from "@/lib/facade/format";
import type { CalcResult, Project, SpecGroup, SpecRow, SubsystemMaterial } from "@/lib/facade/types";
import { cn } from "@/lib/utils";

const PIE_COLORS: Record<string, string> = {
  cladding: "#1f4a43",
  subsystem: "#3d6b62",
  insulation: "#8aa89e",
  fasteners: "#c4b8a5",
  flashings: "#5c574c",
  labor: "#2c3d38",
};

export function ResultsPanel({ project }: { project: Project }) {
  const result = useMemo(() => calculate(project), [project]);
  const groups = useMemo(() => groupRows(result.rows), [result.rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Итого по объекту</p>
        <p className="mt-2 font-display text-4xl font-medium tracking-tight tabular-nums text-ink sm:text-5xl">
          {money(result.total)}
        </p>
        <p className="mt-2 text-sm text-muted">
          <span className="tabular-nums">{money(result.perM2)}</span> за м² рабочей площади ·{" "}
          <span className="tabular-nums">{num(result.netArea, 1)} м²</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">Материалы {money(result.materialsSum)}</Badge>
          {result.laborSum > 0 ? <Badge variant="outline">Работы {money(result.laborSum)}</Badge> : null}
          {result.vatSum > 0 ? <Badge variant="outline">НДС {money(result.vatSum)}</Badge> : null}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Площадь стен" value={`${num(result.grossArea, 1)} м²`} />
          <Stat label="Проёмы" value={`${num(result.openingArea, 1)} м²`} />
          <Stat label="К расчёту" value={`${num(result.netArea, 1)} м²`} />
          <Stat label="Масса" value={`${num(result.totalWeight, 0)} кг`} />
        </dl>
      </div>

      <Tabs defaultValue="spec">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="spec" className="h-10">Спецификация</TabsTrigger>
          <TabsTrigger value="cost" className="h-10">Структура</TabsTrigger>
          <TabsTrigger value="heat" className="h-10">Тепло и ветер</TabsTrigger>
          <TabsTrigger value="cut" className="h-10">Разрез</TabsTrigger>
        </TabsList>

        <TabsContent value="spec">
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Позиция</th>
                  <th className="px-3 py-2.5 font-medium">Ед.</th>
                  <th className="px-3 py-2.5 font-medium text-right">Кол-во</th>
                  <th className="px-3 py-2.5 font-medium text-right">С запасом</th>
                  <th className="px-3 py-2.5 font-medium text-right">На 1 м²</th>
                  <th className="px-3 py-2.5 font-medium text-right">Цена</th>
                  <th className="px-3 py-2.5 font-medium text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <GroupBlock key={g.id} group={g} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="px-3 py-3" colSpan={6}>
                    Итого
                    {result.vatSum > 0 ? ` с НДС ${project.vatPercent}%` : " без НДС"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(result.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Расход на 1 м² — по рабочей площади {num(result.netArea, 1)} м². Запас заложен в колонке «с запасом».
            Цены — средние по рынку РФ, 2026, без доставки.
          </p>
        </TabsContent>

        <TabsContent value="cost">
          <CostChart groups={groups} />
          <CompareMaterials project={project} />
        </TabsContent>

        <TabsContent value="heat">
          <ThermalCard result={result} project={project} />
        </TabsContent>

        <TabsContent value="cut">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-2 font-display text-base font-medium">Конструктивный разрез</h3>
            <p className="mb-4 text-sm text-muted">Схема от стены к облицовке. Толщины соответствуют вашим параметрам.</p>
            <SectionView project={project} result={result} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function groupRows(rows: SpecRow[]) {
  const order: SpecGroup[] = ["cladding", "subsystem", "insulation", "fasteners", "flashings", "labor"];
  return order
    .map((id) => {
      const items = rows.filter((r) => r.group === id);
      return { id, label: GROUP_LABEL[id], items, sum: items.reduce((s, r) => s + r.sum, 0) };
    })
    .filter((g) => g.items.length > 0);
}

function GroupBlock({ group }: { group: { id: string; label: string; items: SpecRow[]; sum: number } }) {
  return (
    <>
      <tr className="bg-surface-2/60">
        <td className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-subtle" colSpan={6}>
          {group.label}
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-muted">{money(group.sum)}</td>
      </tr>
      {group.items.map((r) => (
        <tr key={r.id} className="border-t border-border/70">
          <td className="px-3 py-2 text-ink">{r.name}</td>
          <td className="px-3 py-2 text-muted">{r.unit}</td>
          <td className="px-3 py-2 text-right tabular-nums">{qty(r.qty)}</td>
          <td className="px-3 py-2 text-right tabular-nums">{qty(r.qtyReserve)}</td>
          <td className="px-3 py-2 text-right tabular-nums text-muted">{num(r.perM2, 2)}</td>
          <td className="px-3 py-2 text-right tabular-nums">{money(r.price)}</td>
          <td className="px-3 py-2 text-right tabular-nums font-medium">{money(r.sum)}</td>
        </tr>
      ))}
    </>
  );
}

function CostChart({ groups }: { groups: ReturnType<typeof groupRows> }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const data = groups.map((g) => ({ name: g.label, value: Math.round(g.sum), id: g.id }));
  if (!ready) return <div className="h-56 rounded-xl bg-surface-2" />;
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.id} fill={PIE_COLORS[d.id] ?? "#5c574c"} />
              ))}
            </Pie>
            <RTooltip formatter={(v) => money(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col justify-center gap-2 text-sm">
        {data.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: PIE_COLORS[d.id] }} />
              {d.name}
            </span>
            <span className="tabular-nums text-muted">{money(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareMaterials({ project }: { project: Project }) {
  const rows = MATERIALS.map((m) => {
    const r = calculate({ ...project, material: m.id as SubsystemMaterial, autoSteps: true });
    return { id: m.id, name: m.name, total: r.total, perM2: r.perM2, weight: r.totalWeight };
  });
  const min = Math.min(...rows.map((r) => r.total));
  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display text-base font-medium">Сравнение материала подсистемы</h3>
      <p className="mt-1 text-sm text-muted">Один и тот же объект, три каркаса. Остальные параметры не меняются.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-subtle">
            <tr>
              <th className="py-2 text-left font-medium">Материал</th>
              <th className="py-2 text-right font-medium">Итого</th>
              <th className="py-2 text-right font-medium">₽/м²</th>
              <th className="py-2 text-right font-medium">Масса</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-t border-border", r.id === project.material && "bg-accent-soft/60")}>
                <td className="py-2.5">
                  {r.name}
                  {r.total === min ? (
                    <Badge className="ml-2" variant="ok">
                      дешевле
                    </Badge>
                  ) : null}
                </td>
                <td className="py-2.5 text-right tabular-nums">{money(r.total)}</td>
                <td className="py-2.5 text-right tabular-nums">{money(r.perM2)}</td>
                <td className="py-2.5 text-right tabular-nums">{num(r.weight, 0)} кг</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThermalCard({ result, project }: { result: CalcResult; project: Project }) {
  const pct = result.rRequired > 0 ? Math.min(100, (result.rTotal / result.rRequired) * 100) : 100;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          {result.rOk ? (
            <CheckCircle2 className="mt-0.5 size-5 text-ok" />
          ) : (
            <CircleAlert className="mt-0.5 size-5 text-warn" />
          )}
          <div>
            <h3 className="font-display text-base font-medium">
              {result.rOk ? "Норма по теплу выполняется" : "Утеплителя может не хватить"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Для {result.cityName} требуемое сопротивление стены R<sub>req</sub> = {num(result.rRequired, 2)}{" "}
              м²·°C/Вт (ориентир по СП 50.13330). Сейчас R = {num(result.rTotal, 2)}.
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className={cn("h-full rounded-full", result.rOk ? "bg-ok" : "bg-warn")} style={{ width: `${pct}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Основание" value={num(result.rBase, 2)} />
          <Stat label="Утеплитель" value={num(result.rIns, 2)} />
          <Stat label="Итого R" value={num(result.rTotal, 2)} />
          <Stat label="Норма" value={num(result.rRequired, 2)} />
        </dl>
        {!project.insulationOn ? (
          <p className="mt-3 text-sm text-warn">Без утеплителя вентфасад почти не даёт теплозащиты — только вентилируемый зазор.</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="font-display text-base font-medium">Ветер и шаг каркаса</h3>
        <p className="mt-1 text-sm text-muted">
          Район {result.cityName}: w<sub>0</sub> = {num(result.windW0, 2)} кПа. Ориентировочное давление на фасад{" "}
          {num(result.windPressure, 2)} кПа с учётом высоты {num(result.height, 1)} м.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Рекомендуемый шаг направляющих" value={`${result.recommendedGuideStep} мм`} />
          <Stat label="Рекомендуемый шаг кронштейнов" value={`${result.recommendedBracketStep} мм`} />
          <Stat label="Вес облицовки" value={`${num(result.claddingKgM2, 1)} кг/м²`} />
          <Stat label="Объём поставки (ориентир)" value={`${num(result.totalVolume, 1)} м³`} />
        </dl>
        <p className="mt-3 text-xs text-muted">
          Это не статический расчёт НВФ. Перед монтажом нужны испытания анкеров на вырыв и проект КМ.
        </p>
      </div>
    </div>
  );
}
