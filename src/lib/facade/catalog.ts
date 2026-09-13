import type {
  CladdingId,
  Fixing,
  InsulationKind,
  Scheme,
  SubsystemMaterial,
} from "./types";

export interface Cladding {
  id: CladdingId;
  name: string;
  blurb: string;
  fixing: Fixing;
  kgM2: number;
  defaultW: number;
  defaultH: number;
  defaultT: number;
  sizes: [number, number][];
  waste: number;
  priceM2: number;
  laborM2: number;
  swatch: string;
}

export interface City {
  id: string;
  name: string;
  gsop: number;
  rReq: number;
  wind: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  w0: number;
}

export interface WallType {
  id: string;
  name: string;
  rBase: number;
}

export const CLADDINGS: Cladding[] = [
  {
    id: "porcelain",
    name: "Керамогранит",
    blurb: "Плиты 600×600 и 1200×600, крепление кляммерами. Самый частый вариант для жилых и офисных зданий.",
    fixing: "klyammer",
    kgM2: 24,
    defaultW: 600,
    defaultH: 600,
    defaultT: 10,
    sizes: [
      [600, 600],
      [600, 1200],
      [800, 800],
      [1200, 600],
    ],
    waste: 8,
    priceM2: 1520,
    laborM2: 1480,
    swatch: "#8b9096",
  },
  {
    id: "acp",
    name: "Композит АКП",
    blurb: "Алюминиевые композитные панели. Лёгкие, режутся в кассеты, крепление на заклёпках и салазках.",
    fixing: "rivet",
    kgM2: 8.5,
    defaultW: 1000,
    defaultH: 1200,
    defaultT: 4,
    sizes: [
      [1000, 1200],
      [1250, 1500],
      [1500, 1500],
    ],
    waste: 12,
    priceM2: 2380,
    laborM2: 1680,
    swatch: "#c5ccd3",
  },
  {
    id: "fiber",
    name: "Фиброцемент",
    blurb: "Фиброцементные плиты 8–12 мм. Устойчивы к влаге, крепятся кляммерами или заклёпками.",
    fixing: "klyammer",
    kgM2: 16,
    defaultW: 1200,
    defaultH: 1500,
    defaultT: 8,
    sizes: [
      [1200, 1500],
      [1200, 2500],
      [1190, 3050],
    ],
    waste: 9,
    priceM2: 1680,
    laborM2: 1390,
    swatch: "#d4c4a8",
  },
  {
    id: "stone",
    name: "Натуральный камень",
    blurb: "Гранит, известняк, травертин. Тяжёлая облицовка — нужна усиленная подсистема.",
    fixing: "klyammer",
    kgM2: 56,
    defaultW: 600,
    defaultH: 300,
    defaultT: 20,
    sizes: [
      [600, 300],
      [600, 400],
      [800, 400],
    ],
    waste: 10,
    priceM2: 6800,
    laborM2: 2850,
    swatch: "#6e675c",
  },
  {
    id: "cassette",
    name: "Металлокассеты",
    blurb: "Гнутые кассеты из оцинкованной стали с полимерным покрытием. Навес на икли.",
    fixing: "hanger",
    kgM2: 12,
    defaultW: 600,
    defaultH: 600,
    defaultT: 1.2,
    sizes: [
      [600, 600],
      [800, 800],
      [1000, 500],
    ],
    waste: 8,
    priceM2: 2740,
    laborM2: 1920,
    swatch: "#4a5560",
  },
  {
    id: "hpl",
    name: "HPL-панели",
    blurb: "Компакт-ламинат 6–10 мм. Декор под дерево или камень, скрытое или заклёпочное крепление.",
    fixing: "rivet",
    kgM2: 14,
    defaultW: 1300,
    defaultH: 2800,
    defaultT: 8,
    sizes: [
      [1300, 2800],
      [1300, 3050],
      [1850, 4100],
    ],
    waste: 11,
    priceM2: 4350,
    laborM2: 1780,
    swatch: "#8a5a3c",
  },
  {
    id: "profile",
    name: "Профлист",
    blurb: "Профилированный лист для складов и промышленных зданий. Самый бюджетный вентфасад.",
    fixing: "screw",
    kgM2: 6.5,
    defaultW: 1000,
    defaultH: 2000,
    defaultT: 0.5,
    sizes: [
      [1000, 2000],
      [1000, 3000],
      [1000, 6000],
    ],
    waste: 7,
    priceM2: 780,
    laborM2: 720,
    swatch: "#5d6b75",
  },
];

export const CITIES: City[] = [
  { id: "msk", name: "Москва", gsop: 4943, rReq: 3.13, wind: 1, w0: 0.23 },
  { id: "spb", name: "Санкт-Петербург", gsop: 4796, rReq: 3.06, wind: 2, w0: 0.3 },
  { id: "kzn", name: "Казань", gsop: 5480, rReq: 3.3, wind: 2, w0: 0.3 },
  { id: "nsb", name: "Новосибирск", gsop: 6601, rReq: 3.71, wind: 3, w0: 0.38 },
  { id: "ekb", name: "Екатеринбург", gsop: 6125, rReq: 3.54, wind: 2, w0: 0.3 },
  { id: "krd", name: "Краснодар", gsop: 2688, rReq: 2.4, wind: 3, w0: 0.38 },
  { id: "soc", name: "Сочи", gsop: 1488, rReq: 1.79, wind: 4, w0: 0.48 },
  { id: "vlv", name: "Владивосток", gsop: 4550, rReq: 2.98, wind: 5, w0: 0.6 },
  { id: "klg", name: "Калининград", gsop: 3631, rReq: 2.68, wind: 3, w0: 0.38 },
  { id: "nnv", name: "Нижний Новгород", gsop: 5300, rReq: 3.25, wind: 1, w0: 0.23 },
  { id: "sam", name: "Самара", gsop: 5110, rReq: 3.18, wind: 3, w0: 0.38 },
  { id: "rst", name: "Ростов-на-Дону", gsop: 3522, rReq: 2.63, wind: 3, w0: 0.38 },
  { id: "ufa", name: "Уфа", gsop: 5640, rReq: 3.36, wind: 2, w0: 0.3 },
  { id: "krs", name: "Красноярск", gsop: 6730, rReq: 3.76, wind: 3, w0: 0.38 },
  { id: "tym", name: "Тюмень", gsop: 6210, rReq: 3.57, wind: 2, w0: 0.3 },
  { id: "irk", name: "Иркутск", gsop: 6980, rReq: 3.85, wind: 3, w0: 0.38 },
  { id: "khb", name: "Хабаровск", gsop: 6150, rReq: 3.55, wind: 3, w0: 0.38 },
  { id: "vrn", name: "Воронеж", gsop: 4630, rReq: 3.02, wind: 2, w0: 0.3 },
  { id: "prm", name: "Пермь", gsop: 5990, rReq: 3.49, wind: 2, w0: 0.3 },
  { id: "chel", name: "Челябинск", gsop: 5980, rReq: 3.49, wind: 2, w0: 0.3 },
];

export const WALL_TYPES: WallType[] = [
  { id: "brick510", name: "Кирпич 510 мм", rBase: 0.73 },
  { id: "brick380", name: "Кирпич 380 мм", rBase: 0.54 },
  { id: "concrete200", name: "Железобетон 200 мм", rBase: 0.12 },
  { id: "aerated300", name: "Газобетон 300 мм", rBase: 1.67 },
  { id: "aerated400", name: "Газобетон 400 мм", rBase: 2.22 },
  { id: "wood200", name: "Брус / бревно 200 мм", rBase: 1.3 },
  { id: "frame", name: "Каркас / существующий фасад", rBase: 1.0 },
  { id: "ignore", name: "Не учитывать основание", rBase: 0 },
];

export const MATERIALS: { id: SubsystemMaterial; name: string; hint: string; kPrice: number; kWeight: number }[] = [
  {
    id: "galvanized",
    name: "Оцинкованная сталь",
    hint: "Самый распространённый вариант. Хорошее соотношение цены и несущей способности.",
    kPrice: 1,
    kWeight: 1,
  },
  {
    id: "aluminum",
    name: "Алюминий",
    hint: "Легче стали, не ржавеет, удобнее на высотных зданиях. Дороже оцинковки.",
    kPrice: 2.05,
    kWeight: 0.42,
  },
  {
    id: "stainless",
    name: "Нержавеющая сталь",
    hint: "Для агрессивной среды, мокрых зон и премиальных объектов. Максимальный срок службы.",
    kPrice: 3.6,
    kWeight: 1,
  },
];

export const SCHEMES: { id: Scheme; name: string; hint: string }[] = [
  {
    id: "vertical",
    name: "Вертикальная",
    hint: "Направляющие стоят вертикально. Классика для керамогранита и фиброцемента.",
  },
  {
    id: "hv",
    name: "Горизонтально-вертикальная",
    hint: "Добавляется горизонтальный ригель. Нужна для кассет, АКП и крупного формата.",
  },
  {
    id: "interfloor",
    name: "Межэтажная",
    hint: "Крепление в плиты перекрытий. Для слабых стен и высотных зданий.",
  },
];

export const INSULATIONS: { id: InsulationKind; name: string; lambda: number; pricePerMm: number; density: number }[] =
  [
    { id: "mineral", name: "Минеральная вата (фасадная)", lambda: 0.037, pricePerMm: 4.9, density: 90 },
    { id: "stonewool", name: "Каменная вата повышенной плотности", lambda: 0.04, pricePerMm: 5.8, density: 110 },
    { id: "pir", name: "PIR / пенополиизоцианурат", lambda: 0.022, pricePerMm: 12.4, density: 40 },
  ];

export const BASE_PRICES = {
  guideMp: 148,
  horizMp: 162,
  bracketBearing: 94,
  bracketSupport: 61,
  pad: 14,
  extension: 74,
  clampRegular: 31,
  clampStart: 36,
  hanger: 48,
  slide: 42,
  rivet48: 4.4,
  rivet32: 2.9,
  rivetPainted: 6.8,
  screw: 3.6,
  anchor: 24,
  discDowel: 12,
  membraneM2: 98,
  parapetMp: 520,
  slopeMp: 340,
  sillMp: 470,
  cornerMp: 390,
  laborDesign: 195,
  laborSubsystem: 1280,
  laborInsulation: 490,
  laborMembrane: 95,
  laborOpenings: 940,
  laborParapet: 810,
  laborScaffold: 390,
};

export const GROUP_LABEL: Record<string, string> = {
  cladding: "Облицовка",
  subsystem: "Подсистема",
  insulation: "Утепление и мембрана",
  fasteners: "Крепёж",
  flashings: "Обрамления и доборы",
  labor: "Работы",
};

export function claddingById(id: CladdingId): Cladding {
  return CLADDINGS.find((c) => c.id === id) ?? CLADDINGS[0];
}

export function cityById(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export function wallTypeById(id: string): WallType {
  return WALL_TYPES.find((w) => w.id === id) ?? WALL_TYPES[0];
}

export function insulationById(id: InsulationKind) {
  return INSULATIONS.find((i) => i.id === id) ?? INSULATIONS[0];
}
