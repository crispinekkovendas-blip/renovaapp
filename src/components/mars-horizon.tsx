import { useId } from "react";

/**
 * O horizonte de Marte visto de órbita, desenhado (sem foto): o limbo do
 * planeta com a faixa fina de atmosfera, o terminador caindo para a sombra e
 * um céu de estrelas. Só aparece no tema Marte (`mars:block`); fica atrás do
 * conteúdo do bloco que o contém, que precisa ser `relative` e pôr o próprio
 * conteúdo num filho também `relative`.
 *
 * A luz vem do alto à direita e a sombra fecha à esquerda e embaixo, onde o
 * texto fica. No celular o bloco é estreito e o texto cairia sobre a parte
 * iluminada: ali um véu sobe de baixo e deixa só o horizonte no alto.
 */

/** Estrelas em posições fixas (gerador congruente): o desenho é sempre o mesmo. */
const STARS = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return Array.from({ length: 70 }, () => ({
    x: Math.round(next() * 1200),
    y: Math.round(next() * 330),
    r: 0.4 + Math.round(next() * 8) / 10,
    o: 0.25 + Math.round(next() * 60) / 100,
  }));
})();

/** Crateras: elipses achatadas pela curvatura, com a borda iluminada do lado do sol. */
const CRATERS = [
  { x: 905, y: 262, rx: 34, ry: 11 },
  { x: 1010, y: 318, rx: 22, ry: 8 },
  { x: 790, y: 300, rx: 16, ry: 5 },
  { x: 1090, y: 268, rx: 12, ry: 4 },
  { x: 960, y: 380, rx: 46, ry: 17 },
  { x: 700, y: 372, rx: 20, ry: 7 },
  { x: 1120, y: 392, rx: 26, ry: 10 },
];

export function MarsHorizon({ className = "" }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = (name: string) => `url(#${name}${id})`;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 hidden overflow-hidden mars:block ${className}`}>
      <svg viewBox="0 0 1200 480" preserveAspectRatio="xMaxYMax slice" className="h-full w-full">
        <defs>
          {/* A superfície: do ocre iluminado à ferrugem e ao quase preto da sombra. */}
          <radialGradient id={`surface${id}`} gradientUnits="userSpaceOnUse" cx="1060" cy="150" r="760">
            <stop offset="0" stopColor="#f0a070" />
            <stop offset="0.18" stopColor="#d9652f" />
            <stop offset="0.42" stopColor="#a8431a" />
            <stop offset="0.68" stopColor="#5e230d" />
            <stop offset="1" stopColor="#140704" />
          </radialGradient>
          {/* O terminador: a noite avançando da esquerda. */}
          <linearGradient id={`night${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="1" />
            <stop offset="0.38" stopColor="#000" stopOpacity="0.92" />
            <stop offset="0.72" stopColor="#000" stopOpacity="0.25" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          {/* O véu de baixo, onde ficam a busca e os botões. */}
          <linearGradient id={`floor${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.82" />
          </linearGradient>
          <linearGradient id={`air${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.3" stopColor="#ffb48a" stopOpacity="0" />
            <stop offset="0.62" stopColor="#ffb48a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd9bf" stopOpacity="0.95" />
          </linearGradient>
          {/* Relevo: ruído fractal em manchas escuras e claras, só dentro do planeta. */}
          <filter id={`terrain${id}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.018" numOctaves="5" seed="11" />
            <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.06  0 0 0 0 0.02  0 0 0 -1.9 1.05" />
          </filter>
          <filter id={`dust${id}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" seed="4" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.72  0 0 0 0 0.5  0 0 0 -2.6 0.95" />
          </filter>
          <filter id={`glow${id}`} x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={`soft${id}`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <clipPath id={`disc${id}`}>
            <circle cx="900" cy="760" r="620" />
          </clipPath>
        </defs>

        <rect width="1200" height="480" fill="#000" />
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f0f0fa" opacity={s.o} />
        ))}

        {/* O brilho da atmosfera por trás do limbo. */}
        <circle cx="900" cy="760" r="622" fill="none" stroke={ref("air")} strokeWidth="16" filter={ref("glow")} />

        <g clipPath={ref("disc")}>
          <rect width="1200" height="480" fill={ref("surface")} />
          <rect width="1200" height="480" filter={ref("terrain")} opacity="0.75" />
          <rect width="1200" height="480" filter={ref("dust")} opacity="0.16" />
          {CRATERS.map((c, i) => (
            <g key={i}>
              <ellipse cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill="#2a0f06" opacity="0.3" filter={ref("soft")} />
              <ellipse cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill="none" stroke="#ffc9a3" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray={`${c.rx * 2.2} ${c.rx * 6}`} strokeDashoffset={c.rx * 0.6} />
            </g>
          ))}
          <rect width="1200" height="480" fill={ref("night")} />
        </g>

        {/* A linha fina da atmosfera sobre o limbo. */}
        <circle cx="900" cy="760" r="620.5" fill="none" stroke={ref("air")} strokeWidth="1.6" />

        <rect width="1200" height="480" fill={ref("floor")} />
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#000_50%,rgb(0_0_0/0.55)_72%,transparent_96%)] sm:hidden" />
    </div>
  );
}
