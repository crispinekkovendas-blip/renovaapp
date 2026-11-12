import { todayISO } from "@/lib/format";
import { marsArtOf } from "@/lib/mars-art";
import type { MarsArt } from "@/lib/mars-art";

/**
 * O desenho do tema Marte, atrás do paciente da vez (Início) e no alto do
 * painel do login. Só aparece nesse tema (`mars:block`). São três, um por dia
 * (`marsArtOf`), e nenhum é retrato do planeta: sugerem Marte por um mapa de
 * relevo, por um cartaz em formas chapadas e pelas dunas ao pôr do sol.
 *
 * - `hero`: no celular é uma faixa no alto do bloco (o texto fica embaixo, no
 *   preto); do `sm` em diante cobre o bloco inteiro e o texto fica à esquerda,
 *   onde o desenho escurece.
 * - `band`: sempre uma faixa no alto; a altura vem de `className`.
 *
 * O bloco que o contém precisa ser `relative`, com o conteúdo num filho
 * também `relative`.
 */
export function MarsArtwork({
  layout = "hero",
  art,
  className = "",
}: {
  layout?: "hero" | "band";
  /** Fixa um desenho; sem isto, vale o do dia. */
  art?: MarsArt;
  className?: string;
}) {
  const Art = ARTS[art ?? marsArtOf(todayISO())];
  const hero = layout === "hero";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 hidden overflow-hidden mars:block ${hero ? "h-56 sm:inset-0 sm:h-full" : ""} ${className}`}
    >
      <svg viewBox="0 0 1200 480" preserveAspectRatio="xMaxYMax slice" className="h-full w-full">
        <Art labels={hero} />
      </svg>
      {/* A faixa termina sumindo no preto, onde o texto começa. */}
      <div className={`absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,#000,transparent)] ${hero ? "sm:hidden" : ""}`} />
    </div>
  );
}

interface ArtProps {
  /** Legendas pequenas do desenho: só onde ele aparece grande. */
  labels: boolean;
}

const INK = "#f0f0fa";
const LABEL = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

/** Pontos em posições fixas (gerador congruente): o céu é sempre o mesmo. */
function stars(seed: number, count: number, height: number) {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: count }, () => ({
    x: Math.round(next() * 1200),
    y: Math.round(next() * height),
    r: 0.5 + Math.round(next() * 7) / 10,
    o: 0.2 + Math.round(next() * 45) / 100,
  }));
}

/** O véu que escurece a esquerda, onde o texto fica do `sm` em diante. */
function LeftVeil({ id, stops }: { id: string; stops: readonly [number, number][] }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {stops.map(([offset, opacity]) => (
            <stop key={offset} offset={offset} stopColor="#000" stopOpacity={opacity} />
          ))}
        </linearGradient>
      </defs>
      <rect width="1200" height="480" fill={`url(#${id})`} />
    </>
  );
}

/* ---------- Relevo: as curvas de nível do Olympus Mons ---------- */

const PEAK = { x: 930, y: 236 };

/** Uma curva de nível: o mesmo contorno irregular, cada vez mais largo, achatado pela perspectiva. */
function contour(k: number): string {
  const radius = 10 + k * 21 + k * k * 0.55;
  const points: string[] = [];
  for (let angle = 0; angle < 360; angle += 3) {
    const t = (angle * Math.PI) / 180;
    const shape =
      1 +
      0.11 * Math.sin(2 * t + 0.6) +
      0.07 * Math.sin(3 * t + 2.1) +
      0.035 * Math.sin(5 * t + 4.0) +
      0.02 * Math.sin(7 * t + k * 0.5);
    points.push(`${(PEAK.x + radius * shape * Math.cos(t)).toFixed(1)},${(PEAK.y + radius * shape * Math.sin(t) * 0.6).toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

const CONTOURS = Array.from({ length: 19 }, (_, i) => ({ k: i + 1, d: contour(i + 1) }));

const GRID: [number, number][] = [];
for (let x = 90; x < 1200; x += 150) for (let y = 60; y < 480; y += 120) GRID.push([x, y]);

function Relevo({ labels }: ArtProps) {
  return (
    <>
      <defs>
        <radialGradient id="mars-relevo-glow" gradientUnits="userSpaceOnUse" cx={PEAK.x} cy={PEAK.y} r="430">
          <stop offset="0" stopColor="#d9652f" stopOpacity="0.28" />
          <stop offset="1" stopColor="#d9652f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="480" fill="#000" />
      <rect width="1200" height="480" fill="url(#mars-relevo-glow)" />
      {GRID.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x - 5},${y}h10M${x},${y - 5}v10`} stroke={INK} strokeOpacity="0.16" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      {CONTOURS.map(({ k, d }) => (
        <path
          key={k}
          d={d}
          fill="none"
          // A cada quatro curvas, uma mestra: mais clara e mais grossa.
          stroke={k % 4 === 0 ? "#f09a75" : "#d9652f"}
          strokeWidth={k % 4 === 0 ? 1.6 : 1}
          strokeOpacity={Math.max(0.22, 1 - k * 0.045)}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle cx={PEAK.x} cy={PEAK.y} r="2.2" fill={INK} />
      {labels ? (
        <g className="hidden sm:block">
          <path d={`M${PEAK.x},${PEAK.y}L${PEAK.x + 86},${PEAK.y - 132}h64`} stroke={INK} strokeOpacity="0.5" strokeWidth="1" fill="none" />
          <text x={PEAK.x + 92} y={PEAK.y - 140} fill={INK} fillOpacity="0.72" fontSize="12" letterSpacing="2.4" style={LABEL}>
            OLYMPUS MONS
          </text>
          <text x={PEAK.x + 92} y={PEAK.y - 116} fill={INK} fillOpacity="0.42" fontSize="10.5" letterSpacing="1.8" style={LABEL}>
            21 900 M · 18,65° N 226,2° L
          </text>
        </g>
      ) : null}
      <LeftVeil id="mars-relevo-veil" stops={[[0, 1], [0.4, 0.9], [0.7, 0.15], [1, 0]]} />
    </>
  );
}

/* ---------- Cartaz: o planeta em formas chapadas, com as duas luas ---------- */

const PLANET = { x: 965, y: 262, r: 168 };
const TILT = -16;
const POSTER_STARS = stars(19, 46, 480);

/** Onde a lua está: `turn` é a fração da meia-volta da frente da órbita, já com a inclinação. */
function moonAt(rx: number, ry: number, turn: number): { x: number; y: number } {
  const t = Math.PI * turn;
  const x = -rx * Math.cos(t);
  const y = ry * Math.sin(t);
  const tilt = (TILT * Math.PI) / 180;
  return {
    x: PLANET.x + x * Math.cos(tilt) - y * Math.sin(tilt),
    y: PLANET.y + x * Math.sin(tilt) + y * Math.cos(tilt),
  };
}

/** `labelY`: a legenda de Fobos vai abaixo do ponto; a de Deimos, acima, para não cair sobre a busca. */
const MOONS = [
  { name: "FOBOS", rx: 262, ry: 54, size: 4.5, labelY: 17, ...moonAt(262, 54, 0.34) },
  { name: "DEIMOS", rx: 350, ry: 74, size: 3.2, labelY: -9, ...moonAt(350, 74, 0.3) },
];

function Cartaz({ labels }: ArtProps) {
  const { x, y, r } = PLANET;
  return (
    <>
      <defs>
        <clipPath id="mars-cartaz-disc">
          <circle cx={x} cy={y} r={r} />
        </clipPath>
      </defs>
      <rect width="1200" height="480" fill="#000" />
      {POSTER_STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={INK} opacity={s.o} />
      ))}

      {/* As órbitas inteiras ficam atrás do planeta; a metade da frente é redesenhada por cima. */}
      <g transform={`rotate(${TILT} ${x} ${y})`}>
        {MOONS.map((m) => (
          <ellipse key={m.name} cx={x} cy={y} rx={m.rx} ry={m.ry} fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </g>

      {/* Três tons chapados: a sombra, a luz e o brilho do lado do sol; duas manchas e a calota polar. */}
      <circle cx={x} cy={y} r={r} fill="#6b250c" />
      <g clipPath="url(#mars-cartaz-disc)">
        <circle cx={x + 52} cy={y - 40} r={r * 1.04} fill="#c8501d" />
        <circle cx={x + 104} cy={y - 82} r={r * 0.9} fill="#e27b4a" opacity="0.55" />
        <path d={`M${x - 40},${y - 30}c30,-26 78,-20 96,6c14,22 -8,46 -40,44c-34,-2 -72,-24 -56,-50z`} fill="#8f3814" opacity="0.55" />
        <path d={`M${x + 40},${y + 60}c22,-12 58,-6 64,12c6,18 -22,28 -44,24c-22,-4 -36,-26 -20,-36z`} fill="#8f3814" opacity="0.45" />
        <ellipse cx={x + 22} cy={y - r + 6} rx="58" ry="13" fill="#f3e6dc" opacity="0.9" />
      </g>

      <g transform={`rotate(${TILT} ${x} ${y})`}>
        {MOONS.map((m) => (
          <path key={m.name} d={`M${x - m.rx},${y}A${m.rx},${m.ry} 0 0 0 ${x + m.rx},${y}`} fill="none" stroke={INK} strokeOpacity="0.55" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {MOONS.map((m) => (
        <g key={m.name}>
          <circle cx={m.x} cy={m.y} r={m.size} fill={INK} />
          {labels ? (
            <text className="hidden sm:block" x={m.x + 11} y={m.y + m.labelY} fill={INK} fillOpacity="0.6" fontSize="10.5" letterSpacing="2.2" style={LABEL}>
              {m.name}
            </text>
          ) : null}
        </g>
      ))}
      <LeftVeil id="mars-cartaz-veil" stops={[[0, 1], [0.4, 0.85], [0.58, 0]]} />
    </>
  );
}

/* ---------- Dunas: a superfície ao pôr do sol, que em Marte é azul ---------- */

const DUNE_STARS = stars(5, 40, 190);
const SUN = { x: 900, y: 268 };
const FAR_RIDGE = "M0,300C150,272 300,294 450,282S760,252 900,276S1100,264 1200,272";

function Dunas() {
  return (
    <>
      <defs>
        <linearGradient id="mars-dunas-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.34" stopColor="#06060b" />
          <stop offset="0.5" stopColor="#1b1210" />
          <stop offset="0.62" stopColor="#4a2414" />
        </linearGradient>
        <radialGradient id="mars-dunas-dusk" gradientUnits="userSpaceOnUse" cx={SUN.x} cy={SUN.y} r="250">
          <stop offset="0" stopColor="#a9ccff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#6f9be0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#6f9be0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mars-dunas-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect width="1200" height="480" fill="url(#mars-dunas-sky)" />
      {DUNE_STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={INK} opacity={s.o} />
      ))}
      <rect width="1200" height="480" fill="url(#mars-dunas-dusk)" />
      <circle cx={SUN.x} cy={SUN.y} r="9" fill="#e6efff" />

      {/* Três camadas, da mais distante (clara) à mais próxima (quase preta). */}
      <path d={`${FAR_RIDGE}V480H0Z`} fill="#8a3513" />
      <path d={FAR_RIDGE} fill="none" stroke="#f09a75" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M0,346C200,312 380,354 560,332S900,302 1200,340V480H0Z" fill="#5a2009" />
      <path d="M0,408C260,362 520,430 780,394S1060,382 1200,402V480H0Z" fill="#2a0f05" />

      <LeftVeil id="mars-dunas-veil" stops={[[0, 0.95], [0.45, 0.7], [0.75, 0]]} />
      <rect width="1200" height="480" fill="url(#mars-dunas-floor)" />
    </>
  );
}

const ARTS: Record<MarsArt, (props: ArtProps) => React.ReactNode> = {
  relevo: Relevo,
  cartaz: Cartaz,
  dunas: Dunas,
};
