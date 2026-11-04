// Biblioteca de desenho dos sprites do Guia de ortopedia: primitivas em SVG
// (membros, ossos, mãos, pés, gesso, agulha, setas, rótulos, pessoa) na paleta
// Tevet & Iyar. Cada sprite é 1200 × 800 (viewBox), traço azul-marinho,
// pele e gesso em tons de terra, acento bronze. Texto em pt-BR.

export const C = {
  line: "#1c2a4a",     // azul-marinho (traço)
  skin: "#f3e4d3",     // pele
  skin2: "#e6cdb5",    // pele (sombra)
  skinHi: "#fbf3ea",   // pele (luz)
  skinLo: "#dfc0a3",   // pele (sombra forte)
  clothHi: "#e8ecf3",
  clothLo: "#aab5c9",
  bone: "#f8f5ef",     // osso
  plaster: "#ece7dc",  // gesso
  cotton: "#fbf8f2",   // algodão
  cloth: "#d7dde8",    // roupa / lençol
  cloth2: "#b9c3d4",
  metal: "#9aa3b5",
  accent: "#8a6d3b",   // bronze (setas, agulha, destaques)
  accent2: "#c9a66b",
  alarm: "#b3261e",
  blood: "#8f1d17",
  paper: "#ffffff",
  grid: "#e5e9f0",
  text: "#1c2a4a",
  muted: "#6b7280",
  film: "#2a3140",
};
export const W = 1200, H = 800;
export const SW = 5; // largura do traço padrão
/** Duração do ciclo da animação (s). Cada passo do procedimento ocupa uma fatia dele. */
export const D = 6;
const CSS = `<style>
/* Ciclo de ${D} s para todos os movimentos; cada passo do procedimento ocupa uma fatia dele.
   Sem animação quando o leitor pede menos movimento e na impressão (o desenho parado é o procedimento completo). */
.a{animation-duration:${D}s;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-fill-mode:both}
.lin{animation-timing-function:linear}
.nudge{animation-name:nudge}
.draw{animation-name:draw}
.pulse{animation-name:pulse}
.blink{animation-name:blink}
.swing{animation-name:swing}
.push{animation-name:push}
.enter{animation-name:enter}
.enter2{animation-name:enter2}
.reduce{animation-name:reduce}
.flip{animation-name:flip}
.plunge{animation-name:plunge}
.drain{animation-name:drain}
.flow{animation-name:flow;animation-timing-function:linear}
.buzz{animation-name:buzz;animation-duration:.25s;animation-timing-function:linear}
.travel{animation-name:travel;animation-timing-function:linear}
.in1{animation-name:in1}.in2{animation-name:in2}.in3{animation-name:in3}
.out1{animation-name:out1}.out2{animation-name:out2}.out3{animation-name:out3}
.fade3{animation-name:fade3}
.squeeze{animation-name:squeeze}.pendulum{animation-name:pendulum}.tighten{animation-name:tighten}
.hi2{animation-name:hi2}.hi3{animation-name:hi3}.hi4{animation-name:hi4}
.focus2{animation-name:focus2}.focus3{animation-name:focus3}.focus4{animation-name:focus4}
@keyframes nudge{0%,100%{transform:translate(0,0)}50%{transform:translate(var(--dx),var(--dy))}}
@keyframes draw{0%,10%{stroke-dashoffset:1}45%,100%{stroke-dashoffset:0}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.45}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes swing{0%,12%{transform:rotate(0)}55%,70%{transform:rotate(var(--a))}100%{transform:rotate(0)}}
@keyframes push{0%,12%{transform:translate(0,0)}55%,70%{transform:translate(var(--dx),var(--dy))}100%{transform:translate(0,0)}}
@keyframes enter{0%,8%{transform:translate(var(--dx),var(--dy))}38%,85%{transform:translate(0,0)}100%{transform:translate(var(--dx),var(--dy))}}
@keyframes enter2{0%,8%{transform:translate(var(--dx),var(--dy))}30%,42%{transform:translate(calc(var(--dx)*.45),calc(var(--dy)*.45))}60%,88%{transform:translate(0,0)}100%{transform:translate(var(--dx),var(--dy))}}
@keyframes reduce{0%,10%{transform:none}30%,40%{transform:translate(var(--dx),var(--dy))}55%,65%{transform:translate(var(--dx),var(--dy)) rotate(var(--a))}85%,100%{transform:none}}
@keyframes flip{0%,15%{transform:scaleY(1)}50%,70%{transform:scaleY(-1)}100%{transform:scaleY(1)}}
@keyframes plunge{0%,45%{transform:translate(0,0)}80%,100%{transform:translate(var(--p),0)}}
@keyframes drain{0%,45%{transform:scaleX(1)}80%,100%{transform:scaleX(.2)}}
@keyframes flow{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-96}}
@keyframes buzz{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes travel{0%,8%{transform:translate(0,0)}92%,100%{transform:translate(var(--dx),var(--dy))}}
@keyframes in1{0%,18%{opacity:0}26%,100%{opacity:1}}
@keyframes in2{0%,42%{opacity:0}50%,100%{opacity:1}}
@keyframes in3{0%,66%{opacity:0}74%,100%{opacity:1}}
@keyframes out1{0%,22%{opacity:1}30%,100%{opacity:0}}
@keyframes out2{0%,46%{opacity:1}54%,100%{opacity:0}}
@keyframes out3{0%,70%{opacity:1}78%,100%{opacity:0}}
@keyframes squeeze{0%,100%{transform:scale(1)}50%{transform:scale(.8)}}
@keyframes pendulum{0%,100%{transform:rotate(calc(var(--a)*-1))}50%{transform:rotate(var(--a))}}
@keyframes tighten{0%,15%{transform:scale(1,1)}55%,70%{transform:scale(.93,1)}100%{transform:scale(1,1)}}
@keyframes fade3{0%,66%{opacity:.75}80%,100%{opacity:.25}}
@keyframes hi2{0%{opacity:0}6%,44%{opacity:1}50%,100%{opacity:0}}
@keyframes hi3{0%{opacity:0}4%,29%{opacity:1}33.3%,100%{opacity:0}}
@keyframes hi4{0%{opacity:0}3%,22%{opacity:1}25%,100%{opacity:0}}
@keyframes focus2{0%,44%{opacity:1}50%,94%{opacity:.35}100%{opacity:1}}
@keyframes focus3{0%,29%{opacity:1}33.3%,96%{opacity:.35}100%{opacity:1}}
@keyframes focus4{0%,22%{opacity:1}25%,97%{opacity:.35}100%{opacity:1}}
@media (prefers-reduced-motion:reduce),print{.a{animation:none!important}}
</style>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v) => Math.round(v * 10) / 10;

/** Monta o SVG final. */
export function svg(children, { title } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, 'Segoe UI', Arial, sans-serif">
${title ? `<title>${esc(title)}</title>` : ""}
<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.accent}"/></marker>
  <marker id="ahr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.alarm}"/></marker>
  <marker id="ahn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.line}"/></marker>
  <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="${C.line}" stroke-opacity="0.18" stroke-width="3"/></pattern>
  <pattern id="cotton" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2" fill="${C.line}" fill-opacity="0.12"/></pattern>
  <pattern id="cloth" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8 H16 M8 0 V16" stroke="${C.line}" stroke-opacity="0.08" stroke-width="2"/></pattern>
</defs>
${CSS}
${(() => { const all = children.flat(Infinity).filter(Boolean); const tops = all.filter((c) => c.includes('data-top="1"')); return [...all.filter((c) => !tops.includes(c)), ...tops].join("\n"); })()}
</svg>`;
}

// ---------- primitivas ----------
export const g = (attrs, ...kids) => `<g ${attrs}>${kids.flat(Infinity).filter(Boolean).join("\n")}</g>`;

// ---------- animação ----------
/**
 * Grupo animado: classe de keyframes (ver CSS) + variáveis (--dx, --dy, --a, --p) + atraso em fração do ciclo
 * (negativo, para o primeiro ciclo já sair no ponto certo). Grupos com a mesma classe/variáveis andam juntos.
 */
export function anim(cls, vars = {}, ...kids) {
  const { delay, dur, ...rest } = vars;
  const style = [
    ...Object.entries(rest).map(([k, v]) => `--${k}:${v}`),
    delay != null ? `animation-delay:${n(-((1 - (delay % 1)) % 1 || 1) * D)}s` : "",
    dur != null ? `animation-duration:${dur}s` : "",
  ].filter(Boolean).join(";");
  return `<g class="a ${cls}"${style ? ` style="${style}"` : ""}>${kids.flat(Infinity).filter(Boolean).join("\n")}</g>`;
}
/** Grupo animado em torno de um pivô (rotação, escala): translada ao pivô, anima, volta. */
export const pivot = (px, py, cls, vars, ...kids) =>
  g(`transform="translate(${n(px)} ${n(py)})"`, anim(cls, vars, g(`transform="translate(${n(-px)} ${n(-py)})"`, ...kids)));
/** Vetor unitário × k de (x1,y1)→(x2,y2), em px, para --dx/--dy. */
export const along = (x1, y1, x2, y2, k) => { const l = Math.hypot(x2 - x1, y2 - y1) || 1; return { dx: `${n((x2 - x1) / l * k)}px`, dy: `${n((y2 - y1) / l * k)}px` }; };
/** Moldura que acende o painel i de N, no tempo do passo i. */
export const spotlight = (x, y, w, h, i, N) =>
  anim(`hi${N}`, { delay: i / N }, rect(x, y, w, h, { fill: "none", stroke: C.accent, sw: 5, rx: 14, extra: 'opacity="0"' }));
export const path = (d, { fill = "none", stroke = C.line, sw = SW, dash, cap = "round", join = "round", opacity, extra = "" } = {}) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"${dash ? ` stroke-dasharray="${dash}"` : ""}${opacity != null ? ` opacity="${opacity}"` : ""} ${extra}/>`;
export const circle = (x, y, r, { fill = C.paper, stroke = C.line, sw = SW, extra = "" } = {}) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
export const rect = (x, y, w, h, { fill = C.paper, stroke = C.line, sw = SW, rx = 0, extra = "" } = {}) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
export const line = (x1, y1, x2, y2, o = {}) => path(`M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`, o);
export const dot = (x, y, r = 9, color = C.accent) => circle(x, y, r, { fill: color, stroke: C.paper, sw: 3 });
/** Largura estimada de um texto (Inter ≈ 0,54 × tamanho por caractere; negrito um pouco mais). */
export const measure = (s, size, weight = 500) => String(s).length * size * (weight >= 700 ? 0.58 : 0.54);
/** Espaço livre à direita/esquerda de x conforme a âncora, com margem de 30. */
const room = (x, anchor) => anchor === "end" ? x - 30 : anchor === "middle" ? 2 * Math.min(x, W - x) - 30 : W - x - 30;
export const text = (x, y, s, { size = 30, anchor = "start", weight = 500, color = C.text, italic = false, extra = "", max } = {}) => {
  const lines = String(s).split("\n"), lim = max ?? room(x, anchor);
  const longest = Math.max(...lines.map((l) => measure(l, size, weight)));
  if (longest > lim) size = Math.max(15, Math.floor(size * lim / longest));
  return lines.map((l, i) => `<text x="${n(x)}" y="${n(y + i * (size + 6))}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" fill="${color}"${italic ? ' font-style="italic"' : ""} ${extra}>${esc(l)}</text>`).join("\n");
};

/** Rótulo com linha-guia até um ponto. */
export function label(x, y, s, { to, size = 28, anchor = "start", color = C.text, lead = C.accent } = {}) {
  const parts = [];
  if (to) parts.push(line(x + (anchor === "end" ? 8 : anchor === "middle" ? 0 : -8), y - 10, to[0], to[1], { stroke: lead, sw: 3 }), dot(to[0], to[1], 7, lead));
  const lines = String(s).split("\n");
  lines.forEach((l, i) => parts.push(text(x, y + i * (size + 6), l, { size, anchor, color })));
  return parts.join("\n");
}
export const title = (s, y = 56) => text(40, y, s, { size: 40, weight: 700, extra: 'data-top="1"' });
export const caption = (x, y, s, size = 26) => String(s).split("\n").map((l, i) => text(x, y + i * (size + 6), l, { size, color: C.muted })).join("\n");

/** Número de passo num círculo. */
export const step = (k, x, y, r = 24) => [circle(x, y, r, { fill: C.line, stroke: C.line, sw: 2 }), text(x, y + 11, String(k), { size: 30, anchor: "middle", weight: 700, color: C.paper })].join("\n");

/** Moldura de painel com título. */
export function panel(x, y, w, h, ttl) {
  return [rect(x, y, w, h, { fill: C.paper, stroke: C.grid, sw: 3, rx: 14 }), ttl ? text(x + 22, y + 44, ttl, { size: 30, weight: 700 }) : ""].join("\n");
}

/** Seta reta (bronze). */
export const arrow = (x1, y1, x2, y2, { color = C.accent, sw = 7, marker = "ah", still = false } = {}) => {
  const p = path(`M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`, { stroke: color, sw, extra: `marker-end="url(#${marker})"` });
  return still ? p : anim("nudge", { ...along(x1, y1, x2, y2, Math.min(14, Math.hypot(x2 - x1, y2 - y1) * 0.25)), dur: 1.6 }, p);
};
/** Seta curva por um ponto de controle: desenha-se ao longo do ciclo. */
export const arc = (x1, y1, cx, cy, x2, y2, { color = C.accent, sw = 7, marker = "ah", dash, still = false } = {}) => {
  const p = path(`M${n(x1)} ${n(y1)} Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}`, { stroke: color, sw, dash, extra: `marker-end="url(#${marker})"${still || dash ? "" : ' pathLength="1" stroke-dasharray="1"'}` });
  return still || dash ? p : anim("draw", {}, p);
};

const polyD = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${n(p[0])} ${n(p[1])}`).join(" ");
/** Luz e sombra de um preenchimento (a luz vem de cima); null = sem volume. */
function tones(fill) {
  if (fill === C.skin) return [C.skinHi, C.skinLo];
  if (fill === C.cloth) return [C.clothHi, C.clothLo];
  if (fill === C.cloth2) return ["#d3dae6", "#8f9bb3"];
  if (fill === C.bone) return ["#ffffff", "#e3dccb"];
  return null;
}
let gradN = 0;
/** Gradiente cilíndrico de um trecho reto: claro na borda da luz, cor no meio, escuro na outra borda. */
function cylGrad(x1, y1, x2, y2, w, fill, [hi, lo]) {
  const [nx, ny] = upNormal(x1, y1, x2, y2), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, h = w / 2, id = `cg${++gradN}`;
  const defs = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(mx + nx * h)}" y1="${n(my + ny * h)}" x2="${n(mx - nx * h)}" y2="${n(my - ny * h)}"><stop offset="0" stop-color="${hi}"/><stop offset="0.38" stop-color="${fill}"/><stop offset="0.8" stop-color="${lo}" stop-opacity="0.85"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs>`;
  return { defs, url: `url(#${id})` };
}
/** Normal unitária apontando para cima (lado da luz) de um segmento. */
function upNormal(x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  let nx = -Math.sin(a), ny = Math.cos(a);
  if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
  return [nx, ny];
}
/** Faixa de luz em cima e de sombra embaixo, ao longo de cada trecho — dá o volume do tubo. */
function shade(pts, w, [hi, lo]) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1); if (len < 1) continue;
    const [nx, ny] = upNormal(x1, y1, x2, y2), dx = (x2 - x1) / len, dy = (y2 - y1) / len;
    const t = Math.min(w * 0.3, len * 0.25), o = w * 0.27;
    const sx = x1 + dx * t, sy = y1 + dy * t, ex = x2 - dx * t, ey = y2 - dy * t;
    out.push(path(`M${n(sx + nx * o)} ${n(sy + ny * o)} L${n(ex + nx * o)} ${n(ey + ny * o)}`, { stroke: hi, sw: w * 0.26, opacity: 0.9 }));
    out.push(path(`M${n(sx - nx * o)} ${n(sy - ny * o)} L${n(ex - nx * o)} ${n(ey - ny * o)}`, { stroke: lo, sw: w * 0.22, opacity: 0.55 }));
  }
  return out;
}
/**
 * Cadeia de segmentos (coxa + perna, braço + antebraço…): primeiro todos os
 * contornos, depois todos os preenchimentos — a articulação fica contínua,
 * sem o contorno de um segmento cortando o outro — e por fim luz e sombra.
 * segments: [{ pts: [[x,y],…], w, fill? }]
 */
export function chain(segments, { stroke = C.line, sw = SW, anim: mv } = {}) {
  const segs = segments.map((s) => ({ fill: C.skin, ...s }));
  const fillOf = (s) => {
    const t = s.shade === false ? null : tones(s.fill);
    if (!t) return [path(polyD(s.pts), { stroke: s.fill, sw: s.w })];
    const out = [path(polyD(s.pts), { stroke: s.fill, sw: s.w })];
    for (let i = 0; i < s.pts.length - 1; i++) {
      const [x1, y1] = s.pts[i], [x2, y2] = s.pts[i + 1];
      const g = cylGrad(x1, y1, x2, y2, s.w, s.fill, t);
      out.push(g.defs, path(`M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`, { stroke: g.url, sw: s.w }));
    }
    return out;
  };
  const outline = (s) => path(polyD(s.pts), { stroke, sw: s.w + sw * 2 });
  if (!mv) return [...segs.map(outline), ...segs.flatMap(fillOf)].join("\n");
  // Trecho móvel (a partir do segmento `from`): contornos fixos, contornos móveis, preenchimentos fixos,
  // preenchimentos móveis — parado, é a cadeia de sempre; em movimento, a articulação continua coberta.
  const { from, cls, vars = {}, pivot: pv, extra = "" } = mv;
  const fixed = segs.slice(0, from), moving = segs.slice(from), [px, py] = pv ?? moving[0].pts[0];
  const wrap = (...kids) => pivot(px, py, cls, vars, ...kids);
  return [...fixed.map(outline), wrap(moving.map(outline)), ...fixed.flatMap(fillOf), wrap(moving.flatMap(fillOf), extra)].join("\n");
}
/** Segmento de membro: cápsula com contorno e volume (pele por padrão). */
export function limb(x1, y1, x2, y2, w, { fill = C.skin, stroke = C.line, sw = SW, shade: sh = true } = {}) {
  return chain([{ pts: [[x1, y1], [x2, y2]], w, fill, shade: sh }], { stroke, sw });
}
/** Cápsula por polilinha (ex.: braço dobrado) — contorno contínuo e volume. */
export function limbPoly(pts, w, { fill = C.skin, stroke = C.line, sw = SW, shade: sh = true } = {}) {
  return chain([{ pts, w, fill, shade: sh }], { stroke, sw });
}
/** Osso longo: diáfise com extremidades alargadas. */
export function bone(x1, y1, x2, y2, w, { fill = C.bone } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1), dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx, e = w * 0.9, k = w * 1.1;
  const d = [
    `M${n(x1 + px * e)} ${n(y1 + py * e)}`, `Q${n(x1 + px * e + dx * k)} ${n(y1 + py * e + dy * k)} ${n(x1 + px * w / 2 + dx * k * 1.6)} ${n(y1 + py * w / 2 + dy * k * 1.6)}`,
    `L${n(x2 + px * w / 2 - dx * k * 1.6)} ${n(y2 + py * w / 2 - dy * k * 1.6)}`, `Q${n(x2 + px * e - dx * k)} ${n(y2 + py * e - dy * k)} ${n(x2 + px * e)} ${n(y2 + py * e)}`,
    `A${n(e)} ${n(e)} 0 0 0 ${n(x2 - px * e)} ${n(y2 - py * e)}`,
    `Q${n(x2 - px * e - dx * k)} ${n(y2 - py * e - dy * k)} ${n(x2 - px * w / 2 - dx * k * 1.6)} ${n(y2 - py * w / 2 - dy * k * 1.6)}`,
    `L${n(x1 - px * w / 2 + dx * k * 1.6)} ${n(y1 - py * w / 2 + dy * k * 1.6)}`, `Q${n(x1 - px * e + dx * k)} ${n(y1 - py * e + dy * k)} ${n(x1 - px * e)} ${n(y1 - py * e)}`,
    `A${n(e)} ${n(e)} 0 0 0 ${n(x1 + px * e)} ${n(y1 + py * e)} Z`,
  ].join(" ");
  const t = tones(fill);
  if (!t) return path(d, { fill });
  const g = cylGrad(x1, y1, x2, y2, w * 1.8, fill, t);
  return g.defs + path(d, { fill: g.url });
}
/** Linha de fratura em ziguezague perpendicular ao segmento no ponto t (0–1). */
export function fracture(x1, y1, x2, y2, t, w, { color = C.alarm } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1), px = -Math.sin(a), py = Math.cos(a), dx = Math.cos(a), dy = Math.sin(a);
  const cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t, h = w * 0.42;
  const pts = []; const steps = 6;
  for (let i = 0; i <= steps; i++) { const s = -h + (2 * h * i) / steps; const z = (i % 2 ? 1 : -1) * w * 0.18; pts.push([cx + px * s + dx * z, cy + py * s + dy * z]); }
  return anim("blink", { dur: 2 }, path(pts.map((p, i) => `${i ? "L" : "M"}${n(p[0])} ${n(p[1])}`).join(" "), { stroke: color, sw: 5, join: "miter" }));
}
/** Mão simplificada (luva): palma + 4 dedos + polegar; angle = direção dos dedos em graus; scale ≈ 1. */
export function hand(x, y, angle = 0, scale = 1, { fill = C.skin, flex = 0 } = {}) {
  // desenhada apontando para +x; palma na origem
  const fingers = [-36, -12, 12, 36].map((off, i) => { const L = [62, 74, 70, 56][i]; return `M44 ${n(off)} L${n(44 + L * Math.cos(flex))} ${n(off + L * Math.sin(flex))}`; });
  const thumb = "M-34 -46 L4 -92", palm = "M-4 -50 L46 -46 Q60 0 46 46 L-4 50 Q-66 30 -68 0 Q-66 -30 -4 -50 Z";
  const t = tones(fill) ?? [fill, fill], id = `hg${++gradN}`;
  const defs = `<defs><linearGradient id="${id}f" gradientUnits="userSpaceOnUse" x1="0" y1="-9" x2="0" y2="9"><stop offset="0" stop-color="${t[0]}"/><stop offset="0.4" stop-color="${fill}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient><linearGradient id="${id}p" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="0.45" stop-color="${fill}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>`;
  return g(`transform="translate(${n(x)} ${n(y)}) rotate(${angle}) scale(${scale})"`, defs,
    path(thumb, { stroke: C.line, sw: 26 }),
    path(palm, { fill: `url(#${id}p)`, sw: SW }),
    ...fingers.map((d) => path(d, { stroke: C.line, sw: 24 })), ...fingers.map((d) => path(d, { stroke: `url(#${id}f)`, sw: 15 })),
    path(thumb, { stroke: `url(#${id}f)`, sw: 16 }));
}
/** Pé de perfil apontando para +x (calcanhar na origem). */
export function foot(x, y, angle = 0, scale = 1, { fill = C.skin } = {}) {
  return g(`transform="translate(${n(x)} ${n(y)}) rotate(${angle}) scale(${scale})"`,
    (() => { const t = tones(fill) ?? [fill, fill], id = `fg${++gradN}`; return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="0.45" stop-color="${fill}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>` + path("M-30 -50 L-36 0 Q-30 30 10 36 L150 40 Q172 36 172 20 Q168 4 140 0 L60 -12 Q40 -30 36 -60 Z", { fill: `url(#${id})`, sw: SW }); })());
}
/** Cabeça de perfil ou frente (círculo com orelha/nuca). */
export const head = (x, y, r = 46, { fill = C.skin } = {}) => {
  const t = tones(fill) ?? [fill, fill], id = `rg${++gradN}`;
  return [`<defs><radialGradient id="${id}" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="${t[0]}"/><stop offset="0.5" stop-color="${fill}"/><stop offset="1" stop-color="${t[1]}"/></radialGradient></defs>`,
    circle(x, y, r, { fill: `url(#${id})` }), circle(x - r * 0.1, y - r * 0.15, r * 0.06, { fill: C.line, stroke: C.line })].join("\n");
};

/** Pessoa esquemática por pontos articulares: {head:[x,y], neck, hip, shoulder, elbow, hand, hip2, knee, foot...}. */
export function person(p, { skin = C.skin, cloth = C.cloth, headR = 42, w = 44 } = {}) {
  const out = [];
  if (p.hip && p.neck) {
    const [nx, ny] = p.neck, [hx, hy] = p.hip, a = Math.atan2(hy - ny, hx - nx), dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, s = w * 1.25, h = w * 0.95;
    out.push(path(`M${n(nx + px * s)} ${n(ny + py * s)} L${n(hx + px * h)} ${n(hy + py * h)} Q${n(hx + dx * w * 0.7)} ${n(hy + dy * w * 0.7)} ${n(hx - px * h)} ${n(hy - py * h)} L${n(nx - px * s)} ${n(ny - py * s)} Q${n(nx - dx * w * 0.45)} ${n(ny - dy * w * 0.45)} ${n(nx + px * s)} ${n(ny + py * s)} Z`, { fill: cloth }));
  }
  const segs = [];
  for (const [a, b] of [["hipL", "kneeL"], ["kneeL", "ankleL"], ["hipR", "kneeR"], ["kneeR", "ankleR"]]) if (p[a] && p[b]) segs.push({ pts: [p[a], p[b]], w: w * 1.1, fill: a.startsWith("hip") ? cloth : skin });
  for (const [a, b] of [["shoulderL", "elbowL"], ["elbowL", "handL"], ["shoulderR", "elbowR"], ["elbowR", "handR"]]) if (p[a] && p[b]) segs.push({ pts: [p[a], p[b]], w: w * 0.9, fill: a.startsWith("shoulder") ? cloth : skin });
  if (p.neck && p.head) segs.unshift({ pts: [p.head, p.neck], w: w * 0.7, fill: skin, shade: false });
  if (segs.length) out.push(chain(segs));
  if (p.hip && p.neck) {
    const t = tones(cloth);
    if (t) { const g = cylGrad(p.neck[0], p.neck[1], p.hip[0], p.hip[1], w * 2.5, cloth, t); out[0] = g.defs + out[0].replace(`fill="${cloth}"`, `fill="${g.url}"`); }
  }
  if (p.head) out.push(head(p.head[0], p.head[1], headR, { fill: skin }));
  return out.join("\n");
}

/** Gesso/tala: caminho fechado com preenchimento e hachura. */
export const plaster = (d, { fill = C.plaster } = {}) => [path(d, { fill }), path(d, { fill: "url(#hatch)", stroke: "none" })].join("\n");
/** Algodão (camada pontilhada). */
export const cotton = (d) => [path(d, { fill: C.cotton, stroke: C.line, sw: 3 }), path(d, { fill: "url(#cotton)", stroke: "none" })].join("\n");
/** Faixa de atadura em espiral sobre um segmento. */
export function bandage(x1, y1, x2, y2, w, turns = 6, { color = C.line } = {}) {
  const out = []; const a = Math.atan2(y2 - y1, x2 - x1), px = -Math.sin(a), py = Math.cos(a);
  for (let i = 0; i <= turns; i++) { const t = i / turns, t2 = Math.min(1, t + 0.08); const cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t, ex = x1 + (x2 - x1) * t2, ey = y1 + (y2 - y1) * t2;
    out.push(path(`M${n(cx + px * w / 2)} ${n(cy + py * w / 2)} L${n(ex - px * w / 2)} ${n(ey - py * w / 2)}`, { stroke: color, sw: 3, opacity: 0.5 })); }
  return out.join("\n");
}
/** Seringa com agulha: ponta em (x,y), ângulo = direção da agulha (para onde aponta). */
export function syringe(x, y, angle, { len = 110, barrel = 130, fillLiquid = C.accent2, scale = 1, depth = 40, still = false, aspirate = false } = {}) {
  const liqX = -len - 14 - barrel + 6, liqW = barrel * 0.55;
  // êmbolo e líquido: o êmbolo avança (--p) e o líquido encolhe a partir do lado do êmbolo (pivô na ponta do bico)
  const plunger = [rect(-len - 14 - barrel - 36, -8, 36, 16, { fill: C.metal, sw: 2 }), rect(-len - 14 - barrel - 44, -26, 10, 52, { fill: C.metal, sw: 2 }), rect(-len - 14 - barrel - 6, -34, 8, 68, { fill: C.metal, sw: 2 })];
  const liquid = rect(liqX, -16, liqW, 32, { fill: fillLiquid, stroke: "none" });
  const body = [
    line(0, 0, -len, 0, { stroke: C.metal, sw: 4 }), line(0, 0, -len, 0, { stroke: C.line, sw: 1.5 }),
    rect(-len - 14, -10, 14, 20, { fill: C.metal, sw: 2 }),
    rect(-len - 14 - barrel, -22, barrel, 44, { fill: C.paper, sw: 3, rx: 4 }),
    still || aspirate ? liquid : pivot(liqX + liqW, 0, "drain", {}, liquid),
    still ? plunger : anim("plunge", { p: `${n(aspirate ? -liqW * 0.5 : liqW * 0.8)}px` }, plunger),
  ];
  const inner = g(`transform="translate(${n(x)} ${n(y)}) rotate(${angle}) scale(${scale})"`, body);
  if (still || !depth) return inner;
  const a = angle * Math.PI / 180;
  return anim("enter", { dx: `${n(-Math.cos(a) * depth)}px`, dy: `${n(-Math.sin(a) * depth)}px` }, inner);
}
/** Agulha solta (sem seringa). */
export const needle = (x, y, angle, len = 90) => g(`transform="translate(${n(x)} ${n(y)}) rotate(${angle})"`, line(0, 0, -len, 0, { stroke: C.metal, sw: 4 }), line(0, 0, -len, 0, { stroke: C.line, sw: 1.5 }), rect(-len - 16, -9, 16, 18, { fill: C.accent, sw: 2 }));
/** Película de raio-X. */
export const film = (x, y, w, h) => rect(x, y, w, h, { fill: C.film, stroke: C.line, sw: 4, rx: 10 });
/** Osso em raio-X (claro sobre o filme). */
export const xbone = (x1, y1, x2, y2, w) => bone(x1, y1, x2, y2, w, { fill: "#d7dbe3" });
/** Marca de alvo (X) num ponto. */
export const target = (x, y, r = 14, color = C.accent) => [pivot(x, y, "pulse", { dur: 2 }, circle(x, y, r, { fill: "none", stroke: color, sw: 4 })), line(x - r * 1.6, y, x + r * 1.6, y, { stroke: color, sw: 3 }), line(x, y - r * 1.6, x, y + r * 1.6, { stroke: color, sw: 3 })].join("\n");
/** Cama / maca (lateral). */
export const bed = (x, y, w, h = 36) => [rect(x, y, w, h, { fill: C.cloth2, sw: 4, rx: 8 }), line(x + 30, y + h, x + 30, y + h + 90, { sw: 8 }), line(x + w - 30, y + h, x + w - 30, y + h + 90, { sw: 8 })].join("\n");
/** Ícone de ✓ ou ✗ */
export const check = (x, y, ok = true) => ok ? path(`M${x - 14} ${y} L${x - 4} ${y + 12} L${x + 16} ${y - 12}`, { stroke: "#2f6b4f", sw: 7 }) : [line(x - 12, y - 12, x + 12, y + 12, { stroke: C.alarm, sw: 7 }), line(x + 12, y - 12, x - 12, y + 12, { stroke: C.alarm, sw: 7 })].join("\n");
/** Lista de itens com marcador. */
export function bullets(x, y, items, { size = 27, gap = 42, color = C.text } = {}) {
  let yy = y;
  return items.map((s) => { const out = [dot(x, yy - 9, 6, C.accent), text(x + 22, yy, s, { size, color })].join("\n"); yy += gap + (String(s).split("\n").length - 1) * (size + 6); return out; }).join("\n");
}
