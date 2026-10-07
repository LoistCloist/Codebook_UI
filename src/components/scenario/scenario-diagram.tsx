import { CHOICE_OPTIONS } from "@/config/study";
import { describeScene, type Figure, type FigureType, type Group, type Scene } from "@/lib/scene";

/*
 * Top-down sketch of a scenario: who is ahead, who is to the left, the barrier to the right and
 * the passengers inside the AV. Positions only — no outcome marks — so it doesn't lean on answers.
 * Coordinates are in a 600×300 viewBox split into three 200-wide columns (left, ahead, right).
 */

const W = 600;
const H = 300;
const COL = { swerve_left: 100, maintain: 300, swerve_right: 500 } as const;
const ICON_W = 32;
const ICON_H = 40;
const ICON_GAP = 36;
const ICONS_PER_ROW = 5;
const ICON_TOP = 34;
const LABEL_LINE = 19;

const SHORT: Record<string, [one: string, many: string]> = {
  "adult pedestrian": ["adult", "adults"],
  "child pedestrian": ["child", "children"],
  "elderly pedestrian": ["elderly person", "elderly people"],
  "disabled pedestrian": ["disabled person", "disabled people"],
  "pregnant pedestrian": ["pregnant person", "pregnant people"],
  "road construction worker": ["road worker", "road workers"],
  "teenage cyclist": ["teen cyclist", "teen cyclists"],
  cyclist: ["cyclist", "cyclists"],
  motorcyclist: ["motorcyclist", "motorcyclists"],
};

function figureLabel(f: Figure): string {
  const [one, many] = SHORT[f.label] ?? [f.label, `${f.label}s`];
  return `${f.count} ${f.count === 1 ? one : many}`;
}

/** `idPrefix` keeps the SVG ids unique on the page (the scenario id is fine). */
export function ScenarioDiagram({ scene, idPrefix }: { scene: Scene; idPrefix: string }) {
  const id = `dg-${idPrefix.replace(/[^A-Za-z0-9_-]/g, "")}`;
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const sym = (t: FigureType | "hatch" | "arrow") => `${id}-${t}`;
  const label = (v: keyof typeof COL) => CHOICE_OPTIONS.find((o) => o.value === v)!.label.toUpperCase();

  return (
    <figure className="mb-4 overflow-hidden rounded border border-line bg-asphalt">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="block h-auto w-full"
      >
        <title id={titleId}>Scenario diagram</title>
        <desc id={descId}>{describeScene(scene)}</desc>
        <Defs sym={sym} />

        {/* Column dividers and lane edges */}
        {[W / 3, (2 * W) / 3].map((x) => (
          <line
            key={x}
            x1={x}
            y1={0}
            x2={x}
            y2={H}
            strokeDasharray="10 8"
            strokeWidth={2}
            className="stroke-asphalt-line"
          />
        ))}

        {/* Column headers, matching the answer options */}
        {(Object.keys(COL) as (keyof typeof COL)[]).map((k) => (
          <text
            key={k}
            x={COL[k]}
            y={22}
            textAnchor="middle"
            fontSize={13}
            letterSpacing={1}
            className="fill-on-dark-muted font-mono"
          >
            {label(k)}
          </text>
        ))}

        <GroupView group={scene.ahead} cx={COL.maintain} sym={sym} />
        <GroupView group={scene.left} cx={COL.swerve_left} sym={sym} />

        {/* Right: rigid barrier */}
        <rect
          x={COL.swerve_right - 60}
          y={40}
          width={120}
          height={34}
          rx={3}
          fill={`url(#${sym("hatch")})`}
          strokeWidth={1.5}
          className="stroke-on-dark"
        />
        <text x={COL.swerve_right} y={96} textAnchor="middle" fontSize={16} className="fill-on-dark font-sans">
          Barrier
        </text>

        {/* Trajectories from the AV */}
        <g
          fill="none"
          strokeWidth={2.5}
          strokeDasharray="7 5"
          strokeLinecap="round"
          className="stroke-on-dark-muted"
          markerEnd={`url(#${sym("arrow")})`}
        >
          <path d={`M${COL.maintain} 200 V166`} />
          <path
            d={`M${COL.maintain - 12} 200 C${COL.maintain - 12} 176 ${COL.swerve_left} 190 ${COL.swerve_left} 166`}
          />
          <path
            d={`M${COL.maintain + 12} 200 C${COL.maintain + 12} 176 ${COL.swerve_right} 190 ${COL.swerve_right} 166`}
          />
        </g>

        <Av passengers={scene.passengers} cx={COL.maintain} />
      </svg>
    </figure>
  );
}

function Defs({ sym }: { sym: (t: FigureType | "hatch" | "arrow") => string }) {
  // Figures are drawn in currentColor inside a 32×40 box, centred on x = 16.
  const person = "M16 11 V25 M16 14 L10 22 M16 14 L22 22 M16 25 L12 38 M16 25 L20 38";
  return (
    <defs>
      <marker
        id={sym("arrow")}
        viewBox="0 0 10 10"
        refX={5}
        refY={5}
        markerWidth={5}
        markerHeight={5}
        orient="auto-start-reverse"
      >
        <path d="M0 0 L10 5 L0 10 z" className="fill-on-dark-muted" />
      </marker>
      <pattern id={sym("hatch")} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={12} height={12} className="fill-asphalt-2" />
        <rect width={6} height={12} className="fill-lane" />
      </pattern>

      <symbol id={sym("adult")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={16} cy={6} r={4} fill="currentColor" stroke="none" />
        <path d={person} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </symbol>
      <symbol id={sym("child")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={16} cy={17} r={3.5} fill="currentColor" stroke="none" />
        <path
          d="M16 21 V30 M16 23 L11.5 28 M16 23 L20.5 28 M16 30 L13 38 M16 30 L19 38"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </symbol>
      <symbol id={sym("elderly")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={13} cy={7} r={4} fill="currentColor" stroke="none" />
        <path
          d="M14 12 L16 25 M15 15 L22 20 M23 20 V38 M16 25 L12 38 M16 25 L19 38"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </symbol>
      <symbol id={sym("pregnant")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={16} cy={6} r={4} fill="currentColor" stroke="none" />
        <path
          d={`${person} M16 15 Q24 19 16 24`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </symbol>
      <symbol id={sym("disabled")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={13} cy={5} r={4} fill="currentColor" stroke="none" />
        <path
          d="M13 10 V21 H21 L24 29 M13 14 L20 17"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={13} cy={30} r={8} fill="none" stroke="currentColor" strokeWidth={2.5} />
      </symbol>
      <symbol id={sym("worker")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={16} cy={6} r={4} fill="currentColor" stroke="none" />
        <path
          d="M11 4.5 A5 5 0 0 1 21 4.5 Z M9.5 4.5 H22.5"
          className="fill-lane stroke-lane"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path d={person} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </symbol>
      <symbol id={sym("cyclist")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={18} cy={8} r={3.5} fill="currentColor" stroke="none" />
        <path
          d="M5 32 L13 24 L26 32 M13 24 H22 L26 32 M18 12 L14 22 M17 14 L22 20 M14 22 L17 28"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={6} cy={32} r={6} fill="none" stroke="currentColor" strokeWidth={2} />
        <circle cx={26} cy={32} r={6} fill="none" stroke="currentColor" strokeWidth={2} />
      </symbol>
      <symbol id={sym("motorcyclist")} viewBox="0 0 32 40" overflow="visible">
        <circle cx={15} cy={9} r={4.5} fill="currentColor" stroke="none" />
        <path
          d="M6 32 L11 23 H23 L26 32 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path
          d="M15 14 L14 23 M15 16 L23 21"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={6} cy={32} r={6} className="fill-asphalt" stroke="currentColor" strokeWidth={3} />
        <circle cx={26} cy={32} r={6} className="fill-asphalt" stroke="currentColor" strokeWidth={3} />
      </symbol>
      <symbol id={sym("person")} viewBox="0 0 32 40" overflow="visible">
        <use href={`#${sym("adult")}`} />
      </symbol>
    </defs>
  );
}

function GroupView({ group, cx, sym }: { group: Group; cx: number; sym: (t: FigureType) => string }) {
  if (group.kind === "vehicle") {
    const n = group.occupants;
    const text =
      group.vehicle === "car"
        ? `Car · ${n} ${n === 1 ? "occupant" : "occupants"}`
        : `Motorcycle · ${n} ${n === 1 ? "rider" : "riders"}`;
    return (
      <g className="text-on-dark">
        {group.vehicle === "car" ? <Car cx={cx} occupants={n} /> : <Motorcycle cx={cx} riders={n} />}
        <text x={cx} y={98} textAnchor="middle" fontSize={16} className="fill-on-dark font-sans">
          {text}
        </text>
      </g>
    );
  }

  const icons = group.figures.flatMap((f) => Array.from({ length: f.count }, () => f.type));
  const rows = Math.max(1, Math.ceil(icons.length / ICONS_PER_ROW));
  const labelTop = ICON_TOP + rows * (ICON_H + 4) + 20;
  return (
    <g className="text-on-dark">
      {icons.map((t, i) => {
        const row = Math.floor(i / ICONS_PER_ROW);
        const inRow = Math.min(ICONS_PER_ROW, icons.length - row * ICONS_PER_ROW);
        const col = i % ICONS_PER_ROW;
        const x = cx + (col - (inRow - 1) / 2) * ICON_GAP - ICON_W / 2;
        return (
          <use key={i} href={`#${sym(t)}`} x={x} y={ICON_TOP + row * (ICON_H + 4)} width={ICON_W} height={ICON_H} />
        );
      })}
      {group.figures.map((f, i) => (
        <text
          key={i}
          x={cx}
          y={labelTop + i * LABEL_LINE}
          textAnchor="middle"
          fontSize={16}
          className="fill-on-dark font-sans"
        >
          {figureLabel(f)}
        </text>
      ))}
    </g>
  );
}

/** Side-view car with one dot per occupant in the windows. */
function Car({ cx, occupants }: { cx: number; occupants: number }) {
  const shown = Math.min(occupants, 5);
  return (
    <g transform={`translate(${cx - 44} 34)`}>
      <path
        d="M16 16 L26 3 H62 L72 16 Z"
        className="fill-asphalt-2"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <rect x={2} y={16} width={84} height={20} rx={6} fill="currentColor" />
      <circle cx={22} cy={37} r={7} className="fill-asphalt" stroke="currentColor" strokeWidth={3} />
      <circle cx={66} cy={37} r={7} className="fill-asphalt" stroke="currentColor" strokeWidth={3} />
      {Array.from({ length: shown }, (_, i) => (
        <circle key={i} cx={44 + (i - (shown - 1) / 2) * 9} cy={10} r={3} className="fill-lane" />
      ))}
    </g>
  );
}

/** Side-view motorcycle with one figure per rider. */
function Motorcycle({ cx, riders }: { cx: number; riders: number }) {
  const shown = Math.min(riders, 3);
  return (
    <g transform={`translate(${cx - 36} 32)`}>
      {Array.from({ length: shown }, (_, i) => {
        const x = 26 + i * 12;
        return (
          <g key={i}>
            <circle cx={x} cy={7} r={4.5} fill="currentColor" />
            <path
              d={`M${x} 12 L${x - 1} 24 M${x} 15 L${x + 9} 21`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <path
        d="M12 36 L20 24 H54 L60 36 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={36} r={7} className="fill-asphalt" stroke="currentColor" strokeWidth={3} />
      <circle cx={60} cy={36} r={7} className="fill-asphalt" stroke="currentColor" strokeWidth={3} />
    </g>
  );
}

/** Top-down AV with one dot per passenger. */
function Av({ passengers, cx }: { passengers: number; cx: number }) {
  const x = cx - 30;
  const y = 206;
  const dots = passengers <= 6;
  return (
    <g>
      <rect x={x} y={y} width={60} height={80} rx={12} className="fill-lane" />
      <rect x={x + 7} y={y + 8} width={46} height={11} rx={4} className="fill-asphalt-2" />
      {dots ? (
        Array.from({ length: passengers }, (_, i) => (
          <circle
            key={i}
            cx={cx + (i % 2 === 0 ? -12 : 12)}
            cy={y + 32 + Math.floor(i / 2) * 15}
            r={5}
            className="fill-lane-ink"
          />
        ))
      ) : (
        <text x={cx} y={y + 52} textAnchor="middle" fontSize={18} fontWeight={600} className="fill-lane-ink font-sans">
          {passengers}
        </text>
      )}
      <text x={cx + 42} y={y + 42} fontSize={16} fontWeight={600} className="fill-lane font-sans">
        AV
      </text>
      <text x={cx + 42} y={y + 60} fontSize={16} className="fill-on-dark font-sans">
        {passengers} {passengers === 1 ? "passenger" : "passengers"}
      </text>
    </g>
  );
}
