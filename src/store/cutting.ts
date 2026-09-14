import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/facade/format";
import { defaultAng, type Ang, type Cut } from "@/lib/cutting/types";

// Снимок редактируемого «документа» для истории undo/redo.
interface HistDoc {
  cuts: Cut[];
  entries: number[];
  groupHeight: number;
}

interface State {
  cuts: Cut[];
  entries: number[]; // числа текущей группы (сегменты ширины), мм
  groupHeight: number; // высота текущей группы, мм
  sheetW: number; // ширина листа для линейки, мм (справочно)
  sheetH: number; // высота (длина) листа, мм
  kerf: number; // ширина реза, мм
  allowRotate: boolean;
  standardId: string;

  // История (не персистится)
  past: HistDoc[];
  future: HistDoc[];
  _hk?: string; // ключ для склейки серии правок одного поля
  _ht: number; // время последней записи

  // Настройки
  setSheetW: (v: number) => void;
  setSheetH: (v: number) => void;
  setKerf: (v: number) => void;
  setAllowRotate: (v: boolean) => void;
  setStandard: (id: string) => void;

  // Текущая группа
  addEntry: (v: number) => void;
  updateEntry: (i: number, v: number) => void;
  removeEntry: (i: number) => void;
  setGroupHeight: (v: number) => void;
  cutGroup: () => void; // «✂ Отсечь»

  // Отсечки
  addCut: (partial?: Partial<Cut>) => void;
  updateCut: (id: string, patch: Partial<Cut>, coalesceKey?: string) => void;
  removeCut: (id: string) => void;
  copyCut: (id: string) => void;
  moveCut: (id: string, dir: -1 | 1) => void;
  moveCutToIndex: (id: string, toIndex: number) => void; // тихо, для перетаскивания

  // Сегменты ширины / высоты
  addWidthSeg: (id: string) => void;
  updateWidthSeg: (id: string, i: number, v: number) => void;
  removeWidthSeg: (id: string, i: number) => void;
  addHeightSeg: (id: string) => void;
  updateHeightSeg: (id: string, i: number, v: number) => void;
  removeHeightSeg: (id: string, i: number) => void;

  // Диагональный рез
  setAng: (id: string, patch: Partial<Ang>) => void;
  setAngMode: (id: string, mode: "edge" | "corner") => void;

  // Генератор стыка двух панелей
  addJoint: (a: number, b: number, h: number, edgeDeg: number, mode: "edge" | "corner", axis: "height" | "width") => void;

  clearAll: () => void;

  // История
  snapshot: () => void; // зафиксировать точку (перед серией тихих изменений)
  undo: () => void;
  redo: () => void;
}

function newCut(partial?: Partial<Cut>): Cut {
  return {
    id: uid("cut"),
    name: "",
    items: [0],
    height: 0,
    hItems: [],
    ang: defaultAng(),
    angMode: "edge",
    ...partial,
  };
}

const demoCuts = (): Cut[] => [
  { id: uid("cut"), name: "Откос", items: [250], height: 1500, hItems: [], ang: defaultAng(), angMode: "edge" },
  { id: uid("cut"), name: "Отлив", items: [100, 200, 40], height: 600, hItems: [], ang: defaultAng(), angMode: "edge" },
];

const snap = (st: State): HistDoc => ({
  cuts: structuredClone(st.cuts),
  entries: [...st.entries],
  groupHeight: st.groupHeight,
});

const HISTORY_LIMIT = 100;
const COALESCE_MS = 700;

export const useCutting = create<State>()(
  persist(
    (set, get) => {
      // Зафиксировать текущее состояние в истории ПЕРЕД мутацией. coalesceKey
      // склеивает серию быстрых правок одного поля в один шаг отмены.
      const record = (coalesceKey?: string) => {
        const st = get();
        const now = Date.now();
        if (coalesceKey && coalesceKey === st._hk && now - st._ht < COALESCE_MS) {
          set({ _ht: now });
          return;
        }
        set({ past: [...st.past, snap(st)].slice(-HISTORY_LIMIT), future: [], _hk: coalesceKey, _ht: now });
      };
      const patchCut = (id: string, fn: (c: Cut) => Cut) =>
        set({ cuts: get().cuts.map((c) => (c.id === id ? fn(c) : c)) });

      return {
        cuts: demoCuts(),
        entries: [],
        groupHeight: 0,
        sheetW: 1220,
        sheetH: 4000,
        kerf: 3,
        allowRotate: true,
        standardId: "1220_1500",
        past: [],
        future: [],
        _ht: 0,

        // Настройки — вне истории
        setSheetW: (v) => set({ sheetW: Math.max(0, v) }),
        setSheetH: (v) => set({ sheetH: Math.max(0, v) }),
        setKerf: (v) => set({ kerf: Math.max(0, v) }),
        setAllowRotate: (v) => set({ allowRotate: v }),
        setStandard: (id) => set({ standardId: id }),

        addEntry: (v) => {
          record();
          set({ entries: [...get().entries, Math.max(0, v)] });
        },
        updateEntry: (i, v) => {
          record(`entry-${i}`);
          set({ entries: get().entries.map((x, ix) => (ix === i ? Math.max(0, v) : x)) });
        },
        removeEntry: (i) => {
          record();
          set({ entries: get().entries.filter((_, ix) => ix !== i) });
        },
        setGroupHeight: (v) => {
          record("groupHeight");
          set({ groupHeight: Math.max(0, v) });
        },
        cutGroup: () => {
          const { entries, groupHeight } = get();
          if (!entries.length) return;
          record();
          const cut = newCut({ items: entries.slice(), height: groupHeight });
          set({ cuts: [...get().cuts, cut], entries: [], groupHeight: 0 });
        },

        addCut: (partial) => {
          record();
          set({ cuts: [...get().cuts, newCut(partial)] });
        },
        updateCut: (id, patch, coalesceKey) => {
          record(coalesceKey ?? `cut-${id}`);
          patchCut(id, (c) => ({ ...c, ...patch }));
        },
        removeCut: (id) => {
          record();
          set({ cuts: get().cuts.filter((c) => c.id !== id) });
        },
        copyCut: (id) => {
          const cuts = get().cuts;
          const i = cuts.findIndex((c) => c.id === id);
          if (i < 0) return;
          record();
          const clone: Cut = { ...structuredClone(cuts[i]), id: uid("cut") };
          set({ cuts: [...cuts.slice(0, i + 1), clone, ...cuts.slice(i + 1)] });
        },
        moveCut: (id, dir) => {
          const cuts = get().cuts.slice();
          const i = cuts.findIndex((c) => c.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= cuts.length) return;
          record();
          [cuts[i], cuts[j]] = [cuts[j], cuts[i]];
          set({ cuts });
        },
        moveCutToIndex: (id, toIndex) => {
          const cuts = get().cuts.slice();
          const from = cuts.findIndex((c) => c.id === id);
          if (from < 0) return;
          const to = Math.max(0, Math.min(cuts.length - 1, toIndex));
          if (from === to) return;
          const [item] = cuts.splice(from, 1);
          cuts.splice(to, 0, item);
          set({ cuts }); // тихо: точку истории ставит snapshot() в начале перетаскивания
        },

        addWidthSeg: (id) => {
          record();
          patchCut(id, (c) => ({ ...c, items: [...c.items, 0] }));
        },
        updateWidthSeg: (id, i, v) => {
          record(`wseg-${id}-${i}`);
          patchCut(id, (c) => ({ ...c, items: c.items.map((x, ix) => (ix === i ? Math.max(0, v) : x)) }));
        },
        removeWidthSeg: (id, i) => {
          record();
          patchCut(id, (c) => {
            const items = c.items.filter((_, ix) => ix !== i);
            return { ...c, items: items.length ? items : [0] };
          });
        },
        addHeightSeg: (id) => {
          record();
          patchCut(id, (c) => ({ ...c, hItems: [...c.hItems, 0] }));
        },
        updateHeightSeg: (id, i, v) => {
          record(`hseg-${id}-${i}`);
          patchCut(id, (c) => ({ ...c, hItems: c.hItems.map((x, ix) => (ix === i ? Math.max(0, v) : x)) }));
        },
        removeHeightSeg: (id, i) => {
          record();
          patchCut(id, (c) => ({ ...c, hItems: c.hItems.filter((_, ix) => ix !== i) }));
        },

        setAng: (id, patch) => {
          record();
          patchCut(id, (c) => {
            const ang = { ...c.ang, ...patch };
            if (ang.edge !== "none" && !(ang.deg > 0) && !(ang.w2 > 0)) ang.deg = 45;
            return { ...c, ang };
          });
        },
        setAngMode: (id, mode) => {
          record();
          patchCut(id, (c) => ({ ...c, angMode: mode }));
        },

        addJoint: (a, b, h, edgeDeg, mode, axis) => {
          record();
          const base: Partial<Cut> = { height: h, hItems: [], angMode: mode };
          const cutA = newCut({
            ...base,
            name: "Стык A",
            items: [a],
            ang: { edge: "right", deg: edgeDeg, corner: "top", axis, w2: 0 },
          });
          const cutB = newCut({
            ...base,
            name: "Стык B",
            items: [b],
            ang: { edge: "left", deg: edgeDeg, corner: "top", axis, w2: 0 },
          });
          set({ cuts: [...get().cuts, cutA, cutB] });
        },

        clearAll: () => {
          record();
          set({ cuts: [], entries: [], groupHeight: 0 });
        },

        snapshot: () => record(),
        undo: () => {
          const st = get();
          if (!st.past.length) return;
          const prev = st.past[st.past.length - 1];
          set({
            cuts: prev.cuts,
            entries: prev.entries,
            groupHeight: prev.groupHeight,
            past: st.past.slice(0, -1),
            future: [...st.future, snap(st)],
            _hk: undefined,
          });
        },
        redo: () => {
          const st = get();
          if (!st.future.length) return;
          const nxt = st.future[st.future.length - 1];
          set({
            cuts: nxt.cuts,
            entries: nxt.entries,
            groupHeight: nxt.groupHeight,
            future: st.future.slice(0, -1),
            past: [...st.past, snap(st)],
            _hk: undefined,
          });
        },
      };
    },
    {
      name: "ventsmeta-cutting-v1",
      // персистим только документ и настройки — историю не сохраняем
      partialize: (s) => ({
        cuts: s.cuts,
        entries: s.entries,
        groupHeight: s.groupHeight,
        sheetW: s.sheetW,
        sheetH: s.sheetH,
        kerf: s.kerf,
        allowRotate: s.allowRotate,
        standardId: s.standardId,
      }),
    },
  ),
);
