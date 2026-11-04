// Sprites 14–25: urgências do plantão (talas, tração, reduções de quadril e tornozelo,
// tipoia, cinta pélvica), infiltração glenoumeral, luxação do ombro e Colles.
import * as L from "./lib.mjs";
const { C, svg, g, path, circle, rect, line, dot, text, label, title, caption, step, panel, arrow, arc, limb, limbPoly, chain, bone, fracture, hand, foot, head, person, plaster, cotton, bandage, syringe, needle, film, xbone, target, bed, check, bullets, anim, pivot, along, spotlight } = L;

export const PART2 = [
  // 14. Tala de alinhamento da perna (fratura de tíbia)
  { n: 14, draw: () => svg([
    title("Tala longa de perna: alinhar com tração e imobilizar da coxa ao pé"),
    anim("in1", {}, cotton("M300 150 L330 150 L330 640 Q330 664 360 668 L540 674 L540 700 L350 694 Q296 688 296 640 Z")),
    anim("in2", {}, plaster("M262 150 L296 150 L296 642 Q296 696 350 702 L546 708 L546 746 L340 740 Q262 730 262 650 Z")),
    chain([{ pts: [[380, 150], [380, 360]], w: 150 }, { pts: [[380, 360], [380, 600]], w: 125 }]), foot(380, 640, 0, 1.15),
    fracture(380, 360, 380, 600, 0.5, 125), path("M340 440 L420 440", { stroke: C.alarm, sw: 2, dash: "6 6" }),
    anim("in3", {}, bandage(380, 180, 380, 590, 165, 10)),
    arrow(380, 760, 380, 712, { sw: 8 }), text(430, 760, "tração suave e contínua no calcanhar", { size: 24, color: C.accent, weight: 700 }),
    label(640, 150, "1. analgesia (bloqueio ou sedação) antes\n2. ajudante segura a coxa; você traciona pelo\n   calcanhar e corrige a angulação olhando o eixo\n3. tala posterior da raiz da coxa ao pé,\n   joelho em leve flexão (10–20°), tornozelo 90°\n4. atadura sem apertar; checar pulso pedioso e\n   sensibilidade antes e depois\n5. raio-X de controle com a tala", { size: 24 }),
    caption(640, 560, "exposta? antibiótico e curativo primeiro, depois a tala.\nDor desproporcional após a tala = síndrome compartimental:\nabrir tudo."),
  ], { title: "Tala de alinhamento da perna" }) },

  // 15. Bivalvar o gesso e abrir tudo até a pele
  { n: 15, draw: () => svg([
    title("Gesso apertado: bivalvar, abrir o algodão até a pele, elevar e reavaliar"),
    panel(40, 90, 700, 680, "Os dois cortes"),
    limb(110, 420, 520, 420, 120), hand(620, 420, 0, 1.25, { flex: 0.3 }),
    plaster("M120 352 L520 352 Q560 352 570 380 L570 460 Q560 488 520 488 L120 488 Z"),
    anim("flow", { dur: 1.5 }, line(100, 352, 580, 352, { stroke: C.alarm, sw: 5, dash: "16 10" }), line(100, 488, 580, 488, { stroke: C.alarm, sw: 5, dash: "16 10" })),
    // serra oscilante: vibra e percorre a linha de corte
    anim("travel", { dx: "-250px", dy: "0px" }, pivot(420, 330, "buzz", {}, g('transform="translate(420 300)"', rect(-10, -120, 110, 60, { fill: C.metal, sw: 3, rx: 10 }), rect(-16, -70, 32, 60, { fill: C.cloth2, sw: 3 }), circle(0, 30, 34, { fill: C.paper, sw: 4 }), circle(0, 30, 34, { fill: "none", stroke: C.line, sw: 4, extra: 'stroke-dasharray="6 6"' })))),
    text(545, 250, "serra oscilante: só vibra,\nnão corta a pele", { size: 22, color: C.muted }),
    arrow(320, 320, 320, 350, { sw: 5 }), arrow(320, 600, 320, 560, { sw: 5 }), text(320, 640, "abrir as duas metades", { size: 24, anchor: "middle", color: C.accent, weight: 700 }),
    caption(70, 700, "cortar os dois lados (radial e ulnar)\nao longo de todo o gesso", 22),
    panel(760, 90, 400, 680, "Em corte"),
    circle(960, 400, 150, { fill: C.plaster, sw: 5 }), circle(960, 400, 118, { fill: C.cotton, sw: 3 }), circle(960, 400, 90, { fill: C.skin, sw: 5 }),
    anim("blink", { dur: 1.5 }, line(810, 400, 870, 400, { stroke: C.alarm, sw: 8 }), line(1050, 400, 1110, 400, { stroke: C.alarm, sw: 8 })),
    arrow(960, 560, 960, 500, { sw: 5 }), text(960, 600, "cortar também o algodão\ne a malha, até a pele", { size: 22, anchor: "middle", color: C.accent, weight: 700 }),
    caption(790, 700, "gesso só aberto de um lado\nnão alivia pressão"),
  ], { title: "Bivalvar o gesso" }) },

  // 16. Tração cutânea do fêmur
  { n: 16, draw: () => svg([
    title("Tração cutânea: esparadrapo nas laterais, barra no pé, peso de 2–4 kg"),
    bed(100, 520, 760, 36),
    person({ head: [190, 460], neck: [250, 480], hip: [520, 480] }),
    anim("nudge", { dx: "9px", dy: "0px", dur: 3 }, chain([{ pts: [[520, 480], [720, 470]], w: 110 }, { pts: [[720, 470], [880, 475]], w: 90 }]), foot(890, 470, 90, 0.9),
      rect(540, 408, 330, 22, { fill: C.cloth, sw: 3, rx: 4 }), rect(540, 515, 330, 22, { fill: C.cloth, sw: 3, rx: 4 }),
      rect(900, 400, 18, 150, { fill: C.cloth2, sw: 3, rx: 4 }), bandage(560, 472, 860, 472, 125, 9)),
    line(909, 475, 1040, 475, { sw: 4 }), circle(1040, 475, 20, { fill: C.metal, sw: 4 }),
    anim("nudge", { dx: "0px", dy: "14px", dur: 3 }, line(1060, 475, 1060, 640, { sw: 4 }), rect(1030, 640, 60, 70, { fill: C.line, sw: 3, rx: 6 }), text(1060, 740, "2–4 kg", { size: 26, anchor: "middle", weight: 700 })),
    label(560, 350, "esparadrapo ou espuma adesiva dos dois\nlados, do joelho ao tornozelo; atadura", { size: 22, to: [700, 412] }),
    label(760, 660, "barra no pé, longe\ndo maléolo", { size: 22, to: [909, 545] }),
    bullets(80, 150, ["pele íntegra, sem úlcera; não no idoso de pele fina", "peso ~10% do corpo, nunca mais de 5 kg", "pulso, pele sob o esparadrapo e nervo fibular 2×/dia", "é analgesia até a cirurgia, não tratamento"], { size: 23, gap: 36 }),
  ], { title: "Tração cutânea" }) },

  // 17. Tala em pinça de confeiteiro (coaptação) do úmero
  { n: 17, draw: () => svg([
    title("Pinça de confeiteiro: tala em U da axila ao ombro, cotovelo a 90°, tipoia"),
    // tronco parcial (lado direito do paciente), braço pendente, cotovelo 90°
    path("M60 130 L380 130 L400 500 L60 520 Z", { fill: C.cloth }), text(120, 330, "tórax", { size: 24, color: C.muted }),
    anim("in1", {}, cotton("M416 200 L444 200 L444 540 Q444 600 500 606 L560 606 L600 180 L628 180 L588 630 L500 632 Q416 628 416 540 Z")),
    anim("in2", {}, plaster("M380 200 L412 200 L412 540 Q412 630 500 640 L592 640 L636 150 L668 150 L620 660 L500 672 Q380 662 380 540 Z")),
    chain([{ pts: [[520, 150], [520, 500]], w: 130 }, { pts: [[520, 500], [820, 500]], w: 110 }]), hand(910, 500, 0, 1.2, { flex: 0.3 }),
    anim("in3", {}, bandage(520, 190, 520, 490, 150, 8)),
    path("M540 130 Q700 120 740 500", { stroke: C.cloth2, sw: 18 }), path("M740 500 L860 500", { stroke: C.cloth2, sw: 60, cap: "butt" }), path("M740 500 L860 500", { stroke: C.line, sw: 64, cap: "butt" }), path("M740 500 L860 500", { stroke: C.cloth2, sw: 56, cap: "butt" }),
    label(700, 200, "a tala sobe por dentro (axila)\ne por fora até sobre o acrômio", { size: 24, to: [668, 160] }),
    label(700, 300, "12–15 camadas, 10–15 cm de largura;\nmoldar o U no cotovelo", { size: 24 }),
    bullets(700, 600, ["tipoia segura o antebraço (gravidade alinha)", "sem apoiar o braço: o peso faz a tração", "raio-X com a tala; nervo radial antes e depois", "trocar por brace funcional (Sarmiento) em 1–2 semanas"], { size: 23, gap: 36 }),
  ], { title: "Tala em pinça de confeiteiro" }) },

  // 18. Redução da luxação posterior do quadril — Allis
  { n: 18, draw: () => svg([
    title("Allis: paciente no chão ou maca baixa, quadril e joelho a 90°, tração vertical"),
    bed(60, 600, 760, 30),
    // paciente supino: cabeça à esquerda; perna luxada com quadril e joelho a 90°
    person({ head: [140, 540], neck: [200, 560], hip: [500, 560], hipL: [500, 560], kneeL: [680, 570], ankleL: [800, 575], shoulderL: [220, 560], elbowL: [350, 560], handL: [460, 570] }),
    anim("push", { dx: "0px", dy: "-34px" }, chain([{ pts: [[520, 560], [540, 330]], w: 110 }, { pts: [[540, 330], [740, 320]], w: 95 }]), foot(760, 320, 90, 0.9),
      // médico de pé por cima, mãos no joelho, puxando para cima
      person({ head: [640, 110], neck: [640, 148], hip: [640, 290], shoulderL: [612, 158], elbowL: [590, 240], handL: [560, 300], shoulderR: [668, 158], elbowR: [680, 240], handR: [640, 300] }, { cloth: C.cloth2, w: 32, headR: 30 })),
    arrow(450, 480, 450, 350, { sw: 10 }), text(430, 330, "tração vertical\ncontínua, sem\nsolavanco", { size: 24, anchor: "end", color: C.accent, weight: 700 }),
    arc(760, 440, 790, 390, 760, 350, { sw: 5 }), text(800, 410, "leve rotação\ne adução", { size: 21 }),
    arrow(360, 480, 360, 535, { sw: 7 }), text(360, 462, "ajudante fixa a pelve", { size: 20, anchor: "middle", weight: 700 }),
    bullets(880, 150, ["sedação profunda e analgesia", "você sobe na maca", "2–3 tentativas; falhou: CC", "depois: raio-X, nervo ciático,\n   perna estendida em tração leve"], { size: 22, gap: 40 }),
    caption(60, 720, "fratura do colo do fêmur associada? não tentar: vai para o centro cirúrgico", 22),
  ], { title: "Redução da luxação do quadril — Allis" }) },

  // 19. Redução da fratura-luxação do tornozelo
  { n: 19, draw: () => svg([
    title("Fratura-luxação do tornozelo: joelho a 90°, tração no calcanhar, desfazer o desvio"),
    bed(60, 330, 480, 30),
    chain([{ pts: [[120, 320], [420, 320]], w: 140 }, { pts: [[420, 320], [430, 560]], w: 115 }], { anim: { from: 1, cls: "push", vars: { dx: "0px", dy: "24px" } } }),
    anim("push", { dx: "0px", dy: "24px" }, pivot(430, 600, "swing", { a: "-16deg" }, foot(430, 600, 0, 1.1))),
    label(90, 220, "coxa apoiada na maca, joelho a 90°:\nrelaxa a panturrilha", { size: 22, to: [300, 290] }),
    // mão fixa a tíbia (seta para baixo), tração no calcanhar (seta para baixo), reverter o desvio (arco)
    arrow(560, 420, 490, 440, { sw: 7 }), text(575, 428, "uma mão fixa a tíbia", { size: 22 }),
    arrow(430, 740, 430, 690, { sw: 10 }), text(470, 735, "a outra traciona pelo calcanhar", { size: 22, weight: 700, color: C.accent }),
    arc(640, 560, 700, 620, 640, 680, { sw: 7, color: C.alarm, marker: "ahr" }), text(715, 610, "e desfaz o desvio: pé\npara o lado oposto\nao que saiu", { size: 22, color: C.alarm }),
    bullets(740, 150, ["pulso ou pele brancas: reduzir AGORA,\n   antes do raio-X", "sedação ou bloqueio de hematoma", "sente encaixar; a pele alivia na hora", "tala posterior + estribo a 90°", "raio-X de controle com a tala; elevar", "não reduz ou reluxa: centro cirúrgico"], { size: 23, gap: 44 }),
  ], { title: "Redução da fratura-luxação do tornozelo" }) },

  // 20. Tala posterior + estribo (U) do tornozelo
  { n: 20, draw: () => svg([
    title("Tornozelo: tala posterior + estribo em U, a 90°"),
    panel(40, 90, 540, 680, "De lado: tala posterior"),
    anim("in1", {}, cotton("M232 180 L256 180 L256 560 Q256 586 286 590 L470 596 L470 622 L278 616 Q228 610 228 560 Z")),
    anim("in2", {}, plaster("M196 180 L228 180 L228 562 Q228 614 282 620 L476 626 L476 664 L270 656 Q196 646 196 570 Z")),
    limb(310, 180, 310, 520, 115), foot(310, 560, 0, 1.1),
    anim("in3", {}, bandage(310, 210, 310, 510, 135, 7)),
    label(70, 700, "do pé (ponta dos dedos) até 2 dedos abaixo\ndo joelho; 12–15 camadas", { size: 23 }),
    panel(600, 90, 560, 680, "De frente: estribo em U"),
    limb(880, 180, 880, 540, 120), path("M800 540 Q880 700 960 540 L960 600 Q880 690 800 600 Z", { fill: C.skin }),
    anim("in2", {}, plaster("M780 200 L812 200 L812 560 Q812 646 880 650 Q948 646 948 560 L948 200 L980 200 L980 570 Q980 684 880 690 Q780 684 780 570 Z")),
    anim("in3", {}, bandage(880, 230, 880, 530, 140, 7)),
    label(620, 700, "o U passa por baixo do calcanhar e sobe\npelos dois lados: trava a inversão/eversão", { size: 23 }),
    arrow(1060, 420, 1000, 420, { sw: 5 }), text(1065, 400, "U medial\ne lateral", { size: 22 }),
  ], { title: "Tala posterior e estribo do tornozelo" }) },

  // 21. Tipoia e o programa de movimento precoce
  { n: 21, draw: () => svg([
    title("Úmero proximal: tipoia e movimento precoce (pêndulo de Codman)"),
    panel(40, 90, 540, 680, "Tipoia"),
    person({ head: [300, 170], neck: [300, 215], hip: [300, 480], hipL: [280, 480], kneeL: [270, 620], ankleL: [268, 740], hipR: [320, 480], kneeR: [330, 620], ankleR: [332, 740], shoulderL: [250, 225], elbowL: [230, 360], handL: [330, 390], shoulderR: [350, 225], elbowR: [380, 360], handR: [380, 470] }, { w: 40 }),
    path("M330 230 Q250 300 190 370 L230 420 Q300 400 350 400 L360 360 Z", { fill: C.cloth2, stroke: C.line, sw: 4 }), path("M250 232 Q300 240 345 232", { stroke: C.cloth2, sw: 14 }),
    label(70, 620, "tipoia simples 1–2 semanas; sair dela\nvárias vezes ao dia para o cotovelo,\no punho e a mão se mexerem", { size: 23 }),
    panel(600, 90, 560, 680, "Pêndulo de Codman (desde a 1ª semana)"),
    // inclinado para a frente, apoiado na mesa com a mão boa, braço pendente
    rect(640, 420, 160, 20, { fill: C.cloth2, sw: 3 }), line(660, 440, 660, 600, { sw: 6 }), line(780, 440, 780, 600, { sw: 6 }),
    person({ head: [930, 200], neck: [890, 240], hip: [1000, 420], hipL: [1000, 420], kneeL: [1010, 580], ankleL: [1010, 720], shoulderL: [880, 250], elbowL: [780, 340], handL: [720, 420] }, { w: 40 }),
    // o braço pendente balança como um pêndulo
    chain([{ pts: [[900, 250], [900, 420]], w: 36, fill: C.cloth }, { pts: [[900, 420], [900, 560]], w: 36 }], { anim: { from: 0, cls: "pendulum", vars: { a: "14deg", dur: 2.4 }, pivot: [900, 250] } }),
    arc(860, 600, 900, 660, 940, 600, { sw: 6 }), arc(940, 620, 900, 680, 860, 620, { sw: 6 }),
    label(630, 700, "inclinar, apoiar a mão boa, deixar o braço\npendurado e balançar em círculos pequenos,\n2–3 min, 3–4×/dia; sem força, sem dor", { size: 23 }),
  ], { title: "Tipoia e pêndulo de Codman" }) },

  // 22. Cinta pélvica (ou lençol) na pelve instável
  { n: 22, draw: () => svg([
    title("Pelve instável: cinta ou lençol no nível dos trocânteres, não nas cristas"),
    // pelve de frente (esqueleto) com fêmures
    path("M240 200 Q300 120 420 150 Q500 180 560 150 Q680 120 740 200 Q700 300 620 340 Q560 380 540 440 L440 440 Q420 380 360 340 Q280 300 240 200 Z", { fill: C.bone }),
    limb(400, 470, 330, 760, 90), limb(580, 470, 650, 760, 90), circle(400, 470, 44, { fill: C.bone }), circle(580, 470, 44, { fill: C.bone }),
    circle(330, 480, 26, { fill: C.bone }), circle(650, 480, 26, { fill: C.bone }), text(300, 440, "trocânter", { size: 20, anchor: "end" }), text(680, 440, "trocânter", { size: 20 }),
    dot(260, 200, 9, C.alarm), dot(720, 200, 9, C.alarm), text(230, 180, "crista ilíaca ✗", { size: 22, anchor: "end", color: C.alarm }), text(750, 180, "✗ crista ilíaca", { size: 22, color: C.alarm }),
    // lençol
    pivot(490, 495, "tighten", {}, path("M240 450 L740 450 L740 540 L240 540 Z", { fill: C.cloth, stroke: C.line, sw: 5 }), path("M240 450 L740 450 L740 540 L240 540 Z", { fill: "url(#cloth)", stroke: "none" }),
      path("M470 450 L450 540 M510 450 L530 540", { stroke: C.line, sw: 4 }), rect(455, 480, 70, 30, { fill: C.metal, sw: 3, rx: 6 })), text(490, 580, "torcer e prender (pinças ou nó)", { size: 22, anchor: "middle", color: C.muted }),
    arrow(160, 495, 236, 495, { sw: 8 }), arrow(820, 495, 744, 495, { sw: 8 }),
    bullets(800, 250, ["lençol dobrado em 30 cm ou cinta comercial", "centro atrás, no nível dos trocânteres", "cruzar na frente, apertar firme, prender", "joelhos juntos com faixa (rotação interna)", "não retirar antes da tomografia/cirurgia", "pele a cada 4–6 h"], { size: 23, gap: 38 }),
    caption(800, 520, "pelve 'em livro aberto' (compressão\nAP): a cinta fecha o anel e reduz o\nsangramento venoso"),
  ], { title: "Cinta pélvica" }) },

  // 23. Infiltração intra-articular do ombro (glenoumeral) — via posterior
  { n: 23, draw: () => svg([
    title("Glenoumeral, via posterior: mesmo ponto, mais fundo, até a cápsula"),
    path("M260 250 Q400 180 560 240 L600 300 Q540 330 520 420 L480 600 Q400 640 330 560 L250 420 Z", { fill: C.bone }),
    path("M560 240 Q640 230 680 270 L690 300 L600 300 Z", { fill: C.bone }), text(610, 285, "acrômio", { size: 22, anchor: "middle" }),
    limb(640, 320, 700, 700, 150), circle(650, 330, 70, { fill: C.bone }),
    path("M585 300 Q600 350 580 400", { stroke: C.accent, sw: 4, dash: "8 6" }), text(560, 440, "glenoide", { size: 20, anchor: "end", color: C.accent }),
    target(620, 360, 14), syringe(620, 360, 160, { len: 150, barrel: 150, depth: 70 }),
    arrow(600, 352, 540, 300, { sw: 4, color: C.alarm, marker: "ahr" }),
    label(760, 200, "2 cm abaixo e 1 cm medial ao ângulo\nposterolateral do acrômio", { size: 25, to: [620, 360] }),
    label(760, 300, "agulha 21G longa (5 cm), para o\nprocesso coracoide; sente a cápsula\n'pop' e entra sem resistência", { size: 25 }),
    bullets(760, 480, ["capsulite: triancinolona 40 mg + 4–6 mL", "bateu no osso? é a cabeça ou a glenoide:\n   recuar e reangular medialmente", "pode aspirar líquido para confirmar", "fisioterapia nos dias seguintes"], { size: 24, gap: 42 }),
  ], { title: "Infiltração glenoumeral" }) },

  // 24. Redução da luxação anterior do ombro
  { n: 24, draw: () => svg([
    title("Luxação anterior do ombro: três manobras sem força"),
    panel(40, 90, 360, 680, "1 · Rotação externa"),
    // paciente supino (vista de cima): tronco, braço ao lado, cotovelo 90°, antebraço roda para fora
    path("M80 420 L300 420 L300 640 L80 640 Z", { fill: C.cloth, sw: 4 }), head(120, 700, 40),
    chain([{ pts: [[300, 460], [330, 600]], w: 60 }, { pts: [[330, 600], [330, 440]], w: 50 }], { anim: { from: 1, cls: "swing", vars: { a: "32deg" }, extra: hand(330, 400, -90, 0.7) } }),
    arc(330, 400, 400, 430, 380, 520, { sw: 6 }),
    label(60, 180, "deitado, cotovelo colado ao corpo\na 90°; rode o antebraço para fora\nbem devagar (1–2 min), parando\nquando doer; sem tração", { size: 21 }),
    caption(60, 320, "reduz a 70–110° de rotação externa;\nse não, levante o braço devagar\nem abdução (Milch)", 20),
    panel(420, 90, 360, 680, "2 · Cunningham"),
    // paciente sentado, médico sentado à frente; punho do paciente sobre o ombro do médico
    caption(440, 175, "paciente sentado, braço junto\nao corpo, cotovelo a 90°, a mão\ndele apoiada no seu ombro", 20),
    person({ head: [500, 290], neck: [500, 322], hip: [500, 500], hipL: [500, 500], kneeL: [560, 530], ankleL: [560, 650], shoulderL: [528, 332], elbowL: [560, 430], handL: [680, 385] }, { w: 30, headR: 30 }),
    person({ head: [720, 330], neck: [720, 360], hip: [720, 540], hipL: [720, 540], kneeL: [660, 580], ankleL: [660, 700], shoulderR: [694, 368], elbowR: [640, 410], handR: [585, 380] }, { w: 28, headR: 28, cloth: C.cloth2 }),
    arc(600, 350, 560, 345, 545, 380, { sw: 5 }),
    caption(440, 670, "massageie bíceps, trapézio e\ndeltoide 1–3 min: 'ombros para\ntrás, sente-se reto'; o ombro\nentra sozinho", 19),
    panel(800, 90, 360, 680, "3 · Tração-contratração"),
    bed(820, 520, 320, 24),
    person({ head: [860, 470], neck: [900, 480], hip: [1080, 485], shoulderL: [910, 480], elbowL: [1000, 400], handL: [1090, 330] }, { w: 34, headR: 32 }),
    path("M905 440 Q930 480 905 520", { stroke: C.cloth2, sw: 16 }), line(905, 430, 830, 300, { stroke: C.cloth2, sw: 14 }),
    arrow(1090, 330, 1140, 250, { sw: 8 }), arrow(850, 320, 800, 240, { sw: 8 }),
    caption(820, 175, "lençol no tórax, puxado pelo ajudante\nno sentido oposto; você traciona o\nbraço em leve abdução", 20),
    caption(820, 650, "tração contínua 2–5 min, sem\npuxão; sedação", 20),
  ], { title: "Redução da luxação do ombro" }) },

  // 25. Redução fechada do rádio distal (Colles) e tala
  { n: 25, draw: () => svg([
    title("Colles: tração, desfazer o dorso de garfo, flexão + desvio ulnar, tala"),
    panel(40, 90, 360, 680, "1 · A deformidade"), spotlight(40, 90, 360, 680, 0, 3), spotlight(420, 90, 360, 680, 1, 3), spotlight(800, 90, 360, 680, 2, 3),
    chain([{ pts: [[80, 400], [280, 400]], w: 110 }, { pts: [[280, 400], [330, 360], [400, 330]], w: 90 }]), hand(430, 320, -20, 0.95, { flex: 0.3 }),
    fracture(80, 400, 280, 400, 0.95, 110), text(70, 560, "fragmento distal para o dorso\n('dorso de garfo'): o raio-X\nde perfil mostra a angulação", { size: 21 }),
    panel(420, 90, 360, 680, "2 · A manobra"),
    limb(450, 420, 660, 420, 100), pivot(660, 420, "reduce", { dx: "22px", dy: "0px", a: "28deg" }, hand(740, 420, 0, 1.0, { flex: 0.2 })),
    arrow(500, 420, 440, 420, { sw: 8 }), text(445, 380, "ajudante: contratração", { size: 19 }),
    arrow(700, 420, 770, 420, { sw: 8 }), text(560, 500, "tração", { size: 19, anchor: "middle", weight: 700, color: C.accent }),
    arrow(640, 300, 640, 350, { sw: 8 }), text(640, 270, "polegares no dorso do fragmento:\nempurrar para a palma", { size: 19, anchor: "middle" }),
    arc(760, 480, 790, 540, 740, 580, { sw: 6 }), text(560, 600, "depois: flexão do punho\ne desvio ulnar", { size: 19 }),
    caption(440, 680, "bloqueio de hematoma ou sedação;\n1º desimpactar (tração + hiperextensão),\n2º reduzir, 3º manter", 19),
    panel(800, 90, 360, 680, "3 · A tala"),
    anim("in1", {}, cotton("M840 450 L1040 450 Q1080 450 1110 440 L1110 470 Q1080 480 1040 480 L840 480 Z")),
    anim("in2", {}, plaster("M850 480 L1040 480 Q1080 480 1115 470 L1115 508 Q1080 518 1040 518 L850 518 Z")),
    limb(850, 400, 1040, 400, 100), hand(1110, 420, 15, 0.95, { flex: 0.35 }), anim("in3", {}, bandage(860, 400, 1040, 400, 120, 6)),
    text(830, 590, "antebraquiopalmar (ou sugar-tong)\ncom punho em leve flexão e\ndesvio ulnar, 3 pontos de\nmoldagem; raio-X de controle;\nrever em 7 dias (perde a redução?)", { size: 19 }),
  ], { title: "Redução do rádio distal" }) },
];
