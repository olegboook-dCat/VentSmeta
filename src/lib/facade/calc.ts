import {
  BASE_PRICES,
  claddingById,
  cityById,
  insulationById,
  MATERIALS,
  wallTypeById,
} from "./catalog";
import type { CalcResult, Project, SpecGroup, SpecRow } from "./types";

function heightK(h: number): number {
  if (h <= 5) return 0.5;
  if (h <= 10) return 0.65;
  if (h <= 20) return 0.85;
  if (h <= 40) return 1.1;
  return 1.25;
}

export function recommendSteps(claddingKg: number, height: number, w0: number) {
  const wind = w0 * heightK(height) * 1.4;
  let guide = 600;
  let bracket = 1000;
  if (claddingKg >= 40) {
    guide = 400;
    bracket = 700;
  } else if (claddingKg >= 20) {
    guide = 600;
    bracket = 850;
  } else if (claddingKg >= 10) {
    guide = 600;
    bracket = 1000;
  } else {
    guide = 800;
    bracket = 1200;
  }
  if (wind > 0.7) {
    bracket = Math.max(600, bracket - 150);
    guide = Math.max(400, guide - 100);
  }
  if (height > 30) bracket = Math.max(600, bracket - 100);
  return { guide, bracket, wind };
}

function priceOf(project: Project, key: string, fallback: number): number {
  const o = project.priceOverrides[key];
  return typeof o === "number" && o >= 0 ? o : fallback;
}

function addRow(
  rows: SpecRow[],
  id: string,
  group: SpecGroup,
  name: string,
  unit: string,
  qtyRaw: number,
  reserve: number,
  price: number,
  netArea: number,
  unitWeight: number,
) {
  const qty = Math.max(0, qtyRaw);
  if (qty < 0.001 && price === 0) return;
  const qtyReserve = qty * (1 + reserve);
  const sum = qtyReserve * price;
  rows.push({
    id,
    group,
    name,
    unit,
    qty,
    qtyReserve,
    perM2: netArea > 0 ? qtyReserve / netArea : 0,
    price,
    sum,
    weight: qtyReserve * unitWeight,
  });
}

export function calculate(project: Project): CalcResult {
  const cladding = claddingById(project.claddingId);
  const city = cityById(project.cityId);
  const wall = wallTypeById(project.wallTypeId);
  const insul = insulationById(project.insulationKind);
  const mat = MATERIALS.find((m) => m.id === project.material) ?? MATERIALS[0];
  const kP = mat.kPrice;
  const kW = mat.kWeight;

  let grossArea = 0;
  let openingArea = 0;
  let openingPerim = 0;
  let buildingPerim = 0;
  let height = 0;
  let sillLength = 0;
  let outerCorners = project.outerCorners;
  let innerCorners = project.innerCorners;

  if (project.inputMode === "walls") {
    grossArea = project.walls.reduce((s, w) => s + Math.max(0, w.width) * Math.max(0, w.height), 0);
    buildingPerim = project.walls.reduce((s, w) => s + Math.max(0, w.width), 0);
    height = buildingPerim > 0 ? grossArea / buildingPerim : 0;
    openingArea = project.openings.reduce(
      (s, o) => s + Math.max(0, o.width) * Math.max(0, o.height) * Math.max(0, o.count),
      0,
    );
    openingPerim = project.openings.reduce(
      (s, o) => s + 2 * (Math.max(0, o.width) + Math.max(0, o.height)) * Math.max(0, o.count),
      0,
    );
    sillLength = project.openings
      .filter((o) => o.kind === "window")
      .reduce((s, o) => s + Math.max(0, o.width) * Math.max(0, o.count), 0);
  } else {
    grossArea = Math.max(0, project.simpleArea);
    buildingPerim = Math.max(0, project.simplePerimeter);
    height = Math.max(0, project.simpleHeight) || (buildingPerim > 0 ? grossArea / buildingPerim : 0);
    openingArea = Math.max(0, project.simpleOpeningsArea);
    openingPerim = Math.max(0, project.simpleOpeningsPerim);
    sillLength = Math.max(0, project.simpleSillLength);
  }

  const netArea = Math.max(0, grossArea - openingArea);
  const rec = recommendSteps(cladding.kgM2, height, city.w0);
  const guideStepMm = project.autoSteps ? rec.guide : project.guideStep;
  const bracketStepMm = project.autoSteps ? rec.bracket : project.bracketStep;
  const guideStep = Math.max(0.3, guideStepMm / 1000);
  const bracketStep = Math.max(0.4, bracketStepMm / 1000);

  const waste = Math.max(0, project.wastePercent) / 100;
  const panelWm = Math.max(0.2, project.panelW / 1000);
  const panelHm = Math.max(0.2, project.panelH / 1000);
  const panelArea = panelWm * panelHm;

  const kgM2 = cladding.kgM2 * (project.panelT / Math.max(1, cladding.defaultT));

  const rIns = project.insulationOn ? project.insulationMm / 1000 / insul.lambda : 0;
  const rGap = 0.13;
  const rClad = 0.04;
  const rTotal = wall.rBase + rIns + rGap + rClad;

  const rows: SpecRow[] = [];
  const p = (key: string, fallback: number) => priceOf(project, key, fallback);

  const nPanels = panelArea > 0 ? Math.ceil((netArea / panelArea) * (1 + waste)) : 0;
  const buyArea = nPanels * panelArea;
  addRow(
    rows,
    "clad",
    "cladding",
    `${cladding.name} ${project.panelW}×${project.panelH}×${project.panelT} мм`,
    "м²",
    buyArea,
    0,
    p("clad", cladding.priceM2),
    netArea,
    kgM2,
  );

  let Lvert = netArea / guideStep;
  Lvert += openingPerim * 0.28;
  Lvert += outerCorners * height * 0.2;
  Lvert += innerCorners * height * 0.1;
  if (project.scheme === "interfloor") Lvert *= 0.72;

  let Lhoriz = 0;
  if (project.scheme === "hv") {
    const hStep = Math.min(1.2, Math.max(0.6, panelHm));
    Lhoriz = netArea / hStep + openingPerim * 0.22;
  } else if (project.scheme === "interfloor") {
    const floorH = 3;
    Lhoriz = (height > 0 ? height / floorH : 2) * buildingPerim * 1.08;
  }

  const nGuides = Math.ceil((Lvert * 1.05) / 3);
  const nHoriz = Math.ceil((Lhoriz * 1.05) / 3);

  addRow(
    rows,
    "guide",
    "subsystem",
    `Направляющая вертикальная, 3 м (${mat.name.toLowerCase()})`,
    "шт",
    nGuides,
    0.02,
    p("guide", BASE_PRICES.guideMp * 3 * kP),
    netArea,
    3.2 * kW,
  );
  if (nHoriz > 0) {
    addRow(
      rows,
      "horiz",
      "subsystem",
      `Профиль горизонтальный / ригель, 3 м`,
      "шт",
      nHoriz,
      0.03,
      p("horiz", BASE_PRICES.horizMp * 3 * kP),
      netArea,
      2.8 * kW,
    );
  }

  const nPerGuide = height > 0 ? Math.max(2, Math.round(height / bracketStep) + 1) : 3;
  const nBr = nGuides * nPerGuide;
  const nBearing = Math.ceil(nBr * 0.38);
  const nSupport = Math.max(0, nBr - nBearing);
  const needExt = project.insulationOn && project.insulationMm >= 80;

  addRow(
    rows,
    "br-b",
    "subsystem",
    "Кронштейн несущий",
    "шт",
    nBearing,
    0.05,
    p("br-b", BASE_PRICES.bracketBearing * kP),
    netArea,
    0.42 * kW,
  );
  addRow(
    rows,
    "br-s",
    "subsystem",
    "Кронштейн опорный",
    "шт",
    nSupport,
    0.05,
    p("br-s", BASE_PRICES.bracketSupport * kP),
    netArea,
    0.28 * kW,
  );
  addRow(rows, "pad", "subsystem", "Терморазрывная прокладка", "шт", nBr, 0.05, p("pad", BASE_PRICES.pad), netArea, 0.02);
  if (needExt) {
    addRow(
      rows,
      "ext",
      "subsystem",
      "Удлинитель кронштейна",
      "шт",
      nBr,
      0.05,
      p("ext", BASE_PRICES.extension * kP),
      netArea,
      0.22 * kW,
    );
  }

  if (cladding.fixing === "klyammer") {
    const grid = (1 / guideStep) * (1 / panelHm) * netArea * 1.1;
    const nStart = height > 0 ? Math.ceil((netArea / height / guideStep) * 1.15) : Math.ceil(grid * 0.18);
    const nReg = Math.max(0, Math.ceil(grid - nStart));
    addRow(
      rows,
      "cl-s",
      "subsystem",
      "Кляммер стартовый / завершающий",
      "шт",
      nStart,
      0.08,
      p("cl-s", BASE_PRICES.clampStart),
      netArea,
      0.04,
    );
    addRow(
      rows,
      "cl-r",
      "subsystem",
      "Кляммер рядовой",
      "шт",
      nReg,
      0.08,
      p("cl-r", BASE_PRICES.clampRegular),
      netArea,
      0.035,
    );
    addRow(
      rows,
      "rv32",
      "fasteners",
      "Заклёпка 3,2×8 для кляммеров",
      "шт",
      nStart + nReg,
      0.1,
      p("rv32", BASE_PRICES.rivet32),
      netArea,
      0.002,
    );
  } else if (cladding.fixing === "hanger") {
    const nHang = Math.ceil(netArea * 3.4);
    addRow(rows, "hang", "subsystem", "Икля / крюк кассеты", "шт", nHang, 0.08, p("hang", BASE_PRICES.hanger), netArea, 0.05);
    addRow(
      rows,
      "start-rail",
      "subsystem",
      "Стартовая рейка",
      "м.п.",
      height > 0 ? netArea / height : 0,
      0.06,
      p("start-rail", 210 * kP),
      netArea,
      0.9 * kW,
    );
  } else if (cladding.fixing === "rivet") {
    const nSlide = Math.ceil(netArea * 2.2);
    addRow(rows, "slide", "subsystem", "Салазка / икля для панели", "шт", nSlide, 0.08, p("slide", BASE_PRICES.slide), netArea, 0.04);
    addRow(
      rows,
      "rv-p",
      "fasteners",
      "Заклёпка окрашенная 4,0×10",
      "шт",
      Math.ceil(netArea * 9),
      0.1,
      p("rv-p", BASE_PRICES.rivetPainted),
      netArea,
      0.003,
    );
  } else {
    addRow(
      rows,
      "hat",
      "subsystem",
      "Профиль шляпный",
      "м.п.",
      netArea / 0.8,
      0.05,
      p("hat", 95 * kP),
      netArea,
      0.85 * kW,
    );
    addRow(
      rows,
      "scr",
      "fasteners",
      "Саморез 4,8×28 с EPDM",
      "шт",
      Math.ceil(netArea * 9),
      0.1,
      p("scr", BASE_PRICES.screw),
      netArea,
      0.006,
    );
  }

  addRow(
    rows,
    "anc",
    "fasteners",
    "Анкер фасадный 10×100",
    "шт",
    nBr,
    0.08,
    p("anc", BASE_PRICES.anchor),
    netArea,
    0.05,
  );
  addRow(
    rows,
    "rv48",
    "fasteners",
    "Заклёпка 4,8×12 кронштейн–направляющая",
    "шт",
    nBr * (needExt ? 4 : 2),
    0.1,
    p("rv48", BASE_PRICES.rivet48),
    netArea,
    0.004,
  );

  if (project.insulationOn) {
    const insArea = netArea * 1.05;
    const priceM2 = insul.pricePerMm * project.insulationMm;
    addRow(
      rows,
      "ins",
      "insulation",
      `${insul.name}, ${project.insulationMm} мм`,
      "м²",
      insArea,
      0,
      p("ins", priceM2),
      netArea,
      (insul.density * project.insulationMm) / 1000,
    );
    const dowelLen = Math.min(300, 50 + project.insulationMm + 20);
    const perM2 = project.insulationMm >= 150 ? 8 : 6;
    addRow(
      rows,
      "dowel",
      "fasteners",
      `Дюбель тарельчатый 10×${dowelLen}`,
      "шт",
      netArea * perM2,
      0.1,
      p("dowel", BASE_PRICES.discDowel),
      netArea,
      0.018,
    );
  }
  if (project.membraneOn && project.insulationOn) {
    addRow(
      rows,
      "mem",
      "insulation",
      "Гидроветрозащитная мембрана",
      "м²",
      netArea * 1.12,
      0,
      p("mem", BASE_PRICES.membraneM2),
      netArea,
      0.12,
    );
  }

  if (openingPerim > 0) {
    addRow(
      rows,
      "slope",
      "flashings",
      "Откосная планка (обрамление проёмов)",
      "м.п.",
      openingPerim,
      0.08,
      p("slope", BASE_PRICES.slopeMp),
      netArea,
      0.7,
    );
  }
  if (sillLength > 0) {
    addRow(
      rows,
      "sill",
      "flashings",
      "Отлив оконный",
      "м.п.",
      sillLength,
      0.08,
      p("sill", BASE_PRICES.sillMp),
      netArea,
      0.85,
    );
  }
  const cornerLen = (outerCorners + innerCorners) * height;
  if (cornerLen > 0) {
    addRow(
      rows,
      "corn",
      "flashings",
      "Угловой элемент наружный / внутренний",
      "м.п.",
      cornerLen,
      0.07,
      p("corn", BASE_PRICES.cornerMp),
      netArea,
      0.9,
    );
  }
  if (project.includeParapet && buildingPerim > 0) {
    addRow(
      rows,
      "par",
      "flashings",
      "Парапетная крышка",
      "м.п.",
      buildingPerim,
      0.08,
      p("par", BASE_PRICES.parapetMp),
      netArea,
      1.4,
    );
  }

  if (project.includeLabor) {
    if (project.includeDesign) {
      addRow(rows, "des", "labor", "Проектные работы (КМ / КМД ориентир)", "м²", netArea, 0, p("des", BASE_PRICES.laborDesign), netArea, 0);
    }
    addRow(
      rows,
      "lab-sub",
      "labor",
      "Монтаж подсистемы",
      "м²",
      netArea,
      0,
      p("lab-sub", BASE_PRICES.laborSubsystem),
      netArea,
      0,
    );
    if (project.insulationOn) {
      addRow(
        rows,
        "lab-ins",
        "labor",
        "Монтаж утеплителя",
        "м²",
        netArea,
        0,
        p("lab-ins", BASE_PRICES.laborInsulation),
        netArea,
        0,
      );
      if (project.membraneOn) {
        addRow(
          rows,
          "lab-mem",
          "labor",
          "Монтаж мембраны",
          "м²",
          netArea,
          0,
          p("lab-mem", BASE_PRICES.laborMembrane),
          netArea,
          0,
        );
      }
    }
    addRow(
      rows,
      "lab-clad",
      "labor",
      `Монтаж облицовки (${cladding.name.toLowerCase()})`,
      "м²",
      netArea,
      0,
      p("lab-clad", cladding.laborM2),
      netArea,
      0,
    );
    if (openingPerim > 0) {
      addRow(
        rows,
        "lab-op",
        "labor",
        "Обрамление окон и дверей",
        "м.п.",
        openingPerim,
        0,
        p("lab-op", BASE_PRICES.laborOpenings),
        netArea,
        0,
      );
    }
    if (project.includeParapet && buildingPerim > 0) {
      addRow(
        rows,
        "lab-par",
        "labor",
        "Монтаж парапетных крышек",
        "м.п.",
        buildingPerim,
        0,
        p("lab-par", BASE_PRICES.laborParapet),
        netArea,
        0,
      );
    }
    if (project.includeScaffold) {
      addRow(
        rows,
        "lab-scf",
        "labor",
        "Леса / люльки (ориентир)",
        "м²",
        grossArea,
        0,
        p("lab-scf", BASE_PRICES.laborScaffold),
        netArea,
        0,
      );
    }
  }

  const materialsSum = rows.filter((r) => r.group !== "labor").reduce((s, r) => s + r.sum, 0);
  const laborSum = rows.filter((r) => r.group === "labor").reduce((s, r) => s + r.sum, 0);
  const subtotal = materialsSum + laborSum;
  const vatSum = project.vatOn ? subtotal * (project.vatPercent / 100) : 0;
  const total = subtotal + vatSum;
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  const insVol = project.insulationOn ? (netArea * 1.05 * project.insulationMm) / 1000 : 0;
  const metalVol = totalWeight / 7800;
  const totalVolume = insVol + metalVol * 8 + buyArea * 0.02;

  return {
    grossArea,
    openingArea,
    netArea,
    openingPerim,
    buildingPerim,
    height,
    sillLength,
    outerCorners,
    innerCorners,
    claddingKgM2: kgM2,
    recommendedGuideStep: rec.guide,
    recommendedBracketStep: rec.bracket,
    rBase: wall.rBase,
    rIns,
    rTotal,
    rRequired: city.rReq,
    rOk: rTotal + 0.001 >= city.rReq,
    lambda: insul.lambda,
    windW0: city.w0,
    windPressure: rec.wind,
    cityName: city.name,
    rows,
    materialsSum,
    laborSum,
    subtotal,
    vatSum,
    total,
    perM2: netArea > 0 ? total / netArea : 0,
    totalWeight,
    totalVolume,
  };
}
