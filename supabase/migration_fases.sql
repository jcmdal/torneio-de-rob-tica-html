-- =============================================================================
-- MIGRAÇÃO — adiciona suporte a fases (Seletiva 16/9, Seletiva 23/9, Final)
-- e classificação manual de equipes para a final.
--
-- Rode este script SOMENTE SE você já tinha executado uma versão anterior
-- do schema.sql (sem a coluna "phase"). Se está configurando o banco pela
-- primeira vez, não precisa rodar este arquivo — o schema.sql já inclui
-- tudo isso.
--
-- Este script é seguro para rodar mais de uma vez.
-- =============================================================================

-- Todas as pontuações já lançadas antes desta migração são tratadas como
-- pertencentes à primeira seletiva (16/9), já que era a única fase existente.
alter table teams add column if not exists qualified_for_final boolean not null default false;

alter table score_rounds add column if not exists phase text not null default 'seletiva-16-9';
alter table rubric_scores add column if not exists phase text not null default 'seletiva-16-9';

create index if not exists idx_score_rounds_phase on score_rounds(phase);
create index if not exists idx_rubric_scores_phase on rubric_scores(phase);

drop index if exists uq_score_rounds_team_phase_round;
create unique index uq_score_rounds_team_phase_round
  on score_rounds(team_id, phase, round_number);

drop index if exists uq_rubric_scores_team_phase;
create unique index uq_rubric_scores_team_phase
  on rubric_scores(team_id, phase);

-- Recria as views para considerar a fase
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

-- Fim da migração.
