import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculate } from "@/lib/facade/calc";
import { claddingById } from "@/lib/facade/catalog";
import { uid } from "@/lib/facade/format";
import type { CalcResult, CladdingId, Project, SavedProject } from "@/lib/facade/types";

export const defaultProject = (): Project => ({
  id: "demo",
  name: "Дом 10×8, два этажа",
  cityId: "msk",
  wallTypeId: "brick510",
  inputMode: "simple",
  simpleArea: 216,
  simplePerimeter: 36,
  simpleHeight: 6,
  simpleOpeningsArea: 28,
  simpleOpeningsPerim: 52,
  simpleSillLength: 14,
  outerCorners: 4,
  innerCorners: 0,
  includeParapet: true,
  walls: [
    { id: "w1", name: "Фасад А", width: 10, height: 6 },
    { id: "w2", name: "Фасад Б", width: 8, height: 6 },
    { id: "w3", name: "Фасад В", width: 10, height: 6 },
    { id: "w4", name: "Фасад Г", width: 8, height: 6 },
  ],
  openings: [
    { id: "o1", kind: "window", width: 1.5, height: 1.5, count: 10 },
    { id: "o2", kind: "door", width: 1.0, height: 2.1, count: 2 },
  ],
  claddingId: "porcelain",
  panelW: 600,
  panelH: 600,
  panelT: 10,
  material: "galvanized",
  scheme: "vertical",
  guideStep: 600,
  bracketStep: 850,
  autoSteps: true,
  insulationOn: true,
  insulationKind: "mineral",
  insulationMm: 100,
  membraneOn: true,
  ventGap: 50,
  wastePercent: 8,
  includeLabor: true,
  includeDesign: true,
  includeScaffold: false,
  vatOn: true,
  vatPercent: 22,
  priceOverrides: {},
});

const PRESETS: { id: string; name: string; patch: Partial<Project> }[] = [
  {
    id: "house",
    name: "Частный дом 10×8",
    patch: {
      name: "Дом 10×8, два этажа",
      simpleArea: 216,
      simplePerimeter: 36,
      simpleHeight: 6,
      simpleOpeningsArea: 28,
      simpleOpeningsPerim: 52,
      simpleSillLength: 14,
      outerCorners: 4,
      innerCorners: 0,
      claddingId: "porcelain",
      panelW: 600,
      panelH: 600,
      panelT: 10,
      wastePercent: 8,
      insulationMm: 100,
    },
  },
  {
    id: "cottage",
    name: "Коттедж 12×10",
    patch: {
      name: "Коттедж 12×10",
      simpleArea: 308,
      simplePerimeter: 44,
      simpleHeight: 7,
      simpleOpeningsArea: 42,
      simpleOpeningsPerim: 68,
      simpleSillLength: 18,
      outerCorners: 6,
      innerCorners: 2,
      claddingId: "fiber",
      panelW: 1200,
      panelH: 1500,
      panelT: 8,
      wastePercent: 9,
      insulationMm: 120,
    },
  },
  {
    id: "section",
    name: "Секция 9 этажей",
    patch: {
      name: "Секция жилого дома, 9 эт.",
      simpleArea: 2160,
      simplePerimeter: 72,
      simpleHeight: 30,
      simpleOpeningsArea: 430,
      simpleOpeningsPerim: 620,
      simpleSillLength: 180,
      outerCorners: 4,
      innerCorners: 0,
      claddingId: "porcelain",
      panelW: 600,
      panelH: 1200,
      panelT: 10,
      wastePercent: 7,
      insulationMm: 150,
      scheme: "interfloor",
    },
  },
];

interface State {
  project: Project;
  saved: SavedProject[];
  // История правок проекта (не персистится)
  past: Project[];
  future: Project[];
  _hk?: string;
  _ht: number;
  patch: (p: Partial<Project>) => void;
  setCladding: (id: CladdingId) => void;
  applyPreset: (id: string) => void;
  newProject: () => void;
  saveCurrent: () => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  result: () => CalcResult;
  presets: typeof PRESETS;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 700;

export const useProject = create<State>()(
  persist(
    (set, get) => {
      // Зафиксировать текущий проект в истории ПЕРЕД изменением. coalesceKey
      // склеивает серию быстрых правок одного поля в один шаг отмены.
      const record = (coalesceKey?: string) => {
        const st = get();
        const now = Date.now();
        if (coalesceKey && coalesceKey === st._hk && now - st._ht < COALESCE_MS) {
          set({ _ht: now });
          return;
        }
        set({ past: [...st.past, st.project].slice(-HISTORY_LIMIT), future: [], _hk: coalesceKey, _ht: now });
      };
      return {
        project: defaultProject(),
        saved: [],
        presets: PRESETS,
        past: [],
        future: [],
        _ht: 0,
        patch: (p) => {
          record(`patch:${Object.keys(p).sort().join(",")}`);
          set({ project: { ...get().project, ...p } });
        },
        setCladding: (id) => {
          record();
          const c = claddingById(id);
          set({
            project: {
              ...get().project,
              claddingId: id,
              panelW: c.defaultW,
              panelH: c.defaultH,
              panelT: c.defaultT,
              wastePercent: c.waste,
              scheme: c.fixing === "rivet" || c.fixing === "hanger" ? "hv" : get().project.scheme === "hv" ? "vertical" : get().project.scheme,
            },
          });
        },
        applyPreset: (id) => {
          const pr = PRESETS.find((x) => x.id === id);
          if (!pr) return;
          record();
          set({ project: { ...get().project, ...pr.patch } });
        },
        newProject: () => {
          record();
          set({
            project: {
              ...defaultProject(),
              id: uid("p"),
              name: "Новый объект",
              simpleArea: 0,
              simplePerimeter: 0,
              simpleHeight: 0,
              simpleOpeningsArea: 0,
              simpleOpeningsPerim: 0,
              simpleSillLength: 0,
            },
          });
        },
        saveCurrent: () => {
          const p = get().project;
          const entry: SavedProject = {
            id: p.id.startsWith("p-") ? p.id : uid("p"),
            name: p.name || "Без названия",
            savedAt: Date.now(),
            project: { ...p, id: p.id.startsWith("p-") ? p.id : uid("p") },
          };
          const rest = get().saved.filter((s) => s.id !== entry.id);
          set({
            saved: [entry, ...rest].slice(0, 20),
            project: { ...p, id: entry.id },
          });
        },
        loadSaved: (id) => {
          const s = get().saved.find((x) => x.id === id);
          if (s) {
            record();
            set({ project: s.project });
          }
        },
        deleteSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
        result: () => calculate(get().project),
        undo: () => {
          const st = get();
          if (!st.past.length) return;
          const prev = st.past[st.past.length - 1];
          set({ project: prev, past: st.past.slice(0, -1), future: [...st.future, st.project], _hk: undefined });
        },
        redo: () => {
          const st = get();
          if (!st.future.length) return;
          const nxt = st.future[st.future.length - 1];
          set({ project: nxt, future: st.future.slice(0, -1), past: [...st.past, st.project], _hk: undefined });
        },
      };
    },
    {
      name: "ventsmeta-v1",
      // историю не сохраняем между сессиями
      partialize: (s) => ({ project: s.project, saved: s.saved }),
    },
  ),
);
