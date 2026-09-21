// =============================================================================
// REGRAS DE PONTUAÇÃO — Torneio Maker de Robótica 2026
// Fonte: fichário oficial (Guia do Torneio + Formulários de pontuação por ano
// + Rúbrica Equipe Destaque). Este é o ÚNICO lugar onde as regras de cálculo
// vivem — se o fichário mudar de um ano para o outro, é só editar aqui.
// =============================================================================

const PENALTY_POINTS = 5;

// Nome do(a) juiz(a) pré-preenchido em novas pontuações e avaliações.
// A pessoa que estiver pontuando ainda pode editar o campo livremente.
const DEFAULT_JUDGE_NAME = "Julio";

// -----------------------------------------------------------------------------
// FASES DO TORNEIO
// O torneio ocorre em 3 fases independentes: duas seletivas e a final.
// Cada fase tem seus próprios 2 rounds por equipe — as pontuações não se
// misturam entre fases. A passagem de uma fase para a próxima (quem está
// classificado) é decidida manualmente pela professora/juiz, não calculada
// automaticamente pelo sistema.
// -----------------------------------------------------------------------------
const PHASES = [
  { slug: "treino", label: "Treino", short: "Treino", kind: "treino" },
  { slug: "seletiva-16-9", label: "Seletiva 16/9", short: "Seletiva 1", kind: "seletiva" },
  { slug: "seletiva-23-9", label: "Seletiva 23/9", short: "Seletiva 2", kind: "seletiva" },
  { slug: "final-03-10", label: "Final 03/10", short: "Final", kind: "final" },
];

function getPhaseBySlug(slug) {
  return PHASES.find((p) => p.slug === slug) || null;
}

const DEFAULT_PHASE_SLUG = PHASES[0].slug;

// -----------------------------------------------------------------------------
// FUNDAMENTAL 2 (6º ao 9º ano) — critério de pontuação por fichas
//
// Cada equipe começa com 5 fichas de penalidade, valendo 10 pontos cada
// (até 50 pontos de "bônus"). Cada penalidade sofrida custa 1 ficha —
// portanto, ao contrário do desconto fixo usado em outros anos, aqui a
// penalidade reduz o bônus de fichas, não desconta direto da pontuação
// das missões.
//
// São 4 missões, valendo até 30 pontos cada:
//   - Missão 1 e Missão 2: tudo ou nada (30 pts se cumprida, 0 se não).
//   - Missão 3 e Missão 4: dependem de quanto do objeto ficou dentro da
//     área demarcada — "Dentro da área" vale os 30 pts cheios, "No limite"
//     (quase saindo da área) vale 27 pts, e "Fora da área" vale 0.
//
// Pontuação máxima possível: 50 (fichas) + 4×30 (missões) = 170 pontos.
// -----------------------------------------------------------------------------
const FUNDAMENTAL_2_TOKEN_SYSTEM = { count: 5, pointsPerToken: 10 };

function zoneMissionFields() {
  return [
    {
      id: "zona",
      label: "Posição do objeto",
      type: "zone",
      options: [
        { id: "dentro", label: "Dentro da área demarcada", points: 30 },
        { id: "limite", label: "No limite da área (quase fora)", points: 27 },
        { id: "fora", label: "Fora da área demarcada", points: 0 },
      ],
    },
  ];
}

function fundamentalDoisGrade(slug, matImage, grade) {
  const tokenBonusMax = FUNDAMENTAL_2_TOKEN_SYSTEM.count * FUNDAMENTAL_2_TOKEN_SYSTEM.pointsPerToken;
  return {
    slug,
    matImage,
    grade,
    formLabel: "Torneio Maker de Robótica F2 - 2026",
    maxPoints: tokenBonusMax + 4 * 30,
    tokenSystem: FUNDAMENTAL_2_TOKEN_SYSTEM,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description: "Missão de execução (tudo ou nada).",
        maxPoints: 30,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 }],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Missão de execução (tudo ou nada).",
        maxPoints: 30,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 }],
      },
      {
        id: "m3",
        title: "Missão 3",
        description: "Pontua conforme o quanto do objeto ficou dentro da área demarcada.",
        maxPoints: 30,
        fields: zoneMissionFields(),
      },
      {
        id: "m4",
        title: "Missão 4",
        description: "Pontua conforme o quanto do objeto ficou dentro da área demarcada.",
        maxPoints: 30,
        fields: zoneMissionFields(),
      },
    ],
  };
}

const GRADES = [
  {
    slug: "4-ano",
    matImage: "assets/tapete-4-ano.jpg",
    grade: "4º ano",
    formLabel: "Torneio Maker de Robótica F1 - 2026",
    maxPoints: 100,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description: "Levar para as empresas equipamentos mais antigos.",
        maxPoints: 40,
        fields: [
          { id: "sim", label: "Concluiu a missão", type: "boolean", points: 10 },
          { id: "empresas", label: "Nº de empresas atendidas", type: "counter", pointsPerUnit: 10, maxUnits: 3 },
        ],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Desativar equipamentos periféricos.",
        maxPoints: 40,
        fields: [
          { id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 },
          { id: "alerta", label: "Alerta sonoro ou visual", type: "boolean", points: 10 },
        ],
      },
      {
        id: "m3",
        title: "Missão 3",
        description: "Levar equipamentos que não podem ser reaproveitados para o descarte correto.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
    ],
  },
  {
    slug: "5-ano",
    matImage: "assets/tapete-5-ano.jpg",
    grade: "5º ano",
    formLabel: "Torneio Maker de Robótica F1 - 2026",
    maxPoints: 130,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description: "Levar as lixeiras autônomas.",
        maxPoints: 30,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 }],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Levar o protótipo do filtro automatizado.",
        maxPoints: 60,
        fields: [
          { id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 },
          { id: "torneiras", label: "Nº de torneiras atendidas", type: "counter", pointsPerUnit: 10, maxUnits: 3 },
        ],
      },
      {
        id: "m3",
        title: "Missão 3",
        description: "Levar o ônibus turístico autoguiado.",
        maxPoints: 40,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 40 }],
      },
    ],
  },
  fundamentalDoisGrade("6-ano", "assets/tapete-6-ano.jpg", "6º ano"),
  fundamentalDoisGrade("7-ano", "assets/tapete-7-ano.jpg", "7º ano"),
  fundamentalDoisGrade("8-ano", "assets/tapete-8-ano.jpg", "8º ano"),
  fundamentalDoisGrade("9-ano", "assets/tapete-9-ano.jpg", "9º ano"),
];

function getGradeBySlug(slug) {
  return GRADES.find((g) => g.slug === slug) || null;
}

function getSlugByGrade(grade) {
  const g = GRADES.find((g) => g.grade === grade);
  return g ? g.slug : "";
}

// -----------------------------------------------------------------------------
// Cálculo da pontuação de um round a partir dos valores marcados no formulário.
// values: { [missionId]: { [fieldId]: boolean | number | string } }
//
// Tipos de campo suportados em mission.fields:
//   "boolean" — sim/não, vale field.points quando true
//   "counter" — contador 0..maxUnits, cada unidade vale field.pointsPerUnit
//   "zone"    — 3 estados (definidos em field.options), cada opção com seus
//               próprios pontos. Usado nas missões de "% do objeto dentro
//               da área demarcada" do Fundamental 2 (6º ao 9º ano):
//               dentro = pontos cheios, limite = pontos reduzidos, fora = 0.
//
// Sistema de penalidade — duas formas, escolhidas pela config do ano:
//   Padrão (config.tokenSystem ausente): cada penalidade desconta um valor
//   fixo (PENALTY_POINTS) do total de missões.
//   Fichas (config.tokenSystem presente, usado no Fundamental 2): a equipe
//   começa com N fichas valendo X pontos cada; cada penalidade custa 1
//   ficha. O "bônus de fichas" restantes entra somado ao total, em vez de
//   descontado — ex.: 5 fichas de 10 pts = até 50 pts de bônus.
// -----------------------------------------------------------------------------
function calculateRoundScore(config, values, penaltyCount) {
  const missionBreakdown = config.missions.map((mission) => {
    const missionValues = (values && values[mission.id]) || {};
    let points = 0;
    for (const field of mission.fields) {
      const raw = missionValues[field.id];
      if (field.type === "boolean") {
        if (raw === true) points += field.points || 0;
      } else if (field.type === "counter") {
        const units = Math.max(0, Math.min(Number(raw) || 0, field.maxUnits ?? Infinity));
        points += units * (field.pointsPerUnit || 0);
      } else if (field.type === "zone") {
        const option = (field.options || []).find((o) => o.id === raw);
        if (option) points += option.points || 0;
      }
    }
    points = Math.min(points, mission.maxPoints);
    return { missionId: mission.id, points, maxPoints: mission.maxPoints };
  });

  const missionsTotal = missionBreakdown.reduce((sum, m) => sum + m.points, 0);
  const safePenaltyCount = Math.max(0, penaltyCount || 0);

  const tokenSystem = config.tokenSystem || null;
  let penaltyTotal = 0;
  let tokenBonus = 0;
  let tokensRemaining = null;
  let finalScore;

  if (tokenSystem) {
    tokensRemaining = Math.max(0, tokenSystem.count - safePenaltyCount);
    tokenBonus = tokensRemaining * tokenSystem.pointsPerToken;
    finalScore = Math.max(0, missionsTotal + tokenBonus);
  } else {
    penaltyTotal = safePenaltyCount * PENALTY_POINTS;
    finalScore = Math.max(0, missionsTotal - penaltyTotal);
  }

  return {
    missionBreakdown,
    missionsTotal,
    penaltyCount: safePenaltyCount,
    penaltyTotal,
    tokenSystem,
    tokensRemaining,
    tokenBonus,
    finalScore,
    maxPossible: config.maxPoints,
  };
}

// =============================================================================
// RÚBRICA — EQUIPE DESTAQUE (Máximo: 100 pontos)
// Cálculo por critério: pontos = round((nível / 5) × peso)
// Desempate: 1) Valores, 2) Projeto & Inovação, 3) Desempenho do Robô
// =============================================================================

const RUBRIC_CRITERIA = [
  {
    id: "valores",
    name: "Valores",
    description: "Respeito, inclusão, trabalho em equipe, diversão, postura ética e colaboração com outras equipes.",
    weight: 20,
  },
  {
    id: "projeto_inovacao",
    name: "Projeto & Inovação",
    description: "Problema claro, originalidade da solução, teste/validação, criatividade e viabilidade.",
    weight: 20,
  },
  {
    id: "estrategia_iteracao",
    name: "Estratégia & Iteração",
    description: "Planejamento de missões, análise de riscos, ciclos de melhoria, uso de dados/feedback.",
    weight: 15,
  },
  {
    id: "desempenho_robo",
    name: "Desempenho do Robô (Arena)",
    description: "Consistência de execução, cumprimento de missões, tempo e precisão durante os rounds.",
    weight: 20,
  },
  {
    id: "documentacao_comunicacao",
    name: "Documentação & Comunicação",
    description: "Explicação técnica acessível, papéis bem definidos e comunicação clara.",
    weight: 10,
  },
  {
    id: "seguranca_organizacao",
    name: "Segurança, Organização & Autonomia",
    description: "Cuidado com materiais, segurança na arena/pits, organização do espaço e autonomia do time.",
    weight: 15,
  },
];

const RUBRIC_MAX_POINTS = RUBRIC_CRITERIA.reduce((sum, c) => sum + c.weight, 0); // 100

const RUBRIC_LEVELS = [
  { level: 1, name: "Inicial", description: "Evidências mínimas; grande dependência de adultos; pouca clareza ou segurança." },
  { level: 2, name: "Básico", description: "Algumas evidências; execução irregular; entendimento parcial do que foi feito." },
  { level: 3, name: "Proficiente", description: "Boa execução; documentação suficiente; cooperação visível; atende ao esperado." },
  { level: 4, name: "Avançado", description: "Evidências consistentes de qualidade; autonomia; comunicação clara; poucos erros." },
  { level: 5, name: "Destaque", description: "Excelência e consistência; melhoria contínua; impacto positivo; exemplar." },
];

function calculateRubricScore(levels) {
  levels = levels || {};
  const breakdown = RUBRIC_CRITERIA.map((criterion) => {
    const level = Math.max(0, Math.min(5, levels[criterion.id] || 0));
    const points = Math.round((level / 5) * criterion.weight);
    return { criterionId: criterion.id, level, points, weight: criterion.weight };
  });
  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { breakdown, total, maxPossible: RUBRIC_MAX_POINTS };
}
