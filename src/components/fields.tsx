import { Info, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function FieldHint({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs leading-snug text-muted">{text}</p>;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-full text-subtle hover:bg-surface-2 hover:text-ink"
          aria-label="Подсказка"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export function NumberField({
  id,
  label,
  hint,
  unit,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  unit?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <InfoTip text={hint} /> : null}
      </div>
      <div className="flex h-11 items-center rounded-md border border-border bg-surface">
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center text-muted hover:text-ink"
          onClick={() => onChange(Math.max(min, roundStep(value - step, step)))}
          aria-label="Меньше"
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="h-full min-w-0 flex-1 bg-transparent text-center text-sm tabular-nums text-ink outline-none"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
        />
        {unit ? <span className="pr-2 text-xs text-muted">{unit}</span> : null}
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center text-muted hover:text-ink"
          onClick={() => {
            const next = roundStep(value + step, step);
            onChange(max != null ? Math.min(max, next) : next);
          }}
          aria-label="Больше"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function roundStep(n: number, step: number) {
  const s = step >= 1 ? 1 / step : 1 / step;
  if (step >= 1) return Math.round(n / step) * step;
  return Math.round(n * s) / s;
}

export function SelectField({
  id,
  label,
  hint,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <InfoTip text={hint} /> : null}
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-md border border-border bg-surface bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b675e' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>")`,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-line transition-colors duration-150 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
        <span
          className={cn(
            "block size-5 rounded-full bg-surface shadow-sm transition-transform duration-150",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}
