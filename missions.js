// =============================================================================
// REGRAS DE PONTUAÇÃO — Torneio Maker de Robótica 2026
// Fonte: fichário oficial (Guia do Torneio + Formulários de pontuação por ano
// + Rúbrica Equipe Destaque). Este é o ÚNICO lugar onde as regras de cálculo
// vivem — se o fichário mudar de um ano para o outro, é só editar aqui.
// =============================================================================

const PENALTY_POINTS = 5;

const GRADES = [
  {
    slug: "4-ano",
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
  {
    slug: "6-ano",
    grade: "6º ano",
    formLabel: "Torneio Maker de Robótica F2 - 2026",
    maxPoints: 60,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description: "Colocar um alerta que avisa quando torneiras ficarem abertas ou gotejando.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Levar as roupas doadas até um atendente da loja.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
      {
        id: "m3",
        title: "Missão 3",
        description: "Entregar os pacotes de cartões.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
    ],
  },
  {
    slug: "7-ano",
    grade: "7º ano",
    formLabel: "Torneio Maker de Robótica F2 - 2026",
    maxPoints: 60,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description: "Levar as frutas e verduras que não foram compradas.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Ligar o sensor de presença no pátio do mercado.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
      {
        id: "m3",
        title: "Missão 3",
        description: "Levar as torneiras com sensor de proximidade.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
    ],
  },
  {
    slug: "8-ano",
    grade: "8º ano",
    formLabel: "Torneio Maker de Robótica F2 - 2026",
    maxPoints: 70,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description:
          "Ativar um alarme quando o contêiner de lixo de uma rua contiver resíduos de material plástico descartável acima de 6 kg.",
        maxPoints: 30,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 }],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Ligar o sensor de presença no pátio do mercado.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
      {
        id: "m3",
        title: "Missão 3",
        description:
          "Coletar e levar os itens recicláveis que não poderão ser reutilizados até seu respectivo contêiner.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
    ],
  },
  {
    slug: "9-ano",
    grade: "9º ano",
    formLabel: "Torneio Maker de Robótica F2 - 2026",
    maxPoints: 60,
    missions: [
      {
        id: "m1",
        title: "Missão 1",
        description: "Levar o produto até a indústria para sua fabricação.",
        maxPoints: 30,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 30 }],
      },
      {
        id: "m2",
        title: "Missão 2",
        description: "Fazer a distribuição do produto até o comércio local para o consumo dos compradores.",
        maxPoints: 20,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 20 }],
      },
      {
        id: "m3",
        title: "Missão 3",
        description: "Fazer a coleta seletiva e reciclagem do produto para ser utilizado pela indústria.",
        maxPoints: 10,
        fields: [{ id: "sim", label: "Concluiu a missão", type: "boolean", points: 10 }],
      },
    ],
  },
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
// values: { [missionId]: { [fieldId]: boolean | number } }
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
      }
    }
    points = Math.min(points, mission.maxPoints);
    return { missionId: mission.id, points, maxPoints: mission.maxPoints };
  });

  const missionsTotal = missionBreakdown.reduce((sum, m) => sum + m.points, 0);
  const safePenaltyCount = Math.max(0, penaltyCount || 0);
  const penaltyTotal = safePenaltyCount * PENALTY_POINTS;
  const finalScore = Math.max(0, missionsTotal - penaltyTotal);

  return {
    missionBreakdown,
    missionsTotal,
    penaltyCount: safePenaltyCount,
    penaltyTotal,
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
