import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal, Redo2, Undo2 } from "lucide-react";

// Горячие клавиши отмены/повтора. В полях ввода не мешаем нативной отмене текста.
export function useUndoKeyboard(undo: () => void, redo: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
}

const POS_KEY = "ventsmeta-undodock-pos";
const IDLE_MS = 2000; // через столько покоя панель гаснет
const DOCK_W = 168;
const DOCK_H = 56;
const MARGIN = 8;

interface Pos {
  x: number;
  y: number;
}

function clampPos(p: Pos): Pos {
  const maxX = window.innerWidth - DOCK_W - MARGIN;
  const maxY = window.innerHeight - DOCK_H - MARGIN;
  return {
    x: Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, maxX)),
    y: Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, maxY)),
  };
}

interface UndoDockProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Плавающая панель отмены/повтора: полупрозрачная, перетаскивается за круг
// посередине, проявляется при прокрутке / касании и гаснет в покое.
export function UndoDock({ undo, redo, canUndo, canRedo }: UndoDockProps) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [active, setActive] = useState(true);
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Проявить панель и завести таймер угасания.
  const bump = useCallback(() => {
    setActive(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!dragRef.current) setActive(false);
    }, IDLE_MS);
  }, []);

  // Начальная позиция: из localStorage или снизу по центру.
  useEffect(() => {
    let p: Pos | null = null;
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) p = JSON.parse(raw);
    } catch {
      p = null;
    }
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") {
      p = { x: (window.innerWidth - DOCK_W) / 2, y: window.innerHeight - DOCK_H - 84 };
    }
    setPos(clampPos(p));
    bump();
  }, [bump]);

  // Проявление при прокрутке.
  useEffect(() => {
    const onScroll = () => bump();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => setPos((p) => (p ? clampPos(p) : p));
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimeout(idleTimer.current);
    };
  }, [bump]);

  // Перетаскивание за круг-ручку.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      setPos(clampPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy }));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch {
            /* хранилище недоступно — просто не запоминаем */
          }
        }
        return p;
      });
      bump();
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [bump]);

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    const r = dockRef.current?.getBoundingClientRect();
    if (!r) return;
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    setActive(true);
    clearTimeout(idleTimer.current);
  }

  if (!pos) return null;

  return (
    <div
      ref={dockRef}
      className="fixed z-50 select-none transition-opacity duration-300 print:hidden"
      style={{ left: pos.x, top: pos.y, opacity: active ? 1 : 0.35 }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={bump}
    >
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/80 p-1 shadow-lg backdrop-blur">
        <button
          type="button"
          aria-label="Отменить"
          title="Отменить (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => {
            undo();
            bump();
          }}
          className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 disabled:opacity-30 active:scale-95"
        >
          <Undo2 className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Переместить панель"
          title="Перетащите, чтобы переместить"
          onPointerDown={startDrag}
          className="flex size-10 cursor-grab touch-none items-center justify-center rounded-full bg-accent-soft text-accent active:cursor-grabbing"
        >
          <GripHorizontal className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Повторить"
          title="Повторить (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={() => {
            redo();
            bump();
          }}
          className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 disabled:opacity-30 active:scale-95"
        >
          <Redo2 className="size-5" />
        </button>
      </div>
    </div>
  );
}
