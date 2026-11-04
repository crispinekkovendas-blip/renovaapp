// Sprites 1–13: bases do primeiro dia (raio-X, talas, gesso, bloqueios, sedação, punções) e tétano.
import * as L from "./lib.mjs";
const { C, svg, g, path, circle, rect, line, dot, text, label, title, caption, step, panel, arrow, arc, limb, limbPoly, chain, bone, fracture, hand, foot, head, person, plaster, cotton, bandage, syringe, needle, film, xbone, target, bed, check, bullets, anim, pivot, along, spotlight } = L;

export const PART1 = [
  // 1. Leitura do raio-X de trauma em 60 segundos
  { n: 1, draw: () => svg([
    title("Raio-X de trauma em 60 segundos: A · B · C · S"),
    film(60, 100, 440, 660),
    // punho AP: rádio e ulna com fratura do rádio distal e degrau cortical
    xbone(190, 720, 230, 330, 44), xbone(300, 720, 290, 340, 30),
    // carpo e metacarpos
    ...[[205, 290], [250, 285], [295, 292], [335, 300]].map(([x, y]) => circle(x, y, 22, { fill: "#d7dbe3", stroke: "#2a3140", sw: 2 })),
    ...[[175, 250, 160, 140], [225, 240, 215, 120], [270, 240, 265, 115], [315, 250, 320, 125], [350, 265, 375, 160]].map(([x1, y1, x2, y2]) => xbone(x1, y1, x2, y2, 20)),
    // fratura (degrau cortical) marcada
    path("M198 420 L236 404 L232 386", { stroke: C.alarm, sw: 5 }), pivot(220, 405, "pulse", { dur: 2.5 }, circle(220, 405, 46, { fill: "none", stroke: C.accent, sw: 5, extra: 'stroke-dasharray="12 10"' })),
    rect(62, 702, 436, 56, { fill: C.film, stroke: "none" }), text(80, 150, "AP", { size: 28, color: "#cfd6e3", weight: 700 }), text(80, 740, "duas incidências, sempre", { size: 24, color: "#cfd6e3" }),
    // lista ABCS
    anim("focus4", { delay: 0 }, step("A", 560, 160), text(610, 172, "Alinhamento", { size: 34, weight: 700 }), caption(610, 212, "eixo do osso e das articulações; luxação?")),
    anim("focus4", { delay: 1 / 4 }, step("B", 560, 290), text(610, 302, "Bone — o osso", { size: 34, weight: 700 }), caption(610, 342, "siga a cortical com o olho: degrau,\ninterrupção, zona escura = fratura")),
    anim("focus4", { delay: 2 / 4 }, step("C", 560, 450), text(610, 462, "Cartilagem — a articulação", { size: 34, weight: 700 }), caption(610, 502, "espaço articular simétrico? superfície\narticular contínua? (Salter-Harris na criança)")),
    anim("focus4", { delay: 3 / 4 }, step("S", 560, 610), text(610, 622, "Soft tissue — partes moles", { size: 34, weight: 700 }), caption(610, 662, "edema, derrame (coxim gorduroso no cotovelo),\nar, corpo estranho")),
    arrow(545, 405, 480, 405), text(1150, 760, "compare com o lado oposto na criança", { size: 24, color: C.muted, anchor: "end" }),
  ], { title: "Leitura do raio-X de trauma" }) },

  // 2. Tala gessada (antebraquiopalmar e suropodálica) — a técnica
  { n: 2, draw: () => svg([
    title("Tala gessada: a técnica"),
    panel(40, 90, 560, 680, "Antebraquiopalmar"),
    // antebraço + mão, vista lateral; tala volar
    anim("in1", {}, cotton("M100 478 L420 478 Q470 478 520 472 L520 504 Q470 512 420 510 L100 510 Z")),
    anim("in2", {}, plaster("M110 504 L420 504 Q470 504 525 496 L525 534 Q470 542 420 540 L110 540 Z")),
    limb(110, 420, 420, 420, 110), hand(510, 420, 0, 1.15, { flex: 0.35 }),
    anim("in3", {}, bandage(120, 420, 440, 420, 130, 8)),
    label(70, 620, "malha → algodão → 10–12 camadas\n→ moldar com a palma → atadura", { size: 25 }),
    label(70, 700, "punho 20° extensão · MF livres", { size: 25, to: [470, 456] }),
    arrow(300, 330, 300, 365), text(300, 315, "moldar com a palma, não com os dedos", { size: 23, anchor: "middle", color: C.muted }),
    panel(620, 90, 540, 680, "Suropodálica"),
    // perna + pé (dedos para a direita): a tala fica atrás (esquerda) e sob a planta
    anim("in1", {}, cotton("M820 240 L842 240 L842 590 Q842 610 870 614 L1060 622 L1060 648 L860 640 Q816 634 816 590 Z")),
    anim("in2", {}, plaster("M786 240 L818 240 L818 592 Q818 638 866 644 L1066 652 L1066 690 L856 680 Q786 672 786 596 Z")),
    limb(900, 240, 900, 540, 120), foot(900, 580, 0, 1.15),
    anim("in3", {}, bandage(900, 270, 900, 530, 140, 7)),
    label(650, 700, "tornozelo a 90°, joelho livre · 12–15 camadas,\nda ponta do pé a 2 dedos abaixo do joelho", { size: 23 }),
    arc(1000, 520, 1010, 580, 960, 600, { sw: 5 }), text(1020, 520, "90°", { size: 26, color: C.accent, weight: 700 }),
  ], { title: "Tala gessada" }) },

  // 3. Gesso circular bem moldado (e bivalvado)
  { n: 3, draw: () => svg([
    title("Gesso circular: três pontos de moldagem, articulações livres"),
    limb(150, 400, 560, 400, 120), hand(660, 400, 0, 1.25, { flex: 0.3 }),
    plaster("M160 330 L560 330 Q600 330 610 360 L610 440 Q600 470 560 470 L160 470 Z"),
    // três pontos de moldagem
    arrow(360, 250, 360, 318), arrow(200, 540, 200, 482), arrow(520, 540, 520, 482),
    text(360, 232, "moldagem em três pontos", { size: 26, anchor: "middle", color: C.accent, weight: 700 }),
    label(80, 640, "a palma molda — nunca a ponta dos dedos\n(ponto de pressão = úlcera)", { size: 25 }),
    label(640, 560, "livres: MF (prega palmar) e cotovelo\nchecar pulso, cor e sensibilidade\nantes de liberar", { size: 25, to: [628, 445] }),
    // bivalve: linhas de corte
    panel(760, 100, 400, 330, "Feito no dia? Bivalvar"),
    limb(800, 280, 1100, 280, 100), plaster("M810 225 L1100 225 L1100 335 L810 335 Z"),
    anim("flow", { dur: 1.5 }, line(800, 280, 1110, 280, { stroke: C.alarm, sw: 4, dash: "14 10" }), line(800, 225, 800, 335, { stroke: C.alarm, sw: 4, dash: "14 10" })),
    caption(790, 400, "cortar dos dois lados e abrir\no algodão até a pele", 24),
  ], { title: "Gesso circular" }) },

  // 4. Bloqueio de hematoma
  { n: 4, draw: () => svg([
    title("Bloqueio de hematoma: anestesiar dentro da fratura"),
    // antebraço dorsal, rádio com fratura distal, agulha entra pelo dorso no foco
    limb(120, 460, 600, 460, 150), hand(700, 460, 0, 1.45, { flex: 0.15 }),
    bone(160, 440, 560, 440, 44), bone(170, 500, 560, 500, 30), fracture(160, 440, 560, 440, 0.86, 44),
    path("M486 400 L530 400 L520 470 L492 470 Z", { fill: C.blood, stroke: "none", opacity: 0.35 }),
    syringe(506, 428, 70, { len: 120, barrel: 150, fillLiquid: C.blood, aspirate: true }),
    label(80, 700, "1. palpar o degrau no dorso (foco da fratura)\n2. assepsia; agulha 22–25G perpendicular, sentir entrar no foco\n3. aspirar sangue escuro = está no hematoma\n4. injetar lidocaína 1–2% sem vasoconstritor, 5–10 mL; esperar 5–10 min", { size: 25 }),
    label(820, 150, "sangue do hematoma\nna seringa confirma", { size: 26, to: [548, 300] }),
    text(1150, 600, "não usar se a pele sobre o foco", { size: 24, anchor: "end", color: C.alarm }), text(1150, 630, "estiver ferida (exposta) ou infectada", { size: 24, anchor: "end", color: C.alarm }),
  ], { title: "Bloqueio de hematoma" }) },

  // 5. Bloqueio digital
  { n: 5, draw: () => svg([
    title("Bloqueio digital: dois lados, pela base do dedo"),
    // mão dorsal grande, dedo indicador com agulha de cada lado na base
    g('transform="translate(400 560) rotate(-90) scale(2.4)"', hand(0, 0, 0, 1, { flex: 0 })),
    // dedo em off=-12 → x = 400 - 12*2.4 = 371; base da falange proximal ≈ y 545
    syringe(344, 540, 55, { len: 120, barrel: 140 }), syringe(398, 540, 125, { len: 120, barrel: 140 }),
    dot(344, 540, 9), dot(398, 540, 9),
    label(700, 180, "agulha pelo dorso, na base da falange\nproximal, até quase a palma;\n1–2 mL de cada lado do osso\n(os nervos digitais são palmares)", { size: 25, to: [404, 540] }),
    label(700, 380, "repetir do outro lado do dedo", { size: 25, to: [340, 540] }),
    bullets(700, 480, ["lidocaína 1–2% SEM vasoconstritor", "esperar 5–10 min antes de testar", "pouco volume: muito líquido garroteia", "polegar e hálux: igual, 4 pontos se preciso"], { size: 25 }),
  ], { title: "Bloqueio digital" }) },

  // 6. Bloqueio da fáscia ilíaca
  { n: 6, draw: () => svg([
    title("Bloqueio da fáscia ilíaca: ponto e os dois \"pops\""),
    panel(40, 90, 620, 680, "Onde furar"),
    // pelve de frente: EIAS esquerda/direita, tubérculo púbico, linha
    path("M120 240 Q180 160 300 200 Q360 230 420 200 Q540 160 600 240 Q560 330 480 360 Q420 420 360 520 Q300 420 240 360 Q160 330 120 240 Z", { fill: C.bone }),
    dot(150, 250, 11, C.line), dot(360, 440, 11, C.line), text(90, 230, "EIAS", { size: 26, weight: 700 }), text(380, 470, "tubérculo púbico", { size: 26, weight: 700 }),
    anim("flow", { dur: 2 }, line(150, 250, 360, 440, { stroke: C.accent, sw: 4, dash: "10 8" })), dot(220, 313, 8), dot(290, 377, 8),
    text(205, 300, "⅓", { size: 24, anchor: "end", color: C.accent }), text(240, 345, "⅓", { size: 24, color: C.accent }),
    target(232, 346, 16), arrow(232, 346, 232, 362, { sw: 1 }),
    label(80, 600, "1 cm abaixo da junção do terço lateral\ncom o terço médio da linha EIAS → púbis", { size: 25, to: [232, 346] }),
    caption(80, 690, "longe da artéria femoral (terço medial)"),
    panel(690, 90, 470, 680, "Em corte: dois pops"),
    rect(720, 330, 410, 60, { fill: C.skin, stroke: C.line, sw: 3 }), rect(720, 390, 410, 50, { fill: "#f7e9c9", stroke: C.line, sw: 3 }),
    line(720, 440, 1130, 440, { sw: 6 }), rect(720, 440, 410, 60, { fill: "#e4b0a0", stroke: C.line, sw: 3 }), line(720, 500, 1130, 500, { sw: 6 }), rect(720, 500, 410, 120, { fill: "#d9a090", stroke: C.line, sw: 3 }),
    text(735, 368, "pele e subcutâneo", { size: 22 }), text(735, 423, "tecido gorduroso", { size: 22 }), text(735, 478, "sartório / TFL", { size: 22 }), text(735, 560, "iliopsoas — o anestésico\nse espalha por cima dele", { size: 22 }),
    text(1120, 432, "fáscia lata · pop 1", { size: 22, anchor: "end", weight: 700, color: C.accent }), text(1120, 492, "fáscia ilíaca · pop 2", { size: 22, anchor: "end", weight: 700, color: C.accent }),
    anim("enter2", { dx: "0px", dy: "-60px" }, syringe(930, 505, 90, { len: 200, barrel: 110, depth: 0 })), anim("in3", {}, path("M870 505 Q930 540 990 505", { fill: C.accent2, stroke: C.accent, sw: 3, opacity: 0.8 })),
    caption(720, 668, "agulha romba, perpendicular;\n30–40 mL (ropivacaína 0,375% ou\nlidocaína 1%, dose por kg); 15–20 min", 23),
  ], { title: "Bloqueio da fáscia ilíaca" }) },

  // 7. Sedação para redução
  { n: 7, draw: () => svg([
    title("Sedação para reduzir: monitor, segunda pessoa, via aérea"),
    bed(120, 520, 760, 40),
    person({ head: [220, 470], neck: [280, 490], hip: [620, 490], hipL: [620, 490], kneeL: [760, 470], ankleL: [860, 500], shoulderL: [300, 490], elbowL: [420, 470], handL: [520, 500] }),
    // monitor
    rect(900, 140, 260, 200, { fill: C.film, sw: 4, rx: 10 }), anim("draw", { dur: 3 }, path("M920 250 L960 250 L975 200 L990 300 L1005 250 L1060 250 L1075 215 L1090 285 L1100 250 L1140 250", { stroke: "#7ee0a0", sw: 3, extra: 'pathLength="1" stroke-dasharray="1"' })),
    text(920, 180, "SpO₂ 98   FC 72", { size: 22, color: "#cfd6e3" }), text(920, 320, "PA 128/80   EtCO₂ 38", { size: 22, color: "#cfd6e3" }),
    line(900, 340, 760, 470, { stroke: C.metal, sw: 3 }), circle(770, 470, 10, { fill: C.metal }),
    // segunda pessoa com bolsa-válvula-máscara na cabeceira
    person({ head: [80, 300], neck: [80, 345], hip: [80, 480], shoulderL: [95, 350], elbowL: [150, 400], handL: [190, 440] }, { cloth: C.cloth2 }),
    pivot(200, 445, "squeeze", { dur: 3 }, circle(200, 445, 34, { fill: C.cloth, sw: 4 })), path("M232 445 Q260 420 270 455 Q262 480 232 468 Z", { fill: C.metal }),
    line(80, 480, 80, 560, { sw: 8 }),
    bullets(120, 630, ["jejum e via aérea avaliados · consentimento", "oxigênio, aspirador, bolsa-válvula-máscara, cânulas", "monitor contínuo (SpO₂, FC, PA, capnografia se houver)", "quem reduz não é quem seda: segunda pessoa só na via aérea"], { size: 24, gap: 36 }),
  ], { title: "Sedação para redução" }) },

  // 8. Punção e infiltração do joelho — via superolateral
  { n: 8, draw: () => svg([
    title("Joelho, via superolateral: 1 cm acima e lateral à patela, agulha por baixo dela"),
    // joelho de frente (direito), estendido
    limb(420, 190, 420, 320, 190), limb(420, 480, 420, 700, 160),
    path("M330 330 Q420 300 510 330 Q530 420 420 470 Q310 420 330 330 Z", { fill: C.skin2, stroke: "none" }),
    path("M370 320 Q420 290 470 320 Q488 380 420 420 Q352 380 370 320 Z", { fill: C.bone }), text(420, 372, "patela", { size: 22, anchor: "middle" }),
    target(515, 300, 14), syringe(515, 300, 205, { len: 100, barrel: 150 }),
    arrow(500, 310, 440, 345, { sw: 4, color: C.alarm }),
    label(640, 200, "ponto: 1 cm acima e 1 cm lateral\nao canto superolateral da patela", { size: 25, to: [515, 300] }),
    label(640, 320, "agulha 21G, 45° para o centro,\npor baixo da patela (recesso suprapatelar)", { size: 25 }),
    bullets(640, 440, ["joelho estendido, quadríceps relaxado", "aspirar primeiro: líquido para análise", "derrame grande: empurrar o líquido com a outra mão", "infiltrar só depois de aspirar; não se houver infecção"], { size: 24, gap: 38 }),
    caption(640, 660, "falhou? deslize a agulha lateralmente sob a patela;\nse bater no osso, recuar e angular mais"),
  ], { title: "Punção do joelho" }) },

  // 9. Infiltração subacromial — via posterior
  { n: 9, draw: () => svg([
    title("Subacromial, via posterior: abaixo do ângulo do acrômio, mirando o coracoide"),
    // ombro visto de trás (direito): escápula, acrômio, úmero
    path("M260 250 Q400 180 560 240 L600 300 Q540 330 520 420 L480 600 Q400 640 330 560 L250 420 Z", { fill: C.bone }),
    path("M560 240 Q640 230 680 270 L690 300 L600 300 Z", { fill: C.bone }), text(610, 285, "acrômio", { size: 22, anchor: "middle" }),
    limb(640, 320, 700, 700, 150), circle(650, 330, 70, { fill: C.bone }),
    target(620, 360, 14), syringe(620, 360, 160, { len: 110, barrel: 150 }),
    arrow(600, 350, 540, 300, { sw: 4, color: C.alarm, marker: "ahr" }),
    label(760, 200, "ângulo posterolateral do acrômio:\n2 cm abaixo e 1 cm medial", { size: 25, to: [620, 360] }),
    label(760, 320, "agulha para a frente, levemente\npara cima e medial, na direção\ndo processo coracoide", { size: 25 }),
    bullets(760, 480, ["5–8 mL (triancinolona 40 mg + lidocaína)", "entrou fácil = espaço certo (bursa)", "resistência = tendão: recuar e reangular", "no máximo 3 por ano"], { size: 24, gap: 38 }),
  ], { title: "Infiltração subacromial" }) },

  // 10. Infiltração do túnel do carpo
  { n: 10, draw: () => svg([
    title("Túnel do carpo: ulnar ao palmar longo, 30°, agulha para a palma"),
    // antebraço e palma vista volar, punho no meio
    limb(100, 520, 420, 520, 150), hand(540, 520, 0, 1.2, { flex: 0 }),
    // tendão do palmar longo e prega do punho
    line(200, 512, 470, 512, { stroke: C.skin2, sw: 16 }), text(200, 486, "palmar longo", { size: 22 }),
    line(450, 430, 450, 610, { sw: 3, dash: "8 6" }), text(450, 640, "prega proximal do punho", { size: 22, anchor: "middle", color: C.muted }),
    target(440, 548, 14), syringe(440, 548, 40, { len: 110, barrel: 140 }),
    label(660, 170, "ponto: na prega proximal do punho,\nlogo ulnar ao palmar longo\n(feche o punho para vê-lo)", { size: 25, to: [440, 548] }),
    label(660, 310, "agulha 25G a 30°, apontando\npara o dedo médio; 1–2 cm", { size: 25 }),
    bullets(720, 430, ["parestesia ao entrar = no nervo: recuar", "sem resistência: 1 mL corticoide\n   + 1 mL lidocaína", "sem palmar longo? 1 cm ulnar à linha média", "tala noturna depois; alívio em dias"], { size: 23, gap: 40 }),
  ], { title: "Infiltração do túnel do carpo" }) },

  // 11. Dedo em gatilho (polia A1) e De Quervain
  { n: 11, draw: () => svg([
    title("Dedo em gatilho (polia A1) e De Quervain: na bainha, não no tendão"),
    panel(40, 90, 560, 680, "Polia A1"),
    g('transform="translate(320 480) rotate(-90) scale(1.7)"', hand(0, 0, 0, 1, { flex: 0 })),
    line(150, 466, 470, 466, { sw: 3, dash: "8 6" }), text(475, 474, "prega palmar\ndistal", { size: 20, color: C.muted }),
    target(300, 462, 12), syringe(300, 462, 125, { len: 100, barrel: 130 }),
    label(70, 650, "nódulo na prega palmar distal (sobre a MF);\nagulha 25G a 45°, distal → proximal, na bainha:\nsem resistência, o dedo se move com o líquido", { size: 23 }),
    panel(620, 90, 540, 680, "De Quervain"),
    // punho radial de lado: estiloide e os dois tendões
    limb(680, 420, 960, 420, 140), hand(1040, 420, 0, 1.05, { flex: 0.2 }),
    path("M700 380 L940 380", { stroke: C.skin2, sw: 14 }), path("M700 400 L940 400", { stroke: C.skin2, sw: 14 }),
    circle(930, 390, 28, { fill: C.bone, sw: 3 }), label(700, 330, "estiloide do rádio", { size: 22, to: [930, 372] }),
    target(900, 390, 12), syringe(900, 390, 15, { len: 100, barrel: 120 }),
    label(650, 620, "1º compartimento (APL + ECP) sobre a\nestiloide; agulha quase paralela ao tendão,\nproximal, 1 mL + 1 mL; ver o líquido\ncorrer ao longo da bainha", { size: 23 }),
  ], { title: "Infiltração do gatilho e De Quervain" }) },

  // 12. Infiltração peritrocantérica
  { n: 12, draw: () => svg([
    title("Peritrocantérica: decúbito lateral, no ponto de dor sobre o trocânter, até o osso e em leque"),
    bed(60, 640, 620, 30),
    // quadril e coxa de lado (paciente deitado sobre o outro lado, dor para cima)
    path("M90 620 Q120 380 300 360 L560 380 Q640 400 640 500 L640 640 L90 640 Z", { fill: C.cloth }),
    path("M180 400 Q220 330 320 330 L560 345 Q600 370 600 420 Q600 470 560 480 L320 470 Q220 470 180 400 Z", { fill: C.skin }),
    circle(400, 400, 44, { fill: C.bone, sw: 4 }), pivot(400, 400, "pulse", { dur: 2.5 }, circle(400, 400, 60, { fill: "none", stroke: C.accent, sw: 4, extra: 'stroke-dasharray="12 10"' })),
    label(120, 560, "trocânter maior: o ponto\nmais doloroso à palpação", { size: 22, to: [372, 420] }),
    target(400, 360, 12), syringe(400, 360, 90, { len: 120, barrel: 130 }),
    anim("in3", {}, path("M400 360 L372 300 M400 360 L400 290 M400 360 L428 300", { stroke: C.accent, sw: 3, dash: "8 6" })),
    text(470, 300, "em leque", { size: 22, color: C.accent, weight: 700 }),
    bullets(720, 160, ["deitado de lado, dor para cima,\n   joelhos fletidos", "palpar o ponto mais doloroso\n   sobre o trocânter", "agulha 21G perpendicular até\n   tocar o osso; recuar 2 mm", "40 mg triancinolona + 4–6 mL\n   lidocaína, em leque"], { size: 24, gap: 44 }),
    caption(720, 560, "dor pode piorar 2–3 dias (corticoide);\nmelhora em 1 semana.\nNão repetir antes de 3 meses.", 22),
  ], { title: "Infiltração peritrocantérica" }) },

  // 13. Profilaxia do tétano (ferida de alto risco)
  { n: 13, draw: () => svg([
    title("Tétano na fratura exposta (ferida de alto risco): o que dar hoje"),
    rect(60, 120, 1080, 90, { fill: C.cloth, sw: 3, rx: 12 }), text(600, 176, "Quantas doses de vacina antitetânica na vida? Última quando?", { size: 30, anchor: "middle", weight: 700 }),
    // três colunas
    ...[["3 doses ou mais\núltima < 5 anos", "NADA", "nem vacina, nem soro", "#2f6b4f"], ["3 doses ou mais\núltima há 5 anos ou mais", "dT", "1 dose de reforço agora", C.accent], ["menos de 3 doses,\nnão sabe ou nenhuma", "dT + IGHAT", "vacina agora (completar\no esquema) + imunoglobulina\n250 UI IM em outro local", C.alarm]].map(([q, a, d, color], i) => {
      const x = 60 + i * 370;
      return [spotlight(x - 8, 252, 356, 396, i, 3), arrow(x + 170, 215, x + 170, 260, { color: C.line, marker: "ahn", sw: 4 }), rect(x, 260, 340, 110, { fill: C.paper, sw: 3, rx: 12 }), caption(x + 20, 302, q, 26),
        arrow(x + 170, 372, x + 170, 410, { color: C.line, marker: "ahn", sw: 4 }), rect(x, 410, 340, 230, { fill: color, stroke: color, sw: 3, rx: 12 }), text(x + 170, 470, a, { size: 44, anchor: "middle", weight: 800, color: C.paper }),
        String(d).split("\n").map((l, k) => text(x + 170, 520 + k * 32, l, { size: 24, anchor: "middle", color: C.paper }))].join("\n");
    }),
    caption(60, 700, "IGHAT também, com qualquer história vacinal: imunodeprimido, desnutrido grave, idoso ou ferida que não terá o cuidado adequado (MS).\nSem IGHAT disponível: soro antitetânico 5.000 UI após teste. Registrar na ficha e no cartão."),
  ], { title: "Profilaxia do tétano" }) },
];
