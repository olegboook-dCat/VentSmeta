import { useState } from "react";
import { FolderOpen, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProject } from "@/store/project";

// Общие кнопки «Сохранить / Открыть» для сметы и раскроя. Объект сохраняется
// целиком: смета + раскрой (Вариант A).
export function ProjectsControls() {
  const saved = useProject((s) => s.saved);
  const saveCurrent = useProject((s) => s.saveCurrent);
  const loadSaved = useProject((s) => s.loadSaved);
  const deleteSaved = useProject((s) => s.deleteSaved);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Сохранённые объекты"
        title="Сохранённые объекты"
      >
        <FolderOpen />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          saveCurrent();
          toast.success("Объект сохранён: смета и раскрой");
        }}
        aria-label="Сохранить"
        title="Сохранить объект (смета и раскрой)"
      >
        <Save />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сохранённые объекты</DialogTitle>
            <DialogDescription>Смета и раскрой сохраняются вместе, в этом браузере.</DialogDescription>
          </DialogHeader>
          {saved.length === 0 ? (
            <p className="text-sm text-muted">Пока пусто. Нажмите «Сохранить», чтобы не потерять объект.</p>
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
                      toast.message("Объект открыт");
                    }}
                  >
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted">
                      {new Date(s.savedAt).toLocaleString("ru-RU")}
                      {s.cutting?.cuts?.length ? ` · раскрой: ${s.cutting.cuts.length}` : ""}
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
    </>
  );
}
