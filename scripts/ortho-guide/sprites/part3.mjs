// Sprites 26–37: cotovelo, mão e dedos, criança, patela e Aquiles.
import * as L from "./lib.mjs";
const { C, svg, g, path, circle, rect, line, dot, text, label, title, caption, step, panel, arrow, arc, limb, limbPoly, chain, bone, fracture, hand, foot, head, person, plaster, cotton, bandage, syringe, needle, film, xbone, target, bed, check, bullets, anim, pivot, along, spotlight } = L;

/** Dedo de perfil: segmentos (falanges) por pontos. */
const finger = (pts, w = 60) => limbPoly(pts, w);

export const PART3 = [
  // 26. Redução da luxação posterior do cotovelo
  { n: 26, draw: () => svg([
    title("Luxação do cotovelo: ajudante fixa o braço, tração no antebraço, polegar no olécrano"),
    bed(80, 560, 760, 30),
    path("M120 300 L360 300 L360 560 L120 560 Z", { fill: C.cloth, sw: 4 }), text(240, 440, "tórax", { size: 22, anchor: "middle", color: C.muted }),
    chain([{ pts: [[360, 420], [620, 420]], w: 130 }, { pts: [[620, 420], [900, 340]], w: 105 }], { anim: { from: 1, cls: "push", vars: along(620, 420, 900, 340, 26), extra: hand(980, 318, -16, 1.15, { flex: 0.2 }) } }),
    anim("push", { dx: "-20px", dy: "-24px" }, circle(650, 470, 36, { fill: C.bone })), text(650, 540, "olécrano saltado\npara trás", { size: 20, anchor: "middle", color: C.alarm }),
    arrow(480, 300, 480, 350, { sw: 8 }), arrow(480, 540, 480, 490, { sw: 8 }), text(480, 270, "ajudante fixa o úmero", { size: 22, anchor: "middle", weight: 700 }),
    arrow(960, 300, 1080, 265, { sw: 9 }), text(1000, 215, "tração no eixo do antebraço,\ncotovelo em leve flexão", { size: 21, anchor: "middle" }),
    arrow(690, 560, 660, 500, { sw: 8 }), text(760, 620, "seu polegar empurra o\nolécrano para a frente", { size: 21 }),
    caption(80, 700, "sedação; antes e depois: pulso radial, nervos mediano e ulnar; depois: fletir e estender para ver se é estável;\nraio-X; tala posterior a 90° por 7–10 dias e movimento cedo"),
  ], { title: "Redução da luxação do cotovelo" }) },

  // 27. Redução da fratura do colo do 5º metacarpo — Jahss — e tala em calha ulnar
  { n: 27, draw: () => svg([
    title("Fratura do boxeador: manobra de Jahss e calha ulnar"),
    panel(40, 90, 560, 680, "Jahss: MF e IFP a 90°"),
    // mão de perfil: metacarpo horizontal, falange proximal vertical para baixo, média horizontal
    chain([{ pts: [[100, 400], [360, 400]], w: 100 }, { pts: [[360, 400], [372, 540], [500, 560]], w: 62 }], { anim: { from: 1, cls: "push", vars: { dx: "0px", dy: "-18px" } } }), fracture(100, 400, 360, 400, 0.88, 100),
    arrow(372, 640, 372, 580, { sw: 9 }), text(372, 690, "empurrar a falange\nproximal para cima", { size: 22, anchor: "middle", color: C.accent, weight: 700 }),
    arrow(330, 290, 330, 340, { sw: 9 }), text(330, 236, "a outra mão fixa o metacarpo\ne empurra a cabeça para baixo", { size: 21, anchor: "middle" }),
    caption(70, 580, "bloqueio de hematoma ou do nervo ulnar;\naceita até 30–40° no 5º MC; fica\nreduzido só com a tala bem moldada", 20),
    panel(620, 90, 540, 680, "Calha ulnar"),
    anim("in2", {}, plaster("M1050 330 Q1110 300 1150 350 L1150 740 L1050 740 Z")),
    g('transform="translate(960 470) rotate(-90) scale(1.8)"', hand(0, 0, 0, 1, { flex: 0.25 })),
    limb(960, 560, 960, 740, 140), anim("in3", {}, bandage(960, 580, 960, 730, 160, 4)),
    anim("in2", {}, path("M968 330 Q1020 300 1052 340 L1052 560 L968 560 Z", { fill: C.plaster, opacity: 0.8 }), path("M968 330 Q1020 300 1052 340 L1052 560 L968 560 Z", { fill: "url(#hatch)", stroke: "none" })),
    label(640, 600, "da ponta dos dedos 4–5\nao terço proximal do\nantebraço, lado ulnar;\nMF 70–90°, IF em leve\nflexão, punho 20°", { size: 21 }),
    label(640, 160, "4º e 5º dedos juntos\ndentro da calha", { size: 21, to: [1075, 360] }),
  ], { title: "Manobra de Jahss e calha ulnar" }) },

  // 28. Buddy taping (sindactilia) e a posição segura da mão
  { n: 28, draw: () => svg([
    title("Buddy taping e a posição segura da mão"),
    panel(40, 90, 540, 680, "Buddy taping"),
    g('transform="translate(310 520) rotate(-90) scale(2.0)"', hand(0, 0, 0, 1, { flex: 0 })),
    anim("in1", {}, rect(222, 420, 120, 26, { fill: C.cloth2, sw: 3, rx: 4 })), anim("in2", {}, rect(222, 330, 120, 26, { fill: C.cloth2, sw: 3, rx: 4 })),
    label(70, 640, "esparadrapo na falange proximal e na\nmédia; deixar a IFP livre para dobrar;\ntrocar quando molhar; 3 semanas", { size: 22 }),
    arrow(400, 380, 350, 380, { sw: 5 }), text(405, 390, "articulação livre", { size: 20 }),
    panel(600, 90, 560, 680, "Posição segura (intrínseco-plus)"),
    chain([{ pts: [[640, 380], [860, 380]], w: 110 }, { pts: [[860, 380], [930, 340], [970, 440], [990, 540]], w: 48 }]),
    arc(930, 250, 1000, 280, 1000, 360, { sw: 5 }), text(1010, 250, "MF 70–90°", { size: 24, weight: 700, color: C.accent }),
    text(1010, 480, "IF estendidas", { size: 24, weight: 700, color: C.accent }), text(650, 300, "punho 20° extensão", { size: 24, weight: 700, color: C.accent }),
    label(630, 640, "ligamentos colaterais da MF ficam\nesticados: a mão não enrijece.\nQualquer tala de mão sai nessa posição", { size: 22 }),
  ], { title: "Buddy taping e posição segura" }) },

  // 29. Redução da luxação dorsal da interfalângica proximal
  { n: 29, draw: () => svg([
    title("Luxação dorsal da IFP: hiperestender um pouco, tracionar, empurrar a base para a palma"),
    panel(40, 90, 540, 680, "Como está"),
    finger([[90, 460], [320, 460]], 70), finger([[335, 400], [520, 390], [600, 400]], 60),
    arrow(380, 310, 380, 360, { sw: 7, color: C.alarm, marker: "ahr" }), text(380, 250, "falange média por cima\nda cabeça da proximal", { size: 21, anchor: "middle", color: C.alarm }),
    caption(70, 620, "bloqueio digital; raio-X antes se\npossível (fratura da base?)", 21),
    panel(600, 90, 560, 680, "A manobra"),
    chain([{ pts: [[650, 460], [880, 460]], w: 70 }, { pts: [[880, 460], [1060, 455], [1130, 460]], w: 60 }], { anim: { from: 1, cls: "reduce", vars: { dx: "22px", dy: "0px", a: "-14deg" } } }),
    step(1, 980, 300), arrow(1010, 300, 1100, 300, { sw: 7 }), text(980, 350, "tração no eixo", { size: 22, anchor: "middle" }),
    step(2, 760, 300), arc(790, 300, 860, 250, 920, 330, { sw: 6 }), text(820, 240, "leve hiperextensão", { size: 22, anchor: "middle" }),
    step(3, 900, 620), arrow(900, 590, 900, 500, { sw: 7 }), text(900, 680, "polegar empurra a base da\nfalange média para a palma", { size: 22, anchor: "middle" }),
    caption(620, 760, "depois: testar estabilidade, raio-X, buddy taping 3 semanas, mover cedo", 20),
  ], { title: "Redução da luxação da IFP" }) },

  // 30. Tala do dedo em martelo
  { n: 30, draw: () => svg([
    title("Dedo em martelo: tala com a IFD reta (ou leve hiperextensão), IFP livre, 6–8 semanas"),
    panel(40, 90, 540, 680, "A lesão"),
    chain([{ pts: [[90, 420], [330, 420], [500, 420]], w: 66 }, { pts: [[500, 420], [600, 500]], w: 56 }], { anim: { from: 1, cls: "swing", vars: { a: "-36deg" } } }),
    arrow(560, 300, 560, 380, { sw: 7, color: C.alarm, marker: "ahr" }), text(330, 250, "ponta cai: não estende\nativamente a IFD", { size: 22, color: C.alarm }),
    caption(70, 620, "raio-X: avulsão óssea > ⅓ da articulação\nou subluxação → cirurgião da mão", 21),
    panel(600, 90, 560, 680, "A tala"),
    chain([{ pts: [[650, 420], [890, 420], [1060, 420]], w: 66 }, { pts: [[1060, 420], [1130, 412]], w: 56 }]),
    anim("in1", {}, plaster("M990 360 L1150 352 L1150 386 L990 394 Z")), anim("in2", {}, rect(1000, 350, 150, 24, { fill: C.cloth2, sw: 3, rx: 4 }), rect(1000, 452, 150, 24, { fill: C.cloth2, sw: 3, rx: 4 })),
    arrow(900, 330, 900, 380, { sw: 5 }), text(900, 310, "IFP livre", { size: 22, anchor: "middle", weight: 700, color: C.accent }),
    label(630, 600, "tala dorsal (alumínio, Stack ou termoplástica)\nsó na IFD; nunca deixar a ponta dobrar —\nnem para lavar (trocar com o dedo apoiado\nna mesa); 6–8 semanas, depois mais 2–4\nsó à noite", { size: 21 }),
  ], { title: "Tala do dedo em martelo" }) },

  // 31. Trepanação do hematoma subungueal
  { n: 31, draw: () => svg([
    title("Hematoma subungueal: furar a unha para drenar"),
    // ponta do dedo vista de cima, grande
    path("M300 700 L300 300 Q300 160 450 160 Q600 160 600 300 L600 700 Z", { fill: C.skin }),
    path("M340 520 L340 280 Q340 200 450 200 Q560 200 560 280 L560 520 Q450 560 340 520 Z", { fill: "#f9efe3" }),
    anim("fade3", {}, path("M360 500 L360 330 Q380 240 450 260 Q520 240 540 330 L540 500 Q450 540 360 500 Z", { fill: C.blood, stroke: "none", opacity: 0.75 })),
    // clipe aquecido desce até a unha; depois o sangue sai
    anim("enter", { dx: "0px", dy: "-40px" }, g('transform="translate(450 330)"', line(0, 0, 0, -210, { stroke: C.metal, sw: 10 }), line(0, 0, 0, -40, { stroke: C.alarm, sw: 10 }), path("M0 -210 Q-40 -260 -70 -210 L-70 -120", { stroke: C.metal, sw: 10 }))),
    anim("in3", {}, path("M450 335 Q470 360 455 380", { stroke: C.blood, sw: 6 })),
    label(680, 200, "clipe de papel aberto, aquecido\nao rubro no isqueiro, apoiado\nsem força: derrete a unha", { size: 24, to: [455, 180] }),
    label(680, 360, "ou agulha 18G girando\ncomo uma broca", { size: 24 }),
    bullets(680, 480, ["até 48 h; ≥ 50% da unha ou muita dor", "sai sangue, alívio imediato", "sem anestesia (a unha não dói)", "fratura da falange? furo = exposta: antibiótico", "unha solta ou leito visível: reparar"], { size: 23, gap: 40 }),
  ], { title: "Trepanação do hematoma subungueal" }) },

  // 32. Reparo do leito ungueal
  { n: 32, draw: () => svg([
    title("Reparo do leito ungueal: tirar a unha, suturar o leito, devolver a unha como curativo"),
    ...[0, 1, 2].map((i) => {
      const x = 40 + i * 380;
      const tip = path(`M${x + 90} 680 L${x + 90} 330 Q${x + 90} 190 ${x + 190} 190 Q${x + 290} 190 ${x + 290} 330 L${x + 290} 680 Z`, { fill: C.skin });
      const bedShape = path(`M${x + 120} 520 L${x + 120} 300 Q${x + 120} 230 ${x + 190} 240 Q${x + 260} 230 ${x + 260} 300 L${x + 260} 520 Q${x + 190} 560 ${x + 120} 520 Z`, { fill: "#f2c9b8" });
      const lac = path(`M${x + 150} 300 L${x + 190} 350 L${x + 170} 400 L${x + 210} 460`, { stroke: C.alarm, sw: 5 });
      const parts = [panel(x, 90, 360, 680, ["1 · Retirar a unha", "2 · Suturar o leito", "3 · Unha de volta"][i]), spotlight(x, 90, 360, 680, i, 3), tip, bedShape];
      if (i === 0) parts.push(lac, pivot(x + 190, 300, "swing", { a: "-14deg" }, path(`M${x + 120} 300 L${x + 120} 160 Q${x + 190} 110 ${x + 260} 160 L${x + 260} 300 Q${x + 190} 330 ${x + 120} 300 Z`, { fill: "#f9efe3" }), g(`transform="translate(${x + 250} 150)"`, line(0, 0, 70, -40, { stroke: C.metal, sw: 10 }), line(0, 0, 10, 30, { stroke: C.metal, sw: 10 }))), caption(x + 20, 600, "bloqueio digital; descolar\ncom tesoura fina ou pinça,\nguardar a unha em soro", 19));
      if (i === 1) parts.push(lac, ...[0, 1, 2, 3].map((k) => anim(["in1", "in1", "in2", "in3"][k], {}, line(x + 140 + k * 20, 310 + k * 45, x + 200 + k * 10, 320 + k * 45, { stroke: C.line, sw: 3 }))), caption(x + 20, 600, "fio absorvível 6-0 (ou cola),\npontos simples, sem apertar;\nlavar bem antes", 19));
      if (i === 2) parts.push(path(`M${x + 120} 520 L${x + 120} 300 Q${x + 120} 230 ${x + 190} 240 Q${x + 260} 230 ${x + 260} 300 L${x + 260} 520 Q${x + 190} 560 ${x + 120} 520 Z`, { fill: "#f9efe3" }), line(x + 150, 260, x + 150, 230, { sw: 3 }), line(x + 230, 260, x + 230, 230, { sw: 3 }), text(x + 190, 215, "ponto no dobra", { size: 18, anchor: "middle", color: C.muted }), caption(x + 20, 600, "a unha (ou folha de alumínio)\nvolta sob a dobra como stent;\ncurativo 7 dias; a nova unha\nleva 3–6 meses", 19));
      return parts;
    }),
  ], { title: "Reparo do leito ungueal" }) },

  // 33. Gesso axilopalmar (acima do cotovelo) na criança
  { n: 33, draw: () => svg([
    title("Criança: gesso axilopalmar, cotovelo a 90°, antebraço neutro, dedos livres"),
    // criança de frente (pequena), braço direito (à esquerda da imagem) engessado
    person({ head: [460, 170], neck: [460, 215], hip: [460, 460], hipL: [440, 460], kneeL: [430, 600], ankleL: [428, 720], hipR: [480, 460], kneeR: [490, 600], ankleR: [492, 720], shoulderR: [505, 228], elbowR: [530, 370], handR: [540, 480] }, { w: 36, headR: 44 }),
    anim("in1", {}, cotton("M360 230 L420 230 L420 400 L560 400 L560 440 L395 440 L370 430 Z")),
    anim("in2", {}, plaster("M340 215 L420 215 L420 380 L560 380 L560 460 L380 460 Q338 440 338 400 Z")),
    chain([{ pts: [[410, 230], [395, 410]], w: 72 }, { pts: [[395, 410], [560, 410]], w: 62 }]), hand(600, 410, 0, 0.75, { flex: 0.25 }),
    path("M345 225 L360 225", { stroke: C.alarm, sw: 4 }), text(300, 190, "até a axila", { size: 20, anchor: "end" }),
    anim("in3", {}, bandage(410, 250, 400, 400, 90, 5), bandage(410, 410, 550, 410, 80, 5)),
    label(660, 200, "cotovelo a 90°, antebraço neutro\n(polegar para cima); até a prega\npalmar: MF livres", { size: 23, to: [562, 405] }),
    bullets(660, 380, ["acolchoar bem; moldar com a palma", "edema esperado hoje? fender ou bivalvar", "tipoia; braço elevado 48 h", "raio-X em 7 dias (tórus: não precisa)", "retirar em 3–4 semanas (menor que o adulto)"], { size: 22, gap: 38 }),
    caption(660, 620, "pais: dedos roxos, frios ou dor que não\npassa com analgésico = voltar na hora"),
  ], { title: "Gesso axilopalmar na criança" }) },

  // 34. Tala posterior do cotovelo na supracondiliana
  { n: 34, draw: () => svg([
    title("Supracondiliana: tala posterior de cotovelo a ≤ 90°, pulso antes e depois"),
    anim("in1", {}, cotton("M300 160 L330 160 L330 520 Q330 548 360 550 L720 556 L720 584 L350 578 Q296 572 296 520 Z")),
    anim("in2", {}, plaster("M262 160 L296 160 L296 522 Q296 580 352 586 L726 592 L726 632 L340 624 Q262 614 262 530 Z")),
    chain([{ pts: [[380, 160], [380, 500]], w: 120 }, { pts: [[380, 500], [700, 500]], w: 100 }]), hand(790, 500, 0, 1.15, { flex: 0.3 }),
    fracture(380, 160, 380, 500, 0.82, 120),
    anim("in3", {}, bandage(380, 190, 380, 490, 140, 7), bandage(400, 500, 690, 500, 120, 7)),
    arc(470, 420, 500, 470, 470, 520, { sw: 5 }), text(520, 440, "90° (menos se o\npulso enfraquece)", { size: 22, weight: 700, color: C.accent }),
    pivot(720, 540, "pulse", { dur: 1.2 }, dot(720, 540, 11, C.alarm)), label(640, 700, "pulso radial, enchimento capilar,\nmediano/radial/ulnar: antes e depois", { size: 22, to: [720, 540] }),
    bullets(800, 160, ["Gartland I: tala 3 semanas", "II e III: tala só para transportar,\n   cirurgia pela regulação hoje", "sem pulso e mão branca: reduzir\n   a flexão; não melhora = urgência", "elevar; raio-X com a tala"], { size: 22, gap: 44 }),
  ], { title: "Tala posterior do cotovelo" }) },

  // 35. Redução da pronação dolorosa
  { n: 35, draw: () => svg([
    title("Pronação dolorosa: hiperpronação (1ª escolha) ou supinação-flexão"),
    panel(40, 90, 560, 680, "Hiperpronação"),
    chain([{ pts: [[200, 180], [200, 420]], w: 70 }, { pts: [[200, 420], [440, 420]], w: 60 }]), pivot(440, 420, "flip", {}, hand(500, 420, 0, 0.8)),
    hand(200, 480, -90, 0.9), dot(230, 430, 10, C.accent), text(90, 540, "seu polegar sobre a cabeça do rádio", { size: 21 }),
    arc(520, 330, 560, 400, 500, 470, { sw: 7 }), text(320, 620, "segure o punho e gire o antebraço\npara dentro (palma para baixo), firme\ne rápido, até o fim; sente o clique", { size: 21, anchor: "middle" }),
    panel(620, 90, 540, 680, "Supinação-flexão"),
    chain([{ pts: [[760, 180], [760, 420]], w: 70 }, { pts: [[760, 420], [1000, 420]], w: 60 }], { anim: { from: 1, cls: "swing", vars: { a: "-50deg" }, extra: pivot(1000, 420, "flip", {}, hand(1060, 420, 0, 0.8)) } }),
    hand(760, 480, -90, 0.9), dot(790, 430, 10, C.accent),
    arc(1040, 480, 1090, 420, 1040, 360, { sw: 7 }), text(1090, 330, "1. supinar", { size: 22, weight: 700, color: C.accent }),
    arc(1000, 380, 920, 220, 790, 240, { sw: 7 }), text(820, 200, "2. fletir até o ombro", { size: 22, weight: 700, color: C.accent }),
    caption(640, 620, "se a primeira não deu: supinar a palma\npara cima e dobrar o cotovelo todo.\nA criança usa o braço em 5–15 min;\nnão usou: raio-X", 20),
  ], { title: "Redução da pronação dolorosa" }) },

  // 36. Redução da luxação lateral da patela
  { n: 36, draw: () => svg([
    title("Patela luxada: estender o joelho devagar e empurrar a patela para dentro"),
    panel(40, 90, 540, 680, "Como chega (joelho fletido)"),
    limb(300, 250, 300, 400, 170), limb(300, 540, 300, 720, 150),
    path("M240 400 Q300 370 360 400 Q380 480 300 530 Q220 480 240 400 Z", { fill: C.skin2, stroke: "none" }),
    path("M380 410 Q420 380 460 410 Q470 460 420 490 Q370 460 380 410 Z", { fill: C.bone }), text(420, 455, "patela", { size: 18, anchor: "middle" }),
    text(385, 590, "patela para fora,\njoelho dobrado,\nnão estende", { size: 19, color: C.alarm }),
    panel(600, 90, 560, 680, "A manobra"),
    limb(860, 250, 860, 400, 170), limb(860, 540, 860, 720, 150),
    path("M800 400 Q860 370 920 400 Q940 480 860 530 Q780 480 800 400 Z", { fill: C.skin2, stroke: "none" }),
    anim("push", { dx: "-40px", dy: "0px" }, path("M830 410 Q870 380 910 410 Q920 460 870 490 Q820 460 830 410 Z", { fill: C.bone })),
    arrow(1020, 450, 930, 450, { sw: 9 }), text(1030, 450, "polegar\nempurra", { size: 21 }),
    arc(760, 680, 700, 600, 740, 520, { sw: 7 }), text(640, 470, "estender\ndevagar", { size: 21 }),
    caption(620, 700, "analgesia; às vezes entra só de esticar. Depois: raio-X (fragmento\nosteocondral?), imobilizador 2–3 semanas, quadríceps cedo", 19),
  ], { title: "Redução da luxação da patela" }) },

  // 37. Protocolo funcional da ruptura do Aquiles
  { n: 37, draw: () => svg([
    title("Aquiles sem cirurgia: bota com cunhas e a escada de 8 semanas"),
    // bota de marcha (lateral) com cunhas no calcanhar
    path("M200 150 L330 150 L330 480 L520 480 Q560 490 560 540 L200 540 Z", { fill: C.cloth2, sw: 5 }),
    rect(160, 150, 40, 390, { fill: C.cloth2, sw: 5, rx: 8 }), rect(170, 540, 400, 40, { fill: C.line, stroke: C.line, rx: 10 }),
    limb(265, 110, 265, 400, 100), foot(265, 430, 0, 1.05),
    ...[0, 1, 2].map((k) => anim(["out1", "out2", "out3"][k], {}, rect(205, 470 + k * 22, 160, 20, { fill: C.plaster, sw: 3, rx: 4 }))),
    label(600, 180, "equino: 3 cunhas no calcanhar\n(≈ 2 cm cada) dentro da bota", { size: 24, to: [370, 490] }),
    // escada
    ...[["0–2 sem", "3 cunhas\nsem carga ou toque"], ["2–4 sem", "2 cunhas\ncarga parcial"], ["4–6 sem", "1 cunha\ncarga total"], ["6–8 sem", "sem cunha\nbota reta"]].map(([w, d], i) => {
      const x = 600 + i * 140, h = 130 + i * 45, y = 760 - h;
      return anim("focus4", { delay: i / 4 }, rect(x, y, 120, h, { fill: i === 3 ? C.accent : C.cloth, sw: 3, rx: 8 }), text(x + 60, y + 36, w, { size: 22, anchor: "middle", weight: 700, color: i === 3 ? C.paper : C.text }),
        d.split("\n").map((l, j) => text(x + 60, y + 66 + j * 24, l, { size: 19, anchor: "middle", color: i === 3 ? C.paper : C.muted })));
    }),
    caption(60, 630, "Thompson positivo + gap palpável;\nultrassom se dúvida. Começar\nem até 48 h.", 21),
    caption(60, 730, "após 8 sem: sair da bota, salto de 1 cm por\n4 sem, fisioterapia; sem corrida até 4–6 meses", 19),
  ], { title: "Protocolo funcional do Aquiles" }) },
];
