import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROUP_LABEL } from "@/lib/facade/catalog";
import type { Partner, SpecGroup } from "@/lib/facade/types";
import { useProject } from "@/store/project";
import { cn } from "@/lib/utils";

const GROUPS: SpecGroup[] = ["cladding", "subsystem", "insulation", "fasteners", "flashings"];
const QUICK = [0, 3, 5, 10];

function pctOf(v: string): number {
  const n = Number(String(v).replace(",", ".").replace(/\s+/g, ""));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

export function PricingPanel() {
  const p = useProject((s) => s.project);
  const patch = useProject((s) => s.patch);
  const setDiscount = useProject((s) => s.setDiscount);
  const pricePresets = useProject((s) => s.pricePresets);
  const savePricePreset = useProject((s) => s.savePricePreset);
  const applyPricePreset = useProject((s) => s.applyPricePreset);
  const deletePricePreset = useProject((s) => s.deletePricePreset);
  const partners = useProject((s) => s.partners);
  const addPartner = useProject((s) => s.addPartner);
  const assignPartner = useProject((s) => s.assignPartner);

  const overrideCount = Object.keys(p.priceOverrides ?? {}).length;
  const pbg = p.partnerByGroup ?? {};

  return (
    <div className="flex flex-col gap-5">
      {/* Скидки */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-subtle">Скидки</p>
        <DiscountRow label="На материалы" value={p.discountMaterialsPct} onChange={(v) => setDiscount("materials", v)} />
        <DiscountRow label="На работы" value={p.discountLaborPct} onChange={(v) => setDiscount("labor", v)} />
      </div>

      {/* Сценарии прайса */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-subtle">Сценарии прайса</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ priceOverrides: {}, discountMaterialsPct: 0, discountLaborPct: 0 })}
          >
            База
          </Button>
          {pricePresets.map((pp) => (
            <span key={pp.id} className="inline-flex items-center overflow-hidden rounded-full border border-border">
              <button
                type="button"
                className="px-3 py-1.5 text-sm hover:bg-surface-2"
                title={new Date(pp.savedAt).toLocaleString("ru-RU")}
                onClick={() => applyPricePreset(pp.id)}
              >
                {pp.name}
              </button>
              <button
                type="button"
                className="px-2 py-1.5 text-subtle hover:bg-surface-2 hover:text-danger"
                aria-label="Удалить сценарий"
                onClick={() => deletePricePreset(pp.id)}
              >
                ×
              </button>
            </span>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pricePresets.length >= 5}
            onClick={() => {
              const name = window.prompt("Название сценария (поставщик / дата):", "");
              if (name !== null) savePricePreset(name);
            }}
          >
            <Plus className="size-4" /> Сохранить
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Переопределено цен: {overrideCount}. «База» — вернуть все базовые цены и снять скидки. Хранится до 5 сценариев.
        </p>
      </div>

      {/* Партнёры / магазины */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-subtle">Партнёры / магазины</p>
        <div className="flex flex-col gap-2">
          {partners.map((pt) => (
            <PartnerEditor key={pt.id} pt={pt} />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={() => addPartner({ name: "Магазин", contact: "", link: "", promo: "" })}
        >
          <Plus className="size-4" /> Добавить магазин
        </Button>

        {partners.length ? (
          <>
            <p className="mb-1 mt-4 text-xs text-muted">Привязка к разделам сметы (виден в печатной смете)</p>
            <div className="flex flex-col gap-2">
              {GROUPS.map((g) => (
                <div key={g} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{GROUP_LABEL[g]}</span>
                  <select
                    className="h-9 max-w-[55%] rounded-md border border-border bg-surface px-2 text-sm"
                    value={pbg[g] ?? ""}
                    onChange={(e) => assignPartner(g, e.target.value)}
                  >
                    <option value="">— не выбран —</option>
                    {partners.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <p className="mt-2 text-xs text-muted">
          Партнёров вы заводите сами; в смете показываются их контакт, ссылка и промокод. Переходы не отслеживаются
          (у приложения нет сервера).
        </p>
      </div>
    </div>
  );
}

function DiscountRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const v = value || 0;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-sm tabular-nums text-muted">{v ? `−${v}%` : "нет"}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {QUICK.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium",
              v === d ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
            )}
          >
            {d === 0 ? "нет" : `${d}%`}
          </button>
        ))}
        <input
          inputMode="decimal"
          placeholder="%"
          className="h-8 w-16 rounded-md border border-border bg-surface px-2 text-right text-sm tabular-nums"
          value={v ? String(v) : ""}
          onChange={(e) => onChange(pctOf(e.target.value))}
        />
      </div>
    </div>
  );
}

function PartnerEditor({ pt }: { pt: Partner }) {
  const updatePartner = useProject((s) => s.updatePartner);
  const removePartner = useProject((s) => s.removePartner);
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2">
        <Input
          className="h-9"
          placeholder="Название магазина"
          value={pt.name}
          onChange={(e) => updatePartner(pt.id, { name: e.target.value })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 flex-none text-danger"
          aria-label="Удалить магазин"
          onClick={() => removePartner(pt.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input className="h-9" placeholder="Контакт / телефон / город" value={pt.contact} onChange={(e) => updatePartner(pt.id, { contact: e.target.value })} />
        <Input className="h-9" placeholder="Ссылка (реф.)" value={pt.link} onChange={(e) => updatePartner(pt.id, { link: e.target.value })} />
        <Input className="h-9" placeholder="Промокод" value={pt.promo} onChange={(e) => updatePartner(pt.id, { promo: e.target.value })} />
      </div>
    </div>
  );
}
