# Torneio Maker de Robótica 2026 — Painel de pontuação (versão HTML)

Versão do app em **HTML + CSS + JavaScript puro** — sem Node, sem build, sem
`npm install`. Basta abrir o arquivo, preencher duas linhas de configuração e
usar. Ideal para hospedar em qualquer lugar (Vercel, Netlify, GitHub Pages,
ou até rodar direto do computador no dia do evento).

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Página única que carrega tudo |
| `styles.css` | Identidade visual (grafite-verde, lima, âmbar) |
| `missions.js` | **Regras de pontuação** de cada ano + rúbrica Equipe Destaque |
| `app.js` | Toda a lógica do app (rotas, telas, acesso ao banco) |
| `config.js` | Onde você cola as chaves do seu projeto Supabase |
| `supabase/schema.sql` | Script para criar as tabelas no Supabase |

## Passo a passo

### 1. Criar o banco de dados no Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e
   clique em **Run**. Isso cria as tabelas `teams`, `score_rounds`,
   `rubric_scores` e as views `team_best_round` / `leaderboard`.
3. Em **Project Settings → API**, copie a **Project URL** e a chave
   **anon public**.

### 2. Preencher `config.js`

Abra o arquivo `config.js` em qualquer editor de texto e preencha:

```js
window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "sua-chave-anon-aqui",
};
```

Salve o arquivo — pronto, não precisa de mais nada.

### 3. Usar

**Localmente:** dê duplo clique em `index.html` para abrir no navegador.
Se o navegador bloquear alguma chamada por segurança (CORS em `file://`),
rode um servidor local simples a partir desta pasta:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

**Publicado (recomendado para o dia do evento):** hospede a pasta inteira
como site estático:

- **Vercel:** `vercel deploy` na pasta, ou arraste a pasta em vercel.com/new
  (sem configurar nada — é HTML puro, não precisa de "build command").
- **Netlify:** arraste a pasta em app.netlify.com/drop.
- **GitHub Pages:** suba os arquivos para um repositório e ative o Pages
  nas configurações do repositório.

## Onde ficam as regras de pontuação

Todas as regras de cada missão (pontos, contadores, máximos por ano) estão
centralizadas em `missions.js`. Se o fichário do torneio mudar de um ano
para o outro, esse é o único arquivo que precisa ser editado.

## Regras de cálculo já aplicadas pelo app

- Cada missão nunca ultrapassa o máximo de pontos definido no fichário.
- Cada penalidade desconta 5 pontos (nunca deixa o total ficar negativo).
- No placar, vale a **maior pontuação entre os dois rounds** de cada equipe.
- Em caso de empate, o placar ordena pelo **menor tempo** do round de maior
  pontuação.
- Na rúbrica Equipe Destaque, pontos do critério = `round((nível ÷ 5) × peso)`.

## Estrutura de telas

| Rota (hash) | O que faz |
|---|---|
| `#/` | Início, com cronograma e resumo dos anos |
| `#/pontuar` | Escolher o ano/série |
| `#/pontuar/{ano}` | Cadastrar/escolher a equipe daquele ano |
| `#/pontuar/{ano}/{equipeId}` | Lançar a pontuação (Round 1 e 2) e penalidades |
| `#/destaque` | Avaliar a rúbrica Equipe Destaque por equipe |
| `#/placar` | Placar ao vivo, por ano, com atualização automática |
| `#/equipes` | Gestão geral de todas as equipes cadastradas |
| `#/ajuda` | Passo a passo de uso e configuração |

## Segurança (nível básico)

Este projeto usa políticas de acesso abertas no Supabase (qualquer pessoa
com o link do app pode ler e gravar pontuações), pensado para uso interno
em um evento controlado. Se quiser reforçar isso depois, dá para trocar as
políticas RLS no `schema.sql` para exigir login, ou colocar uma senha simples
de acesso na própria página.
