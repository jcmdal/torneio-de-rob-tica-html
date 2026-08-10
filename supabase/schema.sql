-- =============================================================================
-- Torneio Maker de Robótica 2026 — Schema do Supabase
-- Cole este arquivo inteiro no SQL Editor do seu projeto Supabase e clique
-- em "Run". Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS / OR
-- REPLACE) — inclusive se você já tinha rodado a versão anterior do schema,
-- este script faz a migração sozinho (adiciona a coluna "phase" e a coluna
-- de classificação sem apagar nada que já existia).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- EQUIPES
-- qualified_for_final: marcação manual feita pela professora, indicando que
-- a equipe está classificada para a fase final. Não é calculada automatica-
-- mente — a decisão de quem passa é sempre humana.
-- -----------------------------------------------------------------------------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  grade text not null,              -- ex: "4º ano"
  class text,                       -- turma
  name text not null,               -- nome da equipe
  students text,                    -- nomes dos alunos (texto livre)
  qualified_for_final boolean not null default false,
  created_at timestamptz not null default now()
);

-- migração segura caso a tabela já existisse sem esta coluna
alter table teams add column if not exists qualified_for_final boolean not null default false;

comment on table teams is 'Equipes participantes do torneio, por ano/série.';

-- -----------------------------------------------------------------------------
-- ROUNDS DE PONTUAÇÃO (missões)
-- Cada linha é UMA rodada pontuada de UMA equipe, em UMA fase do torneio.
-- phase: 'seletiva-16-9' | 'seletiva-23-9' | 'final-03-10'
-- mission_values guarda o que foi marcado no fichário, em JSON:
--   { "m1": { "sim": true, "empresas": 2 }, "m2": { "sim": true, "alerta": false }, ... }
-- -----------------------------------------------------------------------------
create table if not exists score_rounds (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  grade text not null,
  phase text not null default 'seletiva-16-9',
  round_number int not null default 1 check (round_number in (1,2)),
  mission_values jsonb not null default '{}'::jsonb,
  penalty_count int not null default 0 check (penalty_count >= 0),
  missions_total int not null default 0,   -- soma das missões, sem penalidade
  penalty_total int not null default 0,
  final_score int not null default 0,      -- missions_total - penalty_total (>= 0)
  round_time_seconds int,                  -- tempo do round, opcional
  judge_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- migração segura caso a tabela já existisse sem esta coluna
alter table score_rounds add column if not exists phase text not null default 'seletiva-16-9';

comment on table score_rounds is 'Pontuação de cada rodada (1 ou 2) de cada equipe, por fase (seletiva/final).';

create index if not exists idx_score_rounds_team on score_rounds(team_id);
create index if not exists idx_score_rounds_grade on score_rounds(grade);
create index if not exists idx_score_rounds_phase on score_rounds(phase);

-- uma equipe só pode ter 1 registro por (fase, round) — evita duplicidade
drop index if exists uq_score_rounds_team_phase_round;
create unique index uq_score_rounds_team_phase_round
  on score_rounds(team_id, phase, round_number);

-- -----------------------------------------------------------------------------
-- RÚBRICA "EQUIPE DESTAQUE"
-- Também é avaliada por fase (uma equipe pode ter uma nota na seletiva e
-- outra na final).
-- levels guarda o nível (1-5) escolhido para cada critério:
--   { "valores": 4, "projeto_inovacao": 5, "estrategia_iteracao": 3,
--     "desempenho_robo": 4, "documentacao_comunicacao": 5, "seguranca_organizacao": 4 }
-- -----------------------------------------------------------------------------
create table if not exists rubric_scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  grade text not null,
  phase text not null default 'seletiva-16-9',
  levels jsonb not null default '{}'::jsonb,
  total int not null default 0,
  judge_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rubric_scores add column if not exists phase text not null default 'seletiva-16-9';

comment on table rubric_scores is 'Avaliação da Rúbrica Equipe Destaque (máx. 100 pontos) por equipe e por fase.';

create index if not exists idx_rubric_scores_team on rubric_scores(team_id);
create index if not exists idx_rubric_scores_phase on rubric_scores(phase);

drop index if exists uq_rubric_scores_team_phase;
create unique index uq_rubric_scores_team_phase
  on rubric_scores(team_id, phase);

-- -----------------------------------------------------------------------------
-- Gatilho: manter updated_at em dia
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_score_rounds_updated_at on score_rounds;
create trigger trg_score_rounds_updated_at
  before update on score_rounds
  for each row execute function set_updated_at();

drop trigger if exists trg_rubric_scores_updated_at on rubric_scores;
create trigger trg_rubric_scores_updated_at
  before update on rubric_scores
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- VIEW: melhor rodada de cada equipe, DENTRO DE CADA FASE
-- Critério de desempate oficial: maior pontuação; em empate, menor tempo.
-- -----------------------------------------------------------------------------
create or replace view team_best_round as
select distinct on (team_id, phase)
  team_id,
  grade,
  phase,
  id as round_id,
  round_number,
  final_score,
  round_time_seconds
from score_rounds
order by team_id, phase, final_score desc, round_time_seconds asc nulls last, created_at asc;

-- -----------------------------------------------------------------------------
-- VIEW: placar geral (ranking) por equipe e por fase, juntando melhor
-- rodada + rubrica daquela mesma fase.
-- -----------------------------------------------------------------------------
create or replace view leaderboard as
select
  t.id as team_id,
  t.grade,
  t.class,
  t.name as team_name,
  t.qualified_for_final,
  b.phase,
  coalesce(b.final_score, 0) as best_round_score,
  b.round_number as best_round_number,
  b.round_time_seconds as best_round_time_seconds,
  coalesce(r.total, 0) as rubric_score
from teams t
inner join team_best_round b on b.team_id = t.id
left join rubric_scores r on r.team_id = t.id and r.phase = b.phase
order by t.grade, b.phase, best_round_score desc, best_round_time_seconds asc nulls last;

-- =============================================================================
-- SEGURANÇA (RLS)
-- Nesta primeira versão, liberamos leitura e escrita para simplificar o uso
-- com a chave "anon" a partir do app. Se depois você quiser reforçar a
-- segurança no nível do banco, troque estas políticas por regras que exijam
-- um usuário autenticado do Supabase Auth.
-- =============================================================================
alter table teams enable row level security;
alter table score_rounds enable row level security;
alter table rubric_scores enable row level security;

drop policy if exists "public read teams" on teams;
create policy "public read teams" on teams for select using (true);
drop policy if exists "public write teams" on teams;
create policy "public write teams" on teams for all using (true) with check (true);

drop policy if exists "public read score_rounds" on score_rounds;
create policy "public read score_rounds" on score_rounds for select using (true);
drop policy if exists "public write score_rounds" on score_rounds;
create policy "public write score_rounds" on score_rounds for all using (true) with check (true);

drop policy if exists "public read rubric_scores" on rubric_scores;
create policy "public read rubric_scores" on rubric_scores for select using (true);
drop policy if exists "public write rubric_scores" on rubric_scores;
create policy "public write rubric_scores" on rubric_scores for all using (true) with check (true);

-- =============================================================================
-- Fim do schema.
-- =============================================================================
