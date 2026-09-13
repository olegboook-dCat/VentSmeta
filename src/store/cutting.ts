import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/facade/format";
import { defaultAng, type Ang, type Cut } from "@/lib/cutting/types";

interface State {
  cuts: Cut[];
  entries: number[]; // числа текущей группы (сегменты ширины), мм
  groupHeight: number; // высота текущей группы, мм
  sheetW: number; // ширина листа для линейки, мм (справочно)
  sheetH: number; // высота (длина) листа, мм
  kerf: number; // ширина реза, мм
  allowRotate: boolean;
  standardId: string;

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
  updateCut: (id: string, patch: Partial<Cut>) => void;
  removeCut: (id: string) => void;
  copyCut: (id: string) => void;
  moveCut: (id: string, dir: -1 | 1) => void;

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

export const useCutting = create<State>()(
  persist(
    (set, get) => {
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

        setSheetW: (v) => set({ sheetW: Math.max(0, v) }),
        setSheetH: (v) => set({ sheetH: Math.max(0, v) }),
        setKerf: (v) => set({ kerf: Math.max(0, v) }),
        setAllowRotate: (v) => set({ allowRotate: v }),
        setStandard: (id) => set({ standardId: id }),

        addEntry: (v) => set({ entries: [...get().entries, Math.max(0, v)] }),
        updateEntry: (i, v) => set({ entries: get().entries.map((x, ix) => (ix === i ? Math.max(0, v) : x)) }),
        removeEntry: (i) => set({ entries: get().entries.filter((_, ix) => ix !== i) }),
        setGroupHeight: (v) => set({ groupHeight: Math.max(0, v) }),
        cutGroup: () => {
          const { entries, groupHeight } = get();
          if (!entries.length) return;
          const cut = newCut({ items: entries.slice(), height: groupHeight });
          set({ cuts: [...get().cuts, cut], entries: [], groupHeight: 0 });
        },

        addCut: (partial) => set({ cuts: [...get().cuts, newCut(partial)] }),
        updateCut: (id, patch) => patchCut(id, (c) => ({ ...c, ...patch })),
        removeCut: (id) => set({ cuts: get().cuts.filter((c) => c.id !== id) }),
        copyCut: (id) => {
          const cuts = get().cuts;
          const i = cuts.findIndex((c) => c.id === id);
          if (i < 0) return;
          const clone: Cut = { ...structuredClone(cuts[i]), id: uid("cut") };
          set({ cuts: [...cuts.slice(0, i + 1), clone, ...cuts.slice(i + 1)] });
        },
        moveCut: (id, dir) => {
          const cuts = get().cuts.slice();
          const i = cuts.findIndex((c) => c.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= cuts.length) return;
          [cuts[i], cuts[j]] = [cuts[j], cuts[i]];
          set({ cuts });
        },

        addWidthSeg: (id) => patchCut(id, (c) => ({ ...c, items: [...c.items, 0] })),
        updateWidthSeg: (id, i, v) =>
          patchCut(id, (c) => ({ ...c, items: c.items.map((x, ix) => (ix === i ? Math.max(0, v) : x)) })),
        removeWidthSeg: (id, i) =>
          patchCut(id, (c) => {
            const items = c.items.filter((_, ix) => ix !== i);
            return { ...c, items: items.length ? items : [0] };
          }),
        addHeightSeg: (id) => patchCut(id, (c) => ({ ...c, hItems: [...c.hItems, 0] })),
        updateHeightSeg: (id, i, v) =>
          patchCut(id, (c) => ({ ...c, hItems: c.hItems.map((x, ix) => (ix === i ? Math.max(0, v) : x)) })),
        removeHeightSeg: (id, i) => patchCut(id, (c) => ({ ...c, hItems: c.hItems.filter((_, ix) => ix !== i) })),

        setAng: (id, patch) =>
          patchCut(id, (c) => {
            const ang = { ...c.ang, ...patch };
            if (ang.edge !== "none" && !(ang.deg > 0) && !(ang.w2 > 0)) ang.deg = 45;
            return { ...c, ang };
          }),
        setAngMode: (id, mode) => patchCut(id, (c) => ({ ...c, angMode: mode })),

        addJoint: (a, b, h, edgeDeg, mode, axis) => {
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

        clearAll: () => set({ cuts: [], entries: [], groupHeight: 0 }),
      };
    },
    { name: "ventsmeta-cutting-v1" },
  ),
);
