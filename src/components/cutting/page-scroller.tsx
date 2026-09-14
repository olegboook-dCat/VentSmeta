import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsDown, ChevronsUp } from "lucide-react";

const THUMB_H = 48; // высота ползунка, px
const MIN_SCROLL = 400; // показываем инструмент, если прокрутка больше этого

// Быстрая прокрутка длинной страницы: правый ползунок «как в галерее телефона»
// (тянешь — страница листается) + кнопки «в начало / в конец» за один клик.
export function PageScroller() {
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const recompute = useCallback(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    setScrollable(max > MIN_SCROLL);
    setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
  }, []);

  useEffect(() => {
    recompute();
    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
      ro.disconnect();
    };
  }, [recompute]);

  const scrollToClientY = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: frac * max });
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (draggingRef.current) {
        e.preventDefault();
        scrollToClientY(e.clientY);
      }
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [scrollToClientY]);

  if (!scrollable) return null;

  return (
    <>
      {/* правый ползунок быстрой прокрутки */}
      <div
        ref={trackRef}
        className="fixed right-1 top-24 bottom-28 z-40 w-6 touch-none print:hidden"
        role="scrollbar"
        aria-label="Быстрая прокрутка"
        aria-orientation="vertical"
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          scrollToClientY(e.clientY);
        }}
      >
        <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-line/60" />
        <div
          className="absolute left-1/2 w-5 -translate-x-1/2 rounded-full border border-border bg-primary/90 shadow-md"
          style={{ height: THUMB_H, top: `calc(${progress * 100}% - ${(progress * THUMB_H).toFixed(1)}px)` }}
        />
      </div>

      {/* кнопки «в начало» / «в конец» */}
      <div className="fixed bottom-6 right-8 z-40 flex flex-col gap-2 print:hidden">
        <button
          type="button"
          aria-label="В начало"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-md active:scale-95"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronsUp className="size-5" />
        </button>
        <button
          type="button"
          aria-label="В конец"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-md active:scale-95"
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
        >
          <ChevronsDown className="size-5" />
        </button>
      </div>
    </>
  );
}
