import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderOpen, Printer, Save, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InputsPanel } from "@/components/inputs-panel";
import { ResultsPanel } from "@/components/results-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { money, num } from "@/lib/facade/format";
import { calculate } from "@/lib/facade/calc";
import { useProject } from "@/store/project";
import { cn } from "@/lib/utils";

export function CalculatorApp() {
  const { project, saved, saveCurrent, loadSaved, deleteSaved, newProject, applyPreset, presets } = useProject();
  const [tab, setTab] = useState<"in" | "out">("in");
  const [open, setOpen] = useState(false);
  const result = calculate(project);

  function onSave() {
    saveCurrent();
    toast.success("Проект сохранён на этом устройстве");
  }

  function onNew() {
    newProject();
    toast.message("Новый расчёт");
    setTab("in");
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-bg text-ink">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm print:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Logo />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-medium tracking-tight sm:text-base">ВентСмета</p>
              <p className="truncate text-xs text-muted">Калькулятор вентилируемого фасада</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/cutting">
                <Scissors />
                Раскрой
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="icon" className="sm:hidden" asChild aria-label="Раскрой">
              <Link to="/cutting">
                <Scissors />
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Проекты">
              <FolderOpen />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={onSave} aria-label="Сохранить">
              <Save />
            </Button>
            <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => window.print()}>
              <Printer />
              Печать
            </Button>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:py-8">
          <div className="lg:hidden print:hidden">
            <div className="grid grid-cols-2 rounded-lg bg-surface-2 p-1">
              <button
                type="button"
                className={cn("h-11 rounded-md text-sm font-medium", tab === "in" ? "bg-surface shadow-sm" : "text-muted")}
                onClick={() => setTab("in")}
              >
                Параметры
              </button>
              <button
                type="button"
                className={cn("h-11 rounded-md text-sm font-medium", tab === "out" ? "bg-surface shadow-sm" : "text-muted")}
                onClick={() => setTab("out")}
              >
                Смета
              </button>
            </div>
          </div>

          <aside className={cn("min-w-0 print:hidden", tab === "out" ? "hidden lg:block" : "block")}>
            <div className="mb-4 rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">Примеры объектов</p>
              <div className="mt-2 flex flex-col gap-1">
                {presets.map((pr) => (
                  <Button key={pr.id} type="button" variant="ghost" className="justify-start" onClick={() => applyPreset(pr.id)}>
                    {pr.name}
                  </Button>
                ))}
              </div>
            </div>
            <InputsPanel />
            <p className="mt-6 px-1 text-xs leading-relaxed text-muted">
              Расчёт предварительный: без геодезии, без испытаний анкеров и без раскладки плит. Подходит для сметы на
              стадии КП. Не заменяет проект НВФ.
            </p>
            <div className="mt-4 flex gap-2 print:hidden">
              <Button type="button" variant="outline" onClick={onNew}>
                Новый расчёт
              </Button>
            </div>
          </aside>

          <main className={cn("min-w-0", tab === "in" ? "hidden lg:block" : "block")}>
            <div className="print:block">
              <div className="mb-4 hidden print:block">
                <h1 className="font-display text-2xl">{project.name}</h1>
                <p className="text-sm text-muted">ВентСмета · предварительная смета вентфасада</p>
              </div>
              <ResultsPanel project={project} />
            </div>
          </main>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur-sm lg:hidden print:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3"
            onClick={() => setTab("out")}
          >
            <span className="text-left">
              <span className="block text-xs text-muted">Итого</span>
              <span className="font-display text-lg font-medium tabular-nums">{money(result.total)}</span>
            </span>
            <span className="text-sm text-muted tabular-nums">{money(result.perM2)}/м² · {num(result.netArea, 0)} м²</span>
          </button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Сохранённые проекты</DialogTitle>
              <DialogDescription>Хранятся только в этом браузере, без аккаунта.</DialogDescription>
            </DialogHeader>
            {saved.length === 0 ? (
              <p className="text-sm text-muted">Пока пусто. Нажмите «Сохранить», чтобы не потерять расчёт.</p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-1 overflow-auto">
                {saved.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        loadSaved(s.id);
                        setOpen(false);
                        toast.message("Проект открыт");
                      }}
                    >
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="text-xs text-muted">
                        {new Date(s.savedAt).toLocaleString("ru-RU")}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => deleteSaved(s.id)}
                      aria-label="Удалить"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function Logo() {
  return (
    <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M8 3v18M12 3v18M16 3v18M4 9h16M4 15h16" opacity="0.7" />
      </svg>
    </span>
  );
}
