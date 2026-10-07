import type { LibraryTemplate } from "./types.ts";

/** Orientações ao paciente: terminam em sinais de alerta e nunca trazem dose. */
export const ORIENTACOES: readonly LibraryTemplate[] = [
  {
    kind: "orientacoes",
    name: "Orientações — gerais pós-consulta",
    title: "Orientações",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Siga estas recomendações até a próxima consulta:\n\n" +
      "1. \n" +
      "2. \n" +
      "3. \n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — pressão alta (hipertensão)",
    title: "Orientações — pressão alta",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Tomar os remédios todos os dias, no mesmo horário, mesmo quando a pressão estiver boa e mesmo " +
      "sem sentir nada. Pressão alta quase nunca dá sintoma — e não é por isso que deixou de fazer mal.\n\n" +
      "No dia a dia:\n" +
      "• Tire o saleiro da mesa e reduza sal no preparo. O que mais pesa são embutidos, temperos " +
      "prontos, caldos em cubo, enlatados e salgadinhos.\n" +
      "• Caminhe 30 minutos na maior parte dos dias da semana.\n" +
      "• Evite bebida alcoólica em excesso; se fuma, parar de fumar é a medida que mais protege.\n" +
      "• Mantenha o peso e durma bem.\n\n" +
      "Se engravidar ou estiver planejando engravidar, avise o médico o quanto antes: alguns remédios " +
      "de pressão (como losartana, enalapril e captopril) não podem ser usados na gravidez e precisam " +
      "ser trocados.\n\n" +
      "Se for medir em casa: sentado, com o braço apoiado na altura do coração, após 5 minutos de " +
      "repouso, sem ter fumado ou tomado café na meia hora anterior. Anote e traga na consulta.\n\n" +
      "Procure atendimento imediato se tiver dor no peito, falta de ar, fraqueza ou dormência de um " +
      "lado do corpo, dificuldade para falar, alteração da visão ou dor de cabeça muito forte e " +
      "diferente do habitual.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — diabetes",
    title: "Orientações — diabetes",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Tome os medicamentos conforme a receita e não pule doses por conta própria.\n\n" +
      "Alimentação e rotina:\n" +
      "• Reduza açúcar, refrigerante, sucos adoçados e massas e pães em grande quantidade.\n" +
      "• Faça refeições em horários regulares, sem longos períodos em jejum.\n" +
      "• Atividade física na maior parte dos dias ajuda tanto quanto o remédio.\n\n" +
      "Cuide dos pés todos os dias: olhe a sola e entre os dedos, seque bem, use calçado fechado e " +
      "confortável e não ande descalço. Feridas no pé que não cicatrizam precisam ser vistas logo.\n\n" +
      "Se medir a glicemia em casa, anote os valores com data e horário e traga na consulta.\n\n" +
      "Sinais de açúcar baixo (tremor, suor frio, fome súbita, confusão): tome meio copo de suco ou " +
      "água com açúcar e coma em seguida. Se não melhorar, procure atendimento.\n\n" +
      "Procure atendimento se tiver vômitos persistentes, respiração ofegante, sonolência, " +
      "desidratação, ou glicemia muito alta acompanhada de mal-estar.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — resfriado e gripe",
    title: "Orientações — quadro respiratório",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "A maior parte dos resfriados é causada por vírus e melhora sozinha em 7 a 10 dias. " +
      "Antibiótico não trata vírus e não acelera a melhora.\n\n" +
      "O que ajuda:\n" +
      "• Beber bastante líquido ao longo do dia.\n" +
      "• Repouso enquanto durarem os sintomas.\n" +
      "• Lavagem do nariz com soro fisiológico, quantas vezes precisar.\n" +
      "• Ambiente arejado; evitar fumaça de cigarro.\n\n" +
      "Use apenas os medicamentos que foram prescritos para você, nas doses da receita.\n\n" +
      "Procure atendimento se tiver falta de ar, dor no peito, febre por mais de três dias ou que " +
      "volta depois de ter passado, piora depois de uma melhora inicial, lábios ou unhas " +
      "arroxeados, sonolência importante ou dificuldade para beber líquidos.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — diarreia e vômito",
    title: "Orientações — quadro gastrointestinal",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "O mais importante é não desidratar. Beba líquidos em pequenos goles, com frequência, mesmo " +
      "que enjoado. Soro de reidratação oral é melhor que refrigerante ou suco concentrado.\n\n" +
      "Alimentação: volte a comer assim que tolerar, em porções pequenas. Prefira alimentos leves e " +
      "evite frituras, alimentos muito gordurosos e leite nos primeiros dias se perceber piora.\n\n" +
      "Lave bem as mãos depois de usar o banheiro e antes de preparar alimentos — assim o resto da " +
      "casa não adoece.\n\n" +
      "Não use medicamento para 'segurar' o intestino por conta própria.\n\n" +
      "Procure atendimento se houver sangue nas fezes, febre alta, vômitos que impedem beber " +
      "líquidos, urina muito escura ou ausência de urina por muitas horas, boca muito seca, " +
      "tontura ao levantar, ou se for criança pequena ou pessoa idosa.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — dor nas costas (lombalgia)",
    title: "Orientações — dor lombar",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Repouso absoluto na cama **piora** a dor nas costas. O melhor é manter-se em movimento dentro " +
      "do que a dor permite, retomando as atividades aos poucos.\n\n" +
      "No dia a dia:\n" +
      "• Evite ficar muito tempo na mesma posição; levante e caminhe um pouco a cada hora.\n" +
      "• Ao pegar peso, dobre os joelhos e mantenha o objeto próximo ao corpo.\n" +
      "• Calor local pode aliviar nos primeiros dias.\n" +
      "• Fortalecimento e alongamento, com orientação, previnem novas crises.\n\n" +
      "A maioria das crises melhora em algumas semanas.\n\n" +
      "Procure atendimento se a dor vier com febre, perda de força ou dormência nas pernas, " +
      "dificuldade para controlar urina ou fezes, perda de peso sem explicação, ou se a dor for " +
      "intensa após queda ou acidente.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — febre em crianças",
    title: "Orientações — febre na criança",
    group: "Orientações",
    body:
      "Orientações para os responsáveis de {{paciente}}\n\n" +
      "Febre é uma defesa do corpo, não uma doença. O que importa é como a criança está, não o " +
      "número do termômetro: uma criança que brinca, aceita líquidos e interage costuma estar bem.\n\n" +
      "O que fazer:\n" +
      "• Oferecer líquidos com frequência.\n" +
      "• Roupas leves; não agasalhar demais.\n" +
      "• Usar antitérmico apenas na dose e no intervalo que foram prescritos.\n" +
      "• Não usar álcool nem banho gelado.\n\n" +
      "Procure atendimento imediato se: for bebê com menos de 3 meses com qualquer febre; a criança " +
      "estiver muito sonolenta ou difícil de acordar; tiver manchas roxas na pele que não somem ao " +
      "esticar; apresentar convulsão; estiver com falta de ar ou respiração rápida; recusar líquidos " +
      "ou não urinar; chorar sem parar ou gemer; ou se a febre passar de três dias.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — cuidados pós-operatórios",
    title: "Orientações pós-operatórias",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Curativo e ferida:\n" +
      "• Mantenha o local limpo e seco, trocando o curativo conforme orientado.\n" +
      "• Lave as mãos antes e depois de mexer no curativo.\n" +
      "• Não aplique pomadas ou produtos que não tenham sido indicados.\n\n" +
      "Atividades: evite esforço, peso e atividade física até liberação. Caminhadas curtas, desde o " +
      "primeiro dia, ajudam a prevenir complicações.\n\n" +
      "Medicamentos: use apenas os prescritos, nos horários da receita. Não interrompa antibiótico " +
      "antes do fim, mesmo se estiver bem.\n\n" +
      "Retorno para avaliação e retirada de pontos: conforme combinado na consulta.\n\n" +
      "Procure atendimento se houver febre, vermelhidão que aumenta ao redor da ferida, saída de " +
      "secreção com odor, abertura dos pontos, dor que piora em vez de melhorar, sangramento, " +
      "falta de ar ou dor e inchaço numa das pernas.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — como tomar o antibiótico",
    title: "Orientações — antibiótico",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Tome o antibiótico nos horários e pelo número de dias da receita, mesmo que melhore antes: " +
      "parar por conta própria pode fazer a infecção voltar.\n\n" +
      "• Respeite o intervalo entre as doses; distribua os horários ao longo do dia.\n" +
      "• Se esquecer uma dose, tome assim que lembrar — mas se já estiver perto da próxima, pule a " +
      "esquecida. Nunca tome duas de uma vez.\n" +
      "• Não guarde sobras para usar depois, nem ofereça a outra pessoa.\n" +
      "• Avise se estiver usando outros medicamentos, inclusive anticoncepcional.\n\n" +
      "Efeitos comuns: enjoo leve e fezes mais amolecidas.\n\n" +
      "Procure atendimento se surgirem manchas na pele, coceira intensa, inchaço no rosto, lábios ou " +
      "língua, falta de ar, diarreia intensa ou com sangue, ou se não houver melhora em 48 a 72 horas.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — preparo para exames de sangue",
    title: "Orientações — preparo para exames",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Para a coleta em {{destino}}:\n\n" +
      "• Jejum: siga o tempo informado no pedido do exame. Água pode ser ingerida normalmente.\n" +
      "• Medicamentos de uso contínuo: mantenha, salvo orientação em contrário.\n" +
      "• Evite bebida alcoólica e atividade física intensa nas 24 horas anteriores.\n" +
      "• Leve o pedido, um documento com foto e o cartão do convênio.\n\n" +
      "Se estiver com febre, gripe ou infecção no dia, avise o laboratório: alguns resultados podem " +
      "ser alterados.\n\n" +
      "Traga os resultados na consulta de retorno.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — sono e ansiedade",
    title: "Orientações — sono",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Rotina de sono:\n" +
      "• Deite e levante em horários parecidos, inclusive nos fins de semana.\n" +
      "• Deixe o quarto escuro, silencioso e fresco.\n" +
      "• Evite telas na última hora antes de dormir.\n" +
      "• Evite café, energético, álcool e refeições pesadas à noite.\n" +
      "• Se não conseguir dormir em 20 minutos, levante e faça algo calmo até sentir sono.\n\n" +
      "Durante o dia: luz natural pela manhã, atividade física regular (não muito perto da hora de " +
      "dormir) e cochilos curtos, se necessários.\n\n" +
      "Para a ansiedade, exercícios de respiração lenta ajudam na crise: inspire contando até quatro, " +
      "solte contando até seis, por alguns minutos.\n\n" +
      "Procure atendimento se a insônia ou a ansiedade estiverem atrapalhando o trabalho, os estudos " +
      "ou as relações, ou se houver pensamentos de se machucar — nesse caso, procure ajuda " +
      "imediatamente (CVV: 188, 24 horas).\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — dor de cabeça e enxaqueca",
    title: "Orientações — dor de cabeça",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Anote as crises: dia, horário, duração, intensidade, o que estava fazendo e o que ajudou. " +
      "Esse diário costuma revelar os gatilhos melhor do que a memória.\n\n" +
      "Gatilhos comuns: sono irregular, jejum prolongado, estresse, desidratação, álcool, " +
      "excesso de cafeína e, em algumas pessoas, alimentos específicos.\n\n" +
      "Na crise: ambiente escuro e silencioso, hidratação e o medicamento prescrito, tomado logo no " +
      "começo da dor — quanto mais cedo, melhor funciona.\n\n" +
      "Atenção: usar analgésico muitos dias por mês pode, por si só, causar dor de cabeça diária. " +
      "Avise se estiver precisando com muita frequência.\n\n" +
      "Procure atendimento imediato se a dor for súbita e a pior da vida, vier com febre e rigidez no " +
      "pescoço, com perda de força, alteração da fala ou da visão, confusão, ou depois de um trauma " +
      "na cabeça.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — coração e vasos (risco cardiovascular)",
    title: "Orientações — saúde cardiovascular",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "As medidas abaixo reduzem risco de infarto e AVC tanto quanto vários medicamentos:\n\n" +
      "• Parar de fumar — é a de maior impacto. Peça ajuda; existe tratamento.\n" +
      "• 150 minutos de atividade física por semana, distribuídos em vários dias.\n" +
      "• Mais legumes, verduras, frutas, feijão e peixe; menos ultraprocessados, frituras e embutidos.\n" +
      "• Reduzir sal e álcool.\n" +
      "• Manter o peso e tratar pressão, colesterol e diabetes com regularidade.\n" +
      "• Dormir bem e cuidar do estresse.\n\n" +
      "Não interrompa medicamentos por conta própria, mesmo se estiver se sentindo bem.\n\n" +
      "Procure atendimento imediato (SAMU 192) se tiver dor ou aperto no peito, dor que irradia para " +
      "braço, pescoço ou mandíbula, falta de ar súbita, suor frio, perda de força ou dormência de um " +
      "lado do corpo, dificuldade para falar ou desvio da boca.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — pré-natal",
    title: "Orientações — pré-natal",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Compareça a todas as consultas e exames do pré-natal, mesmo se estiver se sentindo bem, e " +
      "leve sempre a caderneta da gestante.\n\n" +
      "No dia a dia:\n" +
      "• Use as vitaminas prescritas.\n" +
      "• Não use nenhum medicamento, chá ou suplemento sem falar com a equipe.\n" +
      "• Nada de álcool, cigarro ou outras drogas.\n" +
      "• Alimentação variada e bastante líquido; atividade física leve, se liberada.\n" +
      "• Mantenha as vacinas em dia.\n\n" +
      "Procure atendimento imediato se houver sangramento, perda de líquido, dor abdominal forte ou " +
      "contrações antes do tempo, dor de cabeça forte com visão embaçada, inchaço súbito no rosto e " +
      "nas mãos, febre, ardência ao urinar, ou redução dos movimentos do bebê.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — cuidados com a pele",
    title: "Orientações — cuidados com a pele",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "• Banhos mornos e curtos; água quente resseca e piora a coceira.\n" +
      "• Sabonete suave, apenas nas dobras e áreas necessárias.\n" +
      "• Hidratante logo após o banho, com a pele ainda úmida, e quantas vezes for preciso no dia.\n" +
      "• Evite esfregar com bucha e tecidos ásperos; prefira roupas de algodão.\n" +
      "• Não coce: unhas curtas ajudam, e compressa fria alivia.\n" +
      "• Protetor solar diariamente, reaplicado quando houver exposição.\n\n" +
      "Use somente as pomadas ou cremes prescritos, pelo tempo indicado.\n\n" +
      "Procure atendimento se a lesão aumentar rapidamente, apresentar pus, dor ou calor local, se " +
      "houver febre, ou se a pinta mudar de cor, tamanho ou formato.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — depois da vacina",
    title: "Orientações — pós-vacinação",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Dor, vermelhidão ou inchaço no local da aplicação, e um mal-estar leve com febre baixa nas " +
      "primeiras 48 horas, são reações esperadas e passam sozinhas.\n\n" +
      "O que ajuda:\n" +
      "- Compressa fria no local, sem massagear.\n" +
      "- Beber bastante líquido e descansar.\n" +
      "- Usar antitérmico apenas se foi prescrito para você.\n\n" +
      "Mantenha a caderneta de vacinação guardada e leve nas consultas.\n\n" +
      "Procure atendimento se houver falta de ar, inchaço no rosto, lábios ou língua, manchas na " +
      "pele, febre alta que não cede, ou se o local da aplicação ficar muito quente, endurecido e " +
      "com dor crescente depois do terceiro dia.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — parar de fumar",
    title: "Orientações — cessação do tabagismo",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Parar de fumar é a decisão isolada que mais protege a sua saúde, em qualquer idade e mesmo " +
      "depois de muitos anos fumando. A circulação melhora em semanas e o risco cardiovascular cai " +
      "já no primeiro ano.\n\n" +
      "O que ajuda:\n" +
      "- Marcar uma data para parar e avisar quem convive com você.\n" +
      "- Tirar de casa cigarros, isqueiros e cinzeiros na véspera.\n" +
      "- Identificar os gatilhos (café, álcool, espera, estresse) e planejar o que fazer no lugar.\n" +
      "- Beber água, mascar algo sem açúcar e caminhar quando a vontade apertar: ela dura poucos " +
      "minutos e vai ficando mais rara.\n\n" +
      "Recair é comum e não apaga o progresso: retome no dia seguinte e traga o assunto na consulta. " +
      "Existe tratamento, inclusive medicamentoso, que pode ser avaliado.\n\n" +
      "Procure atendimento se surgir dor no peito, falta de ar, tosse com sangue, ou se a ansiedade " +
      "ficar difícil de controlar.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — prevenção de quedas",
    title: "Orientações — prevenção de quedas",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "A maior parte das quedas acontece dentro de casa e pode ser evitada.\n\n" +
      "Em casa:\n" +
      "- Tire tapetes soltos e fios do caminho.\n" +
      "- Ilumine bem o corredor e o caminho até o banheiro à noite.\n" +
      "- Instale barras de apoio no banheiro e use tapete antiderrapante no box.\n" +
      "- Use calçado fechado, firme e com solado antiderrapante.\n\n" +
      "No corpo:\n" +
      "- Levante devagar da cama e da cadeira; espere alguns segundos sentado antes de ficar de pé.\n" +
      "- Mantenha atividade física e fortalecimento, com orientação.\n" +
      "- Faça avaliação da visão e da audição periodicamente.\n" +
      "- Traga a lista de todos os medicamentos nas consultas: alguns causam tontura ou sonolência.\n\n" +
      "Procure atendimento se houver queda com batida na cabeça, dor forte, dificuldade para " +
      "apoiar o peso, tonturas frequentes ou desmaio.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — diabetes na gravidez",
    title: "Orientações — diabetes gestacional",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "O diabetes gestacional costuma ser controlado com alimentação e atividade física, e na " +
      "maioria das vezes desaparece depois do parto, mas precisa ser acompanhado de perto até lá.\n\n" +
      "No dia a dia:\n" +
      "- Faça refeições menores e mais frequentes, sem passar muitas horas em jejum.\n" +
      "- Reduza açúcar, doces, refrigerante e sucos adoçados.\n" +
      "- Prefira alimentos integrais e inclua proteína nas refeições.\n" +
      "- Caminhe depois das refeições, se liberado pela equipe.\n\n" +
      "Se medir a glicemia em casa, anote os valores com data, horário e se foi antes ou depois " +
      "da refeição, e traga nas consultas.\n\n" +
      "Mantenha o pré-natal em dia. Depois do parto, será necessário repetir os exames.\n\n" +
      "Procure atendimento se houver glicemias muito altas ou muito baixas, vômitos persistentes, " +
      "redução dos movimentos do bebê, perda de líquido, sangramento ou dor abdominal forte.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — cuidados com o curativo",
    title: "Orientações — cuidados com a ferida",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "- Lave as mãos com água e sabão antes e depois de trocar o curativo.\n" +
      "- Limpe a ferida conforme orientado, sem esfregar, e seque sem friccionar.\n" +
      "- Use apenas os produtos indicados; não aplique pomada, pó ou receita caseira por conta " +
      "própria.\n" +
      "- Troque o curativo na frequência combinada, e sempre que estiver sujo ou molhado.\n" +
      "- Mantenha a região protegida no banho, salvo orientação em contrário.\n\n" +
      "Evite coçar e não retire crostas.\n\n" +
      "Procure atendimento se houver vermelhidão que aumenta ao redor, calor local, pus, odor " +
      "forte, dor que piora em vez de melhorar, febre, ou se a ferida abrir ou sangrar.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — dengue",
    title: "Orientações — dengue",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Na dengue, o que protege é a hidratação. Beba bastante líquido ao longo de todo o dia, " +
      "mesmo sem sede: água, soro de reidratação oral, sucos naturais, água de coco e caldos. " +
      "Deixe uma garrafa por perto e anote o quanto bebeu.\n\n" +
      "Não tome anti-inflamatório nem ácido acetilsalicílico (AAS), nem remédio que os contenha: " +
      "aumentam o risco de sangramento. Para febre e dor, use só o que está na sua receita.\n\n" +
      "Se você já usa AAS ou outro remédio para afinar o sangue por indicação médica (stent, " +
      "infarto, AVC, arritmia), não suspenda por conta própria: avise o médico, que decide.\n\n" +
      "Faça repouso. O período mais delicado costuma ser quando a febre vai embora, entre o " +
      "terceiro e o sétimo dia: continue se hidratando e atento aos sinais abaixo mesmo sem " +
      "febre.\n\n" +
      "Evite picadas usando repelente e tela, e elimine água parada em casa, para não passar a " +
      "doença a quem mora com você.\n\n" +
      "Procure atendimento imediatamente se tiver dor forte na barriga, vômitos que não param, " +
      "sangramento de nariz, gengiva, na urina ou nas fezes, manchas roxas pelo corpo, tontura " +
      "ou desmaio ao levantar, sonolência ou agitação, falta de ar, pouca urina ou mãos e pés " +
      "frios e pegajosos.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — infecção urinária",
    title: "Orientações — infecção urinária",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Tome o antibiótico nos horários certos e até o fim, mesmo que os sintomas melhorem antes. " +
      "Parar no meio favorece a volta da infecção.\n\n" +
      "O que ajuda:\n" +
      "• Beber água ao longo do dia, para urinar com frequência.\n" +
      "• Não segurar a vontade de urinar.\n" +
      "• Urinar depois das relações sexuais.\n" +
      "• Na higiene íntima, limpar da frente para trás.\n\n" +
      "Alguns remédios para a ardência deixam a urina alaranjada: é esperado e passa ao parar.\n\n" +
      "Procure atendimento se tiver febre, calafrios, dor nas costas ou no lado da barriga, " +
      "vômitos, sangue na urina, se os sintomas não melhorarem em dois a três dias de tratamento, " +
      "ou se estiver grávida.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — cólica renal (pedra nos rins)",
    title: "Orientações — cálculo renal",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "A maior parte das pedras pequenas sai sozinha pela urina em alguns dias ou semanas. A " +
      "dor pode ir e voltar nesse período.\n\n" +
      "O que ajuda:\n" +
      "• Beber água ao longo do dia, o bastante para a urina ficar clara.\n" +
      "• Tomar os remédios da receita nos horários indicados, sem esperar a dor ficar forte.\n" +
      "• Se possível, urinar num coador ou peneira para guardar a pedra e trazer na consulta.\n\n" +
      "Para evitar novas pedras: manter boa hidratação todos os dias, reduzir o sal e os " +
      "alimentos ultraprocessados, e não exagerar em carne vermelha.\n\n" +
      "Procure atendimento imediatamente se tiver febre ou calafrios, dor que não melhora com os " +
      "remédios, vômitos que impedem beber líquidos, se parar de urinar, ou se tiver um rim só.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — hemorroidas",
    title: "Orientações — hemorroidas",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "O principal é o intestino funcionar sem esforço:\n" +
      "• Coma fibras todos os dias: frutas com casca, verduras, legumes, feijão e cereais " +
      "integrais.\n" +
      "• Beba bastante água.\n" +
      "• Vá ao banheiro quando tiver vontade e não fique muito tempo sentado no vaso nem use o " +
      "celular lá.\n" +
      "• Evite fazer força para evacuar.\n\n" +
      "Para aliviar: banho de assento com água morna por 10 a 15 minutos, duas a três vezes ao " +
      "dia, e higiene com água em vez de papel seco.\n\n" +
      "Procure atendimento se o sangramento for em grande quantidade ou não parar, se aparecer " +
      "um caroço duro e muito dolorido, se tiver febre, ou se notar mudança no hábito do " +
      "intestino, emagrecimento sem motivo ou fezes escuras.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — conjuntivite",
    title: "Orientações — conjuntivite",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "A conjuntivite passa com facilidade para outras pessoas. Lave as mãos com frequência, " +
      "não coce os olhos e não divida toalhas, fronhas, maquiagem ou colírios.\n\n" +
      "O que ajuda:\n" +
      "• Compressas frias sobre os olhos fechados, algumas vezes ao dia.\n" +
      "• Limpar a secreção com gaze ou algodão limpos, um para cada olho.\n" +
      "• Não usar lentes de contato até a melhora completa.\n\n" +
      "Use só o colírio que foi receitado. Colírio com corticoide por conta própria pode " +
      "prejudicar a visão.\n\n" +
      "Procure atendimento se a visão ficar embaçada, se houver dor forte no olho, sensibilidade " +
      "intensa à luz, inchaço ao redor do olho, ou se não melhorar em alguns dias.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — infecção sexualmente transmissível",
    title: "Orientações — IST",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Faça o tratamento completo, exatamente como está na receita.\n\n" +
      "As parcerias sexuais também precisam ser avaliadas e tratadas, mesmo sem sintomas; senão " +
      "a infecção volta. Evite relações sexuais até 7 dias depois de terminar o tratamento (ou " +
      "depois da dose única), até os sintomas sumirem e até as parcerias também terem sido tratadas; " +
      "depois, use preservativo.\n\n" +
      "Faça os exames de HIV, sífilis e hepatites B e C, que foram ou serão pedidos, e mantenha " +
      "a vacinação em dia. Preservativo interno e externo, PrEP e PEP estão disponíveis " +
      "gratuitamente no SUS.\n\n" +
      "Na sífilis, nas primeiras horas depois da injeção pode haver febre, calafrio, dor no corpo e " +
      "piora das manchas: é uma reação esperada ao tratamento, passa sozinha e não é alergia.\n\n" +
      "Se o tratamento foi para dor na pelve ou nos testículos, retorne para reavaliação em três " +
      "dias, mesmo que esteja melhor.\n\n" +
      "Procure atendimento se tiver febre, dor forte na barriga, dor ou inchaço nos testículos, " +
      "feridas que não cicatrizam, ou se os sintomas voltarem.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — início de antidepressivo",
    title: "Orientações — início do tratamento",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "O remédio faz efeito aos poucos: a melhora costuma aparecer entre duas e seis semanas. Não " +
      "desanime se nas primeiras semanas ainda não sentir diferença.\n\n" +
      "Nas primeiras semanas:\n" +
      "• Enjoo, dor de cabeça, intestino solto, sono alterado ou um pouco mais de ansiedade podem " +
      "aparecer e costumam passar em poucos dias.\n" +
      "• Tome todos os dias, no mesmo horário. Se esquecer, tome assim que lembrar no mesmo dia; " +
      "nunca tome duas doses juntas.\n" +
      "• Evite bebida alcoólica.\n" +
      "• Não pare de repente, mesmo se melhorar: a retirada é feita aos poucos, com orientação.\n" +
      "• Avise antes de começar qualquer outro remédio, inclusive para dor, enxaqueca ou " +
      "fitoterápico (como a erva-de-são-joão).\n\n" +
      "Junto com o remédio ajudam: rotina de sono, atividade física, contato com pessoas próximas " +
      "e, quando indicada, psicoterapia.\n\n" +
      "Procure atendimento imediatamente se tiver pensamentos de se machucar ou de que não vale a " +
      "pena viver (CVV: 188, 24 horas), agitação intensa, euforia fora do comum, ou se os efeitos " +
      "colaterais estiverem difíceis de tolerar.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — crise de asma",
    title: "Orientações — asma",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "A bombinha com corticoide trata a inflamação dos brônquios e evita novas crises: use todos " +
      "os dias, como na receita, mesmo quando estiver bem. Depois de usar, enxágue a boca com água " +
      "e cuspa.\n\n" +
      "Na crise, use a dose de alívio indicada na receita, sente-se e respire devagar. Traga a " +
      "bombinha no retorno para revisarmos juntos a forma de usar — a técnica faz muita diferença.\n\n" +
      "Evite os gatilhos: fumaça de cigarro, poeira, mofo, cheiros fortes e mudança brusca de " +
      "temperatura. Se fuma, parar é parte do tratamento.\n\n" +
      "Volte para reavaliação em até uma semana.\n\n" +
      "Procure atendimento imediatamente se a falta de ar não melhorar com o remédio de alívio, " +
      "se tiver dificuldade para falar frases inteiras, lábios ou unhas arroxeados, sonolência ou " +
      "confusão, ou se precisar do remédio de alívio muitas vezes no mesmo dia.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — sarna e piolho",
    title: "Orientações — sarna e piolho",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Sarna e piolho passam pelo contato próximo.\n\n" +
      "Sarna: todas as pessoas da casa e os contatos próximos devem ser tratados no mesmo dia, mesmo " +
      "sem coceira.\n" +
      "Piolho: examine com pente fino a cabeça de todos da casa e trate, no mesmo dia, quem tiver " +
      "piolho ou lêndea.\n\n" +
      "• Aplique o produto exatamente como está na receita e repita na data indicada: a segunda " +
      "aplicação pega o que nasceu dos ovos.\n" +
      "• Sarna: no dia do tratamento, lave roupas de cama, toalhas e as roupas usadas nos últimos " +
      "três dias em água quente, ou guarde tudo em saco plástico fechado por três dias.\n" +
      "• Piolho: passe o pente fino no cabelo úmido, mecha por mecha, nos dias seguintes, e lave " +
      "pentes, escovas, bonés e fronhas.\n" +
      "• Unhas curtas e mãos limpas; evite coçar.\n\n" +
      "Na sarna, a coceira pode continuar por duas a quatro semanas depois do tratamento, mesmo " +
      "curada: isso não quer dizer que o remédio falhou.\n\n" +
      "Procure atendimento se surgirem feridas com pus, vermelhidão que se espalha, febre, ou " +
      "lesões novas depois de duas a quatro semanas.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — urticária (alergia na pele)",
    title: "Orientações — urticária",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "A urticária (placas vermelhas que coçam e mudam de lugar) costuma melhorar em poucos dias. " +
      "Muitas vezes a causa não aparece; infecções por vírus, remédios e alimentos são as mais " +
      "comuns.\n\n" +
      "• Tome o antialérgico todos os dias, como na receita — não só quando coçar.\n" +
      "• Anote o que comeu, usou ou tocou nas horas antes da crise e evite o que parecer suspeito.\n" +
      "• Evite anti-inflamatórios (como ibuprofeno, diclofenaco e AAS), bebida alcoólica, banho " +
      "quente e roupa apertada: pioram as placas. Se você usa AAS por indicação médica (stent, " +
      "infarto, AVC), não suspenda por conta própria: avise o médico.\n" +
      "• Compressa fria alivia a coceira.\n\n" +
      "Procure atendimento imediatamente (SAMU 192) se houver inchaço nos lábios, língua, olhos ou " +
      "garganta, falta de ar, chiado, rouquidão, tontura, desmaio ou vômitos — são sinais de reação " +
      "alérgica grave.\n\n" +
      "Procure também a clínica se as placas durarem mais de seis semanas ou vierem com febre ou " +
      "dor nas articulações.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — herpes genital",
    title: "Orientações — herpes genital",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Comece o remédio o quanto antes e tome-o todos os dias até o fim, nos horários da receita.\n\n" +
      "O vírus do herpes fica no corpo e pode voltar a dar feridas de tempos em tempos — isso é " +
      "reativação, não uma nova infecção. Tratar a crise logo no início (formigamento ou ardência) " +
      "encurta o episódio.\n\n" +
      "• Mantenha as feridas limpas e secas: lave com água e sabão neutro e seque sem esfregar.\n" +
      "• Evite relações sexuais enquanto houver formigamento ou feridas, e use sempre preservativo: " +
      "o vírus pode passar mesmo sem feridas.\n" +
      "• A parceria deve ser avaliada e orientada; só recebe tratamento se tiver sintomas.\n" +
      "• Faça os exames de HIV, sífilis e hepatites que foram pedidos.\n\n" +
      "Procure atendimento se tiver dificuldade para urinar, dor de cabeça forte com febre ou rigidez " +
      "no pescoço, feridas que se espalham ou não cicatrizam em duas semanas, ou se estiver grávida.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
  {
    kind: "orientacoes",
    name: "Orientações — pielonefrite",
    title: "Orientações — infecção nos rins",
    group: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Tome o antibiótico nos horários e pelo número de dias da receita, mesmo que melhore antes. A " +
      "febre e a dor nas costas costumam melhorar em dois a três dias.\n\n" +
      "• Beba água ao longo do dia.\n" +
      "• Para dor ou febre, use só o que está na receita.\n" +
      "• Faça a urocultura pedida e traga o resultado: o antibiótico pode ser ajustado por ela.\n\n" +
      "Procure atendimento se a febre não baixar depois de dois a três dias de antibiótico, se vomitar " +
      "e não conseguir tomar o remédio, se tiver tontura ao levantar, confusão, pouca urina ou piora da " +
      "dor, ou se estiver grávida.\n\n" +
      "Em caso de dúvida, fale com a {{clinica}}.",
  },
];
