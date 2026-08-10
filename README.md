# Torneio Maker de Robótica 2026 — Painel de pontuação

Versão do app em **HTML + CSS + JavaScript puro** — sem Node, sem build, sem
`npm install`. Basta abrir o arquivo, preencher duas linhas de configuração e
usar. Hospede em qualquer lugar (Vercel, Netlify, GitHub Pages).

Painel profissional em estilo *soft UI* (neumorfismo), pensado para leitura
rápida e uso confortável por professoras durante o torneio.

## O que há de novo nesta versão: fases do torneio

O torneio acontece em **3 fases independentes**, cada uma com suas próprias
pontuações:

| Fase | Quando | Quem pontua |
|---|---|---|
| **Seletiva 16/9** | 1ª seletiva | Todas as equipes cadastradas |
| **Seletiva 23/9** | 2ª seletiva | Todas as equipes cadastradas |
| **Final 03/10** | Etapa final | Só equipes marcadas como **classificadas** |

Um seletor de fase aparece no topo das páginas de pontuação, placar, rúbrica
e equipes — escolha a fase antes de lançar ou consultar pontos. As
pontuações de uma fase nunca se misturam com as de outra.

**A classificação para a final é sempre manual.** O sistema não corta
equipes automaticamente por posição no placar. Depois das seletivas, vá em
**Equipes** e ative o interruptor "Classificada" ao lado de cada equipe que
a coordenação decidir que avança. Só equipes marcadas aparecem para
pontuação quando a fase "Final 03/10" estiver selecionada.

As seletivas também servem como **ambiente de testes**: é o momento ideal
para as professoras se familiarizarem com o painel sem risco de atrapalhar
os dados da final. Veja o guia completo em `#/ajuda` dentro do app.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Página única que carrega tudo |
| `styles.css` | Identidade visual (neumorfismo, índigo) |
| `missions.js` | **Regras de pontuação** de cada ano, rúbrica e fases do torneio |
| `app.js` | Toda a lógica do app (rotas, telas, acesso ao banco) |
| `config.js` | Onde você cola as chaves do seu projeto Supabase |
| `supabase/schema.sql` | Script completo para criar as tabelas no Supabase |
| `supabase/migration_fases.sql` | Script de migração para quem já tinha a versão anterior (sem fases) rodando |

## Passo a passo

### 1. Criar o banco de dados no Supabase

**Primeira vez configurando o banco:** crie um projeto gratuito em
[supabase.com](https://supabase.com), abra o **SQL Editor**, cole todo o
conteúdo de `supabase/schema.sql` e clique em **Run**.

**Já tinha uma versão anterior rodando (sem fases)?** Basta rodar
`supabase/migration_fases.sql` — ele adiciona as colunas e views novas sem
apagar nenhuma pontuação já lançada. Tudo que já existia é tratado como
pertencente à Seletiva 16/9.

Em **Project Settings → API**, copie a **Project URL** e a chave **anon
public**.

### 2. Preencher `config.js`

```js
window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "sua-chave-anon-aqui",
};
```

Salve o arquivo — pronto, não precisa de mais nada.

### 3. Usar

**Localmente:** dê duplo clique em `index.html`. Se o navegador bloquear
alguma chamada por segurança (CORS em `file://`), rode um servidor local:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

**Publicado (recomendado):** hospede a pasta inteira como site estático —
Vercel, Netlify ou GitHub Pages, sem configurar build command nenhum.

## Onde ficam as regras de pontuação e as fases

Tudo está centralizado em `missions.js`:
- Regras de cada missão por ano (pontos, contadores, máximos).
- Lista de fases do torneio (`PHASES`) — se as datas mudarem, é só editar ali.
- Regras da rúbrica Equipe Destaque.

## Regras de cálculo já aplicadas pelo app

- Cada missão nunca ultrapassa o máximo de pontos definido no fichário.
- Cada penalidade desconta 5 pontos (nunca deixa o total ficar negativo).
- No placar, vale a **maior pontuação entre os dois rounds** de cada equipe, **dentro da fase selecionada**.
- Em caso de empate, o placar ordena pelo **menor tempo** do round de maior pontuação.
- Na rúbrica Equipe Destaque, pontos do critério = `round((nível ÷ 5) × peso)`.

## Estrutura de telas

| Rota (hash) | O que faz |
|---|---|
| `#/` | Início, com cronograma e resumo dos anos |
| `#/pontuar` | Escolher fase e ano/série |
| `#/pontuar/{ano}` | Cadastrar/escolher a equipe daquele ano, na fase atual |
| `#/pontuar/{ano}/{equipeId}` | Lançar a pontuação (Round 1 e 2) e penalidades, na fase atual |
| `#/destaque` | Avaliar a rúbrica Equipe Destaque por equipe e fase |
| `#/placar` | Placar ao vivo, por fase e ano, com atualização automática |
| `#/equipes` | Gestão geral + marcação manual de classificação para a final |
| `#/ajuda` | Guia da fase seletiva — passo a passo de uso e configuração |

## Segurança (nível básico)

Este projeto usa políticas de acesso abertas no Supabase (qualquer pessoa
com o link do app pode ler e gravar pontuações), pensado para uso interno
em um evento controlado.
