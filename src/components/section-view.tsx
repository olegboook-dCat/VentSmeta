import type { CalcResult, Project } from "@/lib/facade/types";
import { claddingById } from "@/lib/facade/catalog";

export function SectionView({ project, result }: { project: Project; result: CalcResult }) {
  const ins = project.insulationOn ? project.insulationMm : 0;
  const gap = project.ventGap;
  const clad = Math.max(8, project.panelT);
  const wall = 90;
  const br = 14;
  const scale = 0.55;
  const x0 = 36;
  const y0 = 28;
  const h = 260;
  const wallW = wall * scale;
  const insW = Math.max(8, ins * scale);
  const gapW = Math.max(10, gap * scale);
  const cladW = Math.max(8, clad * scale * 1.6);
  const xWall = x0;
  const xIns = xWall + wallW;
  const xGap = xIns + (project.insulationOn ? insW : 0);
  const xGuide = xGap + gapW;
  const xClad = xGuide + 8;
  const totalW = xClad + cladW + 120;
  const cladding = claddingById(project.claddingId);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(420, totalW)} 340`}
        className="h-auto w-full max-w-lg"
        role="img"
        aria-label="Разрез вентфасада"
      >
        <rect x={xWall} y={y0} width={wallW} height={h} fill="#c8c2b4" stroke="#1b1a17" strokeWidth="1" />
        <text x={xWall + wallW / 2} y={y0 + h + 18} textAnchor="middle" className="fill-muted" fontSize="11">
          Стена
        </text>

        {project.insulationOn ? (
          <>
            <rect x={xIns} y={y0} width={insW} height={h} fill="#e8d9a8" stroke="#1b1a17" strokeWidth="1" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1={xIns + 3}
                y1={y0 + 20 + i * 28}
                x2={xIns + insW - 3}
                y2={y0 + 36 + i * 28}
                stroke="#c4a45a"
                strokeWidth="1"
              />
            ))}
            <text x={xIns + insW / 2} y={y0 - 8} textAnchor="middle" className="fill-ink" fontSize="10">
              {ins} мм
            </text>
          </>
        ) : null}

        <rect x={xGap} y={y0} width={gapW} height={h} fill="#eef6f3" stroke="#1b1a17" strokeDasharray="3 3" strokeWidth="1" />
        {Array.from({ length: 5 }).map((_, i) => (
          <path
            key={i}
            d={`M${xGap + gapW / 2} ${y0 + 30 + i * 46} c 6 8 6 16 0 24`}
            fill="none"
            stroke="#3d6b62"
            strokeWidth="1.2"
          />
        ))}
        <text x={xGap + gapW / 2} y={y0 - 8} textAnchor="middle" className="fill-ink" fontSize="10">
          зазор {gap}
        </text>

        <rect x={xGuide} y={y0 + 18} width={br} height={h - 36} fill="#5c6560" stroke="#1b1a17" strokeWidth="1" />
        <rect
          x={xWall + wallW - 6}
          y={y0 + 70}
          width={xGuide - xWall - wallW + 10}
          height={10}
          fill="#7a847e"
          stroke="#1b1a17"
          strokeWidth="1"
        />
        <rect
          x={xWall + wallW - 6}
          y={y0 + 170}
          width={xGuide - xWall - wallW + 10}
          height={8}
          fill="#9aa39d"
          stroke="#1b1a17"
          strokeWidth="1"
        />

        <rect x={xClad} y={y0} width={cladW} height={h} fill={cladding.swatch} stroke="#1b1a17" strokeWidth="1.2" />
        <line x1={xClad} y1={y0 + h / 3} x2={xClad + cladW} y2={y0 + h / 3} stroke="#1b1a17" strokeWidth="0.8" opacity="0.5" />
        <line x1={xClad} y1={y0 + (h * 2) / 3} x2={xClad + cladW} y2={y0 + (h * 2) / 3} stroke="#1b1a17" strokeWidth="0.8" opacity="0.5" />
        <text x={xClad + cladW / 2} y={y0 + h + 18} textAnchor="middle" className="fill-muted" fontSize="11">
          {cladding.name}
        </text>

        <text x={xClad + cladW + 16} y={y0 + 80} className="fill-ink" fontSize="11">
          кронштейн несущий
        </text>
        <text x={xClad + cladW + 16} y={y0 + 178} className="fill-ink" fontSize="11">
          кронштейн опорный
        </text>
        <text x={xIns + (project.insulationOn ? insW / 2 : 0)} y={y0 + h + 18} textAnchor="middle" className="fill-muted" fontSize="11">
          {project.insulationOn ? "утеплитель" : ""}
        </text>
        <text x={20} y={320} className="fill-muted" fontSize="10">
          {result.cityName}: R = {result.rTotal.toFixed(2)} при норме {result.rRequired.toFixed(2)} м²·°C/Вт
        </text>
      </svg>
    </div>
  );
}
