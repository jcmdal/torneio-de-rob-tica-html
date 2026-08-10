// =============================================================================
// Torneio Maker de Robótica 2026 — App (HTML + JS puro, sem build)
// =============================================================================

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
function isSupabaseConfigured() {
  return Boolean(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
}

let _sb = null;
function sb() {
  if (!_sb && isSupabaseConfigured()) {
    _sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  }
  return _sb;
}

// ---------------------------------------------------------------------------
// Camada de dados
// ---------------------------------------------------------------------------
const Data = {
  async listTeams(grade) {
    let q = sb().from("teams").select("*").order("name", { ascending: true });
    if (grade) q = q.eq("grade", grade);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getTeam(id) {
    const { data, error } = await sb().from("teams").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async createTeam({ grade, className, name, students }) {
    const { data, error } = await sb()
      .from("teams")
      .insert({ grade, class: className || null, name, students: students || null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTeam(id) {
    const { error } = await sb().from("teams").delete().eq("id", id);
    if (error) throw error;
  },

  async listRoundsForTeam(teamId) {
    const { data, error } = await sb()
      .from("score_rounds")
      .select("*")
      .eq("team_id", teamId)
      .order("round_number", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async upsertRound(input) {
    const payload = {
      mission_values: input.mission_values,
      penalty_count: input.penalty_count,
      missions_total: input.missions_total,
      penalty_total: input.penalty_total,
      final_score: input.final_score,
      round_time_seconds: input.round_time_seconds ?? null,
      judge_name: input.judge_name ?? null,
      notes: input.notes ?? null,
    };
    if (input.id) {
      const { data, error } = await sb().from("score_rounds").update(payload).eq("id", input.id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb()
      .from("score_rounds")
      .insert({
        team_id: input.team_id,
        grade: input.grade,
        round_number: input.round_number,
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getRubricForTeam(teamId) {
    const { data, error } = await sb().from("rubric_scores").select("*").eq("team_id", teamId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertRubric(input) {
    const payload = {
      levels: input.levels,
      total: input.total,
      judge_name: input.judge_name ?? null,
      notes: input.notes ?? null,
    };
    if (input.id) {
      const { data, error } = await sb().from("rubric_scores").update(payload).eq("id", input.id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await sb()
      .from("rubric_scores")
      .insert({ team_id: input.team_id, grade: input.grade, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getLeaderboard(grade) {
    let q = sb().from("leaderboard").select("*");
    if (grade) q = q.eq("grade", grade);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
};

// ---------------------------------------------------------------------------
// Helpers de DOM
// ---------------------------------------------------------------------------
function h(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTime(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Router (hash-based)
// ---------------------------------------------------------------------------
const routes = [];
function route(pattern, handler) {
  // pattern: "/pontuar/:grade/:teamId"
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern.replace(/:[a-zA-Z]+/g, (m) => {
        paramNames.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$"
  );
  routes.push({ regex, paramNames, handler });
}

async function renderRoute() {
  const hash = window.location.hash.slice(1) || "/";
  const path = hash.split("?")[0];
  const app = document.getElementById("app");

  for (const r of routes) {
    const match = path.match(r.regex);
    if (match) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      app.innerHTML = "";
      try {
        await r.handler(app, params);
      } catch (e) {
        console.error(e);
        app.appendChild(
          h(`<div class="container-mid section"><p class="banner-error">Ocorreu um erro: ${escapeHtml(e.message || String(e))}</p></div>`)
        );
      }
      renderNav(path);
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      return;
    }
  }
  app.innerHTML = "";
  app.appendChild(h(`<div class="container-mid section"><p>Página não encontrada.</p><a href="#/" class="btn btn-lime mt-3">Voltar ao início</a></div>`));
  renderNav(path);
}

window.addEventListener("hashchange", renderRoute);
window.addEventListener("DOMContentLoaded", () => {
  renderNavShell();
  renderRoute();
});

// ---------------------------------------------------------------------------
// NavBar
// ---------------------------------------------------------------------------
const NAV_LINKS = [
  { href: "#/", label: "Início" },
  { href: "#/pontuar", label: "Pontuar missões" },
  { href: "#/destaque", label: "Equipe destaque" },
  { href: "#/placar", label: "Placar" },
  { href: "#/equipes", label: "Equipes" },
  { href: "#/ajuda", label: "Como usar" },
];

function renderNavShell() {
  const nav = document.getElementById("navbar");
  nav.innerHTML = `
    <div class="container navbar-inner">
      <a href="#/" class="brand">
        <span class="brand-badge">⚡</span>
        <span class="brand-name">Torneio Maker de Robótica</span>
      </a>
      <nav class="nav-links" id="nav-links-desktop"></nav>
      <button class="nav-toggle" id="nav-toggle" aria-label="Abrir menu" aria-expanded="false">≡</button>
    </div>
    <nav class="nav-mobile" id="nav-links-mobile"></nav>
  `;

  document.getElementById("nav-toggle").addEventListener("click", () => {
    const mobile = document.getElementById("nav-links-mobile");
    const btn = document.getElementById("nav-toggle");
    const open = mobile.classList.toggle("open");
    btn.textContent = open ? "×" : "≡";
    btn.setAttribute("aria-expanded", String(open));
  });
}

function renderNav(currentPath) {
  const desktop = document.getElementById("nav-links-desktop");
  const mobile = document.getElementById("nav-links-mobile");
  const mobileWrap = document.getElementById("nav-links-mobile");
  mobileWrap.classList.remove("open");
  document.getElementById("nav-toggle").textContent = "≡";

  const linksHtml = (extraClass) =>
    NAV_LINKS.map((link) => {
      const active = link.href === `#${currentPath}`;
      return `<a href="${link.href}" class="nav-link ${extraClass || ""} ${active ? "active" : ""}">${link.label}</a>`;
    }).join("");

  desktop.innerHTML = linksHtml();
  mobile.innerHTML = linksHtml();
  mobile.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      mobile.classList.remove("open");
      document.getElementById("nav-toggle").textContent = "≡";
    })
  );
}

// ---------------------------------------------------------------------------
// Componente: banner de configuração pendente
// ---------------------------------------------------------------------------
function setupBannerHtml() {
  return `
    <div class="container-mid" style="padding-top:1.5rem;">
      <div class="banner-amber">
        <p class="font-display" style="font-weight:700;">⚠️ O banco de dados ainda não foi conectado</p>
        <p class="mt-1 text-muted" style="font-size:0.9rem;">
          Abra o arquivo <code class="inline-code">config.js</code> e preencha a URL e a chave
          <strong>anon public</strong> do seu projeto Supabase. Veja o passo a passo em
          <a href="#/ajuda" style="font-weight:600; text-decoration:underline;">Como usar</a>.
        </p>
      </div>
    </div>
  `;
}

// =============================================================================
// PÁGINA: Início
// =============================================================================
route("/", async (app) => {
  const schedule = [
    { segment: "8º e 9º anos", time: "8h00 – 10h00" },
    { segment: "6º e 7º anos", time: "10h00 – 12h00" },
    { segment: "4º e 5º anos", time: "12h00 – 14h00" },
  ];

  app.appendChild(
    h(`
    <div>
      <section class="hero circuit-bg">
        <div class="container hero-inner">
          <p class="eyebrow">03 / 10 / 2026 · QUADRA DO COLÉGIO SENEMBY</p>
          <h1>Painel de pontuação do Torneio Maker de Robótica</h1>
          <p>Feito para as professoras e o professor lançarem, na hora, os pontos de cada missão do fichário oficial — e verem o placar de cada ano se atualizar sozinho.</p>
          <div class="hero-actions">
            <a href="#/pontuar" class="btn btn-lime">Começar a pontuar →</a>
            <a href="#/ajuda" class="btn btn-outline">Como usar o app</a>
          </div>
        </div>
      </section>

      <section class="container section">
        <h2 class="font-display" style="font-size:1.5rem; font-weight:700;">Cronograma do dia</h2>
        <div class="grid-3 mt-6">
          ${schedule
            .map(
              (s) => `
            <div class="card">
              <p class="font-score" style="font-size:1.75rem; font-weight:700;">${s.time}</p>
              <p class="mt-1 text-muted" style="font-size:0.9rem; font-weight:500;">${s.segment}</p>
            </div>`
            )
            .join("")}
        </div>
        <p class="mt-4 text-muted" style="font-size:0.9rem;">
          Duas mesas de competição e telão para projeção da pontuação em tempo real. Cada equipe tem duas chances (rounds); vale a maior pontuação. Em caso de empate, vale o menor tempo do round de maior pontuação.
        </p>
      </section>

      <section class="container section-tight">
        <h2 class="font-display" style="font-size:1.5rem; font-weight:700;">Fichário por ano</h2>
        <p class="mt-2 text-muted">Cada série tem suas próprias missões e pontuação máxima, exatamente como no formulário impresso. Toque em um ano para ver o resumo das missões.</p>
        <div class="grid-3 mt-6" id="home-grades" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));"></div>
      </section>

      <section class="container section">
        <div class="grid-3">
          <div class="card-dark">
            <p class="font-score" style="font-size:1.75rem; font-weight:700; color:var(--amber);">-${PENALTY_POINTS}</p>
            <p class="mt-1" style="font-weight:600;">pontos por penalidade</p>
            <p class="mt-2 text-muted" style="font-size:0.9rem; color:rgba(246,243,234,0.65);">Cada violação de regra (ex.: tocar no robô fora da Área da Base) desconta ${PENALTY_POINTS} pontos do total de missões da rodada.</p>
          </div>
          <div class="card-dark">
            <p class="font-score" style="font-size:1.75rem; font-weight:700; color:var(--lime);">2 rounds</p>
            <p class="mt-1" style="font-weight:600;">vale a melhor rodada</p>
            <p class="mt-2 text-muted" style="font-size:0.9rem; color:rgba(246,243,234,0.65);">A equipe faz até duas tentativas; para a classificação, conta apenas a pontuação mais alta entre as duas.</p>
          </div>
          <div class="card-dark">
            <p class="font-score" style="font-size:1.75rem; font-weight:700; color:var(--lime);">100 pts</p>
            <p class="mt-1" style="font-weight:600;">Troféu Equipe Destaque</p>
            <p class="mt-2 text-muted" style="font-size:0.9rem; color:rgba(246,243,234,0.65);">Avaliação à parte, pela rúbrica de trabalho em equipe e cooperação — não entra no placar de missões.</p>
          </div>
        </div>
      </section>

      <footer class="site-footer">Torneio Maker de Robótica 2026 · Colégio Senemby · Apoio Sphera Educação</footer>
    </div>
  `)
  );

  const gradesEl = document.getElementById("home-grades");
  GRADES.forEach((g) => {
    gradesEl.appendChild(
      h(`
      <a href="#/pontuar/${g.slug}" class="card" style="cursor:pointer;">
        <div class="flex items-center justify-between">
          <h3 class="font-display" style="font-size:1.25rem; font-weight:700;">${g.grade}</h3>
          <span class="font-score text-faint" style="font-size:0.85rem;">máx.</span>
        </div>
        <p class="font-score mt-1" style="font-size:2.25rem; font-weight:700;">${g.maxPoints}<span style="font-size:1.1rem; font-family:'Inter',sans-serif; font-weight:500; color:rgba(18,33,29,0.5);"> pts</span></p>
        <p class="mt-2 text-muted" style="font-size:0.9rem;">${g.missions.length} missões · ${g.formLabel}</p>
        <span class="mt-3" style="display:inline-block; font-size:0.9rem; font-weight:600; color:var(--lime-deep);">Ver e pontuar →</span>
      </a>`)
    );
  });
});

// =============================================================================
// PÁGINA: Escolher ano para pontuar
// =============================================================================
route("/pontuar", async (app) => {
  app.appendChild(
    h(`
    <div class="container section">
      <h1 class="font-display" style="font-size:2rem; font-weight:700;">Qual ano você vai pontuar?</h1>
      <p class="mt-2 text-muted">Escolha a série para ver as missões do fichário e lançar a pontuação da equipe.</p>
      <div class="grid-3 mt-6" id="pontuar-grades" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));"></div>
    </div>
  `)
  );

  const el = document.getElementById("pontuar-grades");
  GRADES.forEach((g) => {
    el.appendChild(
      h(`
      <a href="#/pontuar/${g.slug}" class="card" style="cursor:pointer;">
        <h2 class="font-display" style="font-size:1.4rem; font-weight:700;">${g.grade}</h2>
        <p class="mt-1 text-muted" style="font-size:0.9rem;">${g.formLabel}</p>
        <p class="font-score mt-4" style="font-size:1.75rem; font-weight:700;">${g.maxPoints} <span style="font-size:1rem; font-family:'Inter',sans-serif; font-weight:500; color:rgba(18,33,29,0.5);">pts máx.</span></p>
        <span class="mt-3" style="display:inline-block; font-size:0.9rem; font-weight:600; color:var(--lime-deep);">Selecionar →</span>
      </a>`)
    );
  });
});

// =============================================================================
// PÁGINA: Equipes de um ano (cadastrar / escolher)
// =============================================================================
route("/pontuar/:grade", async (app, { grade: slug }) => {
  const config = getGradeBySlug(slug);
  if (!config) {
    app.appendChild(h(`<div class="container-mid section"><p>Ano não encontrado.</p></div>`));
    return;
  }

  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  const wrap = h(`
    <div class="container-narrow section">
      <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h1 class="font-display" style="font-size:2rem; font-weight:700;">${config.grade}</h1>
          <p class="text-muted">${config.formLabel} · máx. ${config.maxPoints} pts</p>
        </div>
        <button id="toggle-form-btn" class="btn btn-lime">+ Nova equipe</button>
      </div>
      <div id="pontuar-error"></div>
      <div id="team-form-wrap"></div>
      <div id="teams-list" class="mt-6"><p class="spinner-text">Carregando equipes…</p></div>
    </div>
  `);
  app.appendChild(wrap);

  const formWrap = wrap.querySelector("#team-form-wrap");
  const listWrap = wrap.querySelector("#teams-list");
  const errorWrap = wrap.querySelector("#pontuar-error");
  let showForm = false;

  function showError(msg) {
    errorWrap.innerHTML = msg ? `<p class="banner-error mt-4">${escapeHtml(msg)}</p>` : "";
  }

  function renderForm() {
    formWrap.innerHTML = "";
    if (!showForm) return;
    const formEl = h(`
      <form class="card mt-6" id="new-team-form">
        <h2 class="font-display" style="font-weight:700;">Cadastrar equipe</h2>
        <div class="grid-form-2 mt-4">
          <label class="field-label">Nome da equipe *
            <input required name="name" class="field-input" placeholder="Ex.: Robôs do Bem" />
          </label>
          <label class="field-label">Turma
            <input name="className" class="field-input" placeholder="Ex.: 4º A" />
          </label>
          <label class="field-label" style="grid-column:1/-1;">Nome dos alunos
            <textarea name="students" rows="2" class="field-input" placeholder="Ex.: Ana, Bruno, Carla, Davi"></textarea>
          </label>
        </div>
        <button type="submit" class="btn btn-ink mt-4">Salvar equipe</button>
      </form>
    `);
    formWrap.appendChild(formEl);
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(formEl);
      const name = String(fd.get("name") || "").trim();
      if (!name) return;
      const submitBtn = formEl.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Salvando…";
      try {
        await Data.createTeam({
          grade: config.grade,
          className: String(fd.get("className") || "").trim(),
          name,
          students: String(fd.get("students") || "").trim(),
        });
        showForm = false;
        renderForm();
        await loadTeams();
      } catch (err) {
        showError(err.message || "Erro ao criar equipe.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Salvar equipe";
      }
    });
  }

  wrap.querySelector("#toggle-form-btn").addEventListener("click", () => {
    showForm = !showForm;
    wrap.querySelector("#toggle-form-btn").textContent = showForm ? "Cancelar" : "+ Nova equipe";
    renderForm();
  });

  async function loadTeams() {
    listWrap.innerHTML = `<p class="spinner-text">Carregando equipes…</p>`;
    try {
      const teams = await Data.listTeams(config.grade);
      listWrap.innerHTML = "";
      if (teams.length === 0) {
        listWrap.appendChild(
          h(`<p class="dashed-empty">Nenhuma equipe cadastrada em ${escapeHtml(config.grade)} ainda. Toque em "+ Nova equipe" para começar.</p>`)
        );
        return;
      }
      const grid = h(`<div class="grid-2"></div>`);
      teams.forEach((team) => {
        const item = h(`
          <div class="card" style="position:relative;">
            <a href="#/pontuar/${slug}/${team.id}" style="display:block;">
              <p class="font-display" style="font-size:1.1rem; font-weight:700; padding-right:1.5rem;">${escapeHtml(team.name)}</p>
              <p class="text-muted" style="font-size:0.9rem;">${escapeHtml(team.class || "Turma não informada")}</p>
              ${team.students ? `<p class="mt-2 text-faint" style="font-size:0.8rem;">${escapeHtml(team.students)}</p>` : ""}
              <span class="mt-3" style="display:inline-block; font-size:0.9rem; font-weight:600; color:var(--lime-deep);">Pontuar →</span>
            </a>
            <button aria-label="Remover equipe" class="delete-team-btn" data-id="${team.id}" data-name="${escapeHtml(team.name)}"
              style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:rgba(18,33,29,0.3); font-size:1rem;">✕</button>
          </div>
        `);
        grid.appendChild(item);
      });
      listWrap.appendChild(grid);

      listWrap.querySelectorAll(".delete-team-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const name = btn.dataset.name;
          if (!confirm(`Remover a equipe "${name}" e todas as pontuações lançadas para ela?`)) return;
          try {
            await Data.deleteTeam(id);
            await loadTeams();
          } catch (err) {
            showError(err.message || "Erro ao remover equipe.");
          }
        });
      });
    } catch (err) {
      showError(err.message || "Erro ao carregar equipes.");
      listWrap.innerHTML = "";
    }
  }

  await loadTeams();
});

// =============================================================================
// PÁGINA: Pontuar uma equipe (missões, penalidades, rounds)
// =============================================================================
route("/pontuar/:grade/:teamId", async (app, { grade: slug, teamId }) => {
  const config = getGradeBySlug(slug);
  if (!config) {
    app.appendChild(h(`<div class="container-mid section"><p>Ano não encontrado.</p></div>`));
    return;
  }
  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  app.appendChild(h(`<div class="container-mid section"><p class="spinner-text">Carregando equipe…</p></div>`));

  let team;
  try {
    team = await Data.getTeam(teamId);
  } catch (err) {
    app.innerHTML = "";
    app.appendChild(h(`<div class="container-mid section"><p class="banner-error">${escapeHtml(err.message)}</p></div>`));
    return;
  }

  if (!team) {
    app.innerHTML = "";
    app.appendChild(
      h(`<div class="container-mid section">
        <p class="text-muted">Equipe não encontrada.</p>
        <a href="#/pontuar/${slug}" class="mt-2" style="display:inline-block; font-weight:600; color:var(--lime-deep);">← Voltar para ${escapeHtml(config.grade)}</a>
      </div>`)
    );
    return;
  }

  app.innerHTML = "";

  function emptyValues() {
    const values = {};
    config.missions.forEach((mission) => {
      values[mission.id] = {};
      mission.fields.forEach((field) => {
        values[mission.id][field.id] = field.type === "boolean" ? false : 0;
      });
    });
    return values;
  }

  const state = {
    roundNumber: 1,
    existingRounds: [],
    values: emptyValues(),
    penaltyCount: 0,
    timeSeconds: "",
    judgeName: "",
    notes: "",
  };

  const root = h(`
    <div class="container-mid section">
      <a href="#/pontuar/${slug}" style="font-size:0.9rem; font-weight:500; color:rgba(18,33,29,0.6);">← Voltar para ${escapeHtml(config.grade)}</a>
      <div class="flex items-center justify-between mt-2" style="flex-wrap:wrap; gap:0.75rem; align-items:flex-end;">
        <div>
          <h1 class="font-display" style="font-size:2rem; font-weight:700;">${escapeHtml(team.name)}</h1>
          <p class="text-muted">${escapeHtml(config.grade)} · ${escapeHtml(team.class || "turma não informada")}</p>
        </div>
        <div id="best-score-badge"></div>
      </div>

      <div class="round-tabs mt-6" id="round-tabs"></div>
      <div id="score-error"></div>
      <div id="score-body" class="mt-6"><p class="spinner-text">Carregando…</p></div>
    </div>
  `);
  app.appendChild(root);

  const bestBadge = root.querySelector("#best-score-badge");
  const roundTabsEl = root.querySelector("#round-tabs");
  const errorEl = root.querySelector("#score-error");
  const bodyEl = root.querySelector("#score-body");

  function showError(msg) {
    errorEl.innerHTML = msg ? `<p class="banner-error mt-4">${escapeHtml(msg)}</p>` : "";
  }

  function renderBestBadge() {
    const best = Math.max(0, ...state.existingRounds.map((r) => r.final_score));
    if (state.existingRounds.length === 0) {
      bestBadge.innerHTML = "";
      return;
    }
    bestBadge.innerHTML = `
      <div style="border-radius:0.75rem; background:var(--ink); padding:0.5rem 1rem; text-align:right;">
        <p style="font-size:0.75rem; color:rgba(246,243,234,0.6);">Melhor pontuação</p>
        <p class="font-score" style="font-size:1.5rem; font-weight:700; color:var(--lime);">${best} pts</p>
      </div>`;
  }

  function renderRoundTabs() {
    roundTabsEl.innerHTML = "";
    [1, 2].forEach((n) => {
      const existing = state.existingRounds.find((r) => r.round_number === n);
      const btn = h(`
        <button class="round-tab ${state.roundNumber === n ? "active" : ""}">
          Round ${n} ${existing ? `· ${existing.final_score} pts` : "· não lançado"}
        </button>`);
      btn.addEventListener("click", () => {
        state.roundNumber = n;
        loadRoundIntoForm();
        renderRoundTabs();
        renderBody();
      });
      roundTabsEl.appendChild(btn);
    });
  }

  function loadRoundIntoForm() {
    const existing = state.existingRounds.find((r) => r.round_number === state.roundNumber);
    if (existing) {
      state.values = existing.mission_values || emptyValues();
      state.penaltyCount = existing.penalty_count || 0;
      state.timeSeconds = existing.round_time_seconds != null ? String(existing.round_time_seconds) : "";
      state.judgeName = existing.judge_name || "";
      state.notes = existing.notes || "";
    } else {
      state.values = emptyValues();
      state.penaltyCount = 0;
      state.timeSeconds = "";
      state.notes = "";
    }
  }

  function computeResult() {
    return calculateRoundScore(config, state.values, state.penaltyCount);
  }

  function renderBody() {
    const result = computeResult();
    bodyEl.innerHTML = "";

    const missionsWrap = h(`<div></div>`);
    config.missions.forEach((mission) => {
      const missionScore = result.missionBreakdown.find((m) => m.missionId === mission.id).points;
      const card = h(`
        <div class="mission-card">
          <div class="mission-header">
            <div>
              <h3 class="font-display" style="font-weight:700;">${escapeHtml(mission.title)}</h3>
              <p class="mt-1 text-muted" style="font-size:0.9rem;">${escapeHtml(mission.description)}</p>
            </div>
            <p class="mission-score font-score">${missionScore}<small>/${mission.maxPoints}</small></p>
          </div>
          <div class="mission-fields" data-mission="${mission.id}"></div>
        </div>
      `);
      const fieldsWrap = card.querySelector(".mission-fields");

      mission.fields.forEach((field) => {
        const raw = state.values[mission.id][field.id];
        if (field.type === "boolean") {
          const checked = raw === true;
          const label = h(`
            <label class="bool-field ${checked ? "checked" : ""}">
              <span style="font-weight:500;">${escapeHtml(field.label)} <span class="text-faint">(+${field.points} pts)</span></span>
              <input type="checkbox" ${checked ? "checked" : ""} />
            </label>`);
          label.querySelector("input").addEventListener("change", (e) => {
            state.values[mission.id][field.id] = e.target.checked;
            renderBody();
          });
          fieldsWrap.appendChild(label);
        } else {
          const count = Number(raw) || 0;
          const max = field.maxUnits || 0;
          const row = h(`
            <div class="counter-field">
              <span style="font-weight:500;">${escapeHtml(field.label)} <span class="text-faint">(+${field.pointsPerUnit} pts cada, máx ${max})</span></span>
              <div class="counter-controls">
                <button type="button" class="counter-btn" data-dir="-1" aria-label="Diminuir">−</button>
                <span class="counter-value font-score">${count}</span>
                <button type="button" class="counter-btn" data-dir="1" aria-label="Aumentar">+</button>
              </div>
            </div>`);
          row.querySelectorAll(".counter-btn").forEach((b) =>
            b.addEventListener("click", () => {
              const dir = Number(b.dataset.dir);
              const next = Math.max(0, Math.min(count + dir, max));
              state.values[mission.id][field.id] = next;
              renderBody();
            })
          );
          fieldsWrap.appendChild(row);
        }
      });

      missionsWrap.appendChild(card);
    });
    bodyEl.appendChild(missionsWrap);

    // Penalidades
    const penaltyCard = h(`
      <div class="mission-card" style="border-color:rgba(255,122,61,0.5); background:rgba(255,122,61,0.1);">
        <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:0.75rem;">
          <div>
            <h3 class="font-display" style="font-weight:700;">Penalidades</h3>
            <p class="text-muted" style="font-size:0.9rem;">${PENALTY_POINTS} pontos descontados por violação de regra.</p>
          </div>
          <div class="counter-controls">
            <button type="button" id="penalty-minus" class="counter-btn" style="border-color:var(--amber);" aria-label="Diminuir penalidade">−</button>
            <span class="font-score" style="width:2rem; text-align:center; font-size:1.5rem; font-weight:700;">${state.penaltyCount}</span>
            <button type="button" id="penalty-plus" class="counter-btn" style="border-color:var(--amber);" aria-label="Aumentar penalidade">+</button>
          </div>
        </div>
        ${state.penaltyCount > 0 ? `<p class="mt-2 font-score" style="font-size:0.9rem; font-weight:700; color:var(--amber);">−${result.penaltyTotal} pts no total</p>` : ""}
      </div>
    `);
    penaltyCard.querySelector("#penalty-minus").addEventListener("click", () => {
      state.penaltyCount = Math.max(0, state.penaltyCount - 1);
      renderBody();
    });
    penaltyCard.querySelector("#penalty-plus").addEventListener("click", () => {
      state.penaltyCount += 1;
      renderBody();
    });
    bodyEl.appendChild(penaltyCard);

    // Tempo / juiz / observações
    const metaCard = h(`
      <div class="card mission-card">
        <div class="grid-form-2">
          <label class="field-label">Tempo do round (segundos)
            <input type="number" min="0" id="field-time" class="field-input" placeholder="Ex.: 145" value="${escapeHtml(state.timeSeconds)}" />
          </label>
          <label class="field-label">Juiz(a)
            <input id="field-judge" class="field-input" placeholder="Seu nome" value="${escapeHtml(state.judgeName)}" />
          </label>
          <label class="field-label" style="grid-column:1/-1;">Observações
            <textarea id="field-notes" rows="2" class="field-input">${escapeHtml(state.notes)}</textarea>
          </label>
        </div>
      </div>
    `);
    metaCard.querySelector("#field-time").addEventListener("input", (e) => (state.timeSeconds = e.target.value));
    metaCard.querySelector("#field-judge").addEventListener("input", (e) => (state.judgeName = e.target.value));
    metaCard.querySelector("#field-notes").addEventListener("input", (e) => (state.notes = e.target.value));
    bodyEl.appendChild(metaCard);

    // Resumo fixo
    const summary = h(`
      <div class="sticky-summary">
        <div class="summary-row">
          <div>
            <p style="font-size:0.9rem; color:rgba(246,243,234,0.6);">Missões: ${result.missionsTotal} pts · Penalidades: −${result.penaltyTotal} pts</p>
            <p class="font-score summary-score">${result.finalScore}<span> / ${result.maxPossible} pts</span></p>
          </div>
          <button id="save-round-btn" class="btn btn-lime">Salvar Round ${state.roundNumber}</button>
        </div>
        <p id="saved-msg" class="mt-2" style="font-size:0.9rem; font-weight:600; color:var(--lime);"></p>
      </div>
    `);
    summary.querySelector("#save-round-btn").addEventListener("click", () => handleSave(summary));
    bodyEl.appendChild(summary);
  }

  async function handleSave(summaryEl) {
    const btn = summaryEl.querySelector("#save-round-btn");
    const msgEl = summaryEl.querySelector("#saved-msg");
    btn.disabled = true;
    btn.textContent = "Salvando…";
    showError(null);
    try {
      const result = computeResult();
      const existing = state.existingRounds.find((r) => r.round_number === state.roundNumber);
      await Data.upsertRound({
        id: existing?.id,
        team_id: team.id,
        grade: config.grade,
        round_number: state.roundNumber,
        mission_values: state.values,
        penalty_count: state.penaltyCount,
        missions_total: result.missionsTotal,
        penalty_total: result.penaltyTotal,
        final_score: result.finalScore,
        round_time_seconds: state.timeSeconds ? Number(state.timeSeconds) : null,
        judge_name: state.judgeName || null,
        notes: state.notes || null,
      });
      msgEl.textContent = `Round ${state.roundNumber} salvo com sucesso.`;
      await loadRounds();
    } catch (err) {
      showError(err.message || "Erro ao salvar pontuação.");
    } finally {
      btn.disabled = false;
      btn.textContent = `Salvar Round ${state.roundNumber}`;
    }
  }

  async function loadRounds() {
    try {
      state.existingRounds = await Data.listRoundsForTeam(team.id);
      renderBestBadge();
      renderRoundTabs();
    } catch (err) {
      showError(err.message || "Erro ao carregar rodadas.");
    }
  }

  await loadRounds();
  loadRoundIntoForm();
  renderBody();
});

// =============================================================================
// PÁGINA: Rúbrica Equipe Destaque
// =============================================================================
const RUBRIC_GRADE_OPTIONS = ["4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano"];

route("/destaque", async (app) => {
  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  function emptyLevels() {
    const levels = {};
    RUBRIC_CRITERIA.forEach((c) => (levels[c.id] = 0));
    return levels;
  }

  const state = {
    grade: RUBRIC_GRADE_OPTIONS[0],
    teams: [],
    teamId: "",
    existing: null,
    levels: emptyLevels(),
    judgeName: "",
    notes: "",
  };

  const root = h(`
    <div class="container-mid section">
      <h1 class="font-display" style="font-size:2rem; font-weight:700;">Rúbrica — Equipe Destaque</h1>
      <p class="mt-2 text-muted">Avaliação de trabalho em equipe e cooperação (máx. ${RUBRIC_MAX_POINTS} pontos), separada do placar de missões. Marque um nível de 1 a 5 para cada critério.</p>

      <div class="grid-form-2 mt-6">
        <label class="field-label">Ano / série
          <select id="rubric-grade-select" class="field-input"></select>
        </label>
        <label class="field-label">Equipe
          <select id="rubric-team-select" class="field-input"></select>
        </label>
      </div>

      <div id="rubric-error"></div>
      <div id="rubric-body" class="mt-6"></div>
    </div>
  `);
  app.appendChild(root);

  const gradeSelect = root.querySelector("#rubric-grade-select");
  const teamSelect = root.querySelector("#rubric-team-select");
  const errorEl = root.querySelector("#rubric-error");
  const bodyEl = root.querySelector("#rubric-body");

  RUBRIC_GRADE_OPTIONS.forEach((g) => gradeSelect.appendChild(h(`<option value="${g}">${g}</option>`)));
  gradeSelect.value = state.grade;

  function showError(msg) {
    errorEl.innerHTML = msg ? `<p class="banner-error mt-4">${escapeHtml(msg)}</p>` : "";
  }

  async function loadTeams() {
    teamSelect.innerHTML = "";
    teamSelect.disabled = true;
    try {
      state.teams = await Data.listTeams(state.grade);
      if (state.teams.length === 0) {
        teamSelect.appendChild(h(`<option value="">Nenhuma equipe cadastrada</option>`));
        state.teamId = "";
      } else {
        state.teams.forEach((t) => teamSelect.appendChild(h(`<option value="${t.id}">${escapeHtml(t.name)}</option>`)));
        teamSelect.disabled = false;
        state.teamId = state.teams[0].id;
        teamSelect.value = state.teamId;
      }
      showError(null);
    } catch (err) {
      showError(err.message || "Erro ao carregar equipes.");
    }
    await loadRubric();
  }

  async function loadRubric() {
    bodyEl.innerHTML = "";
    if (!state.teamId) return;
    try {
      const rubric = await Data.getRubricForTeam(state.teamId);
      state.existing = rubric;
      state.levels = (rubric && rubric.levels) || emptyLevels();
      state.judgeName = (rubric && rubric.judge_name) || "";
      state.notes = (rubric && rubric.notes) || "";
      renderRubricBody();
    } catch (err) {
      showError(err.message || "Erro ao carregar rúbrica.");
    }
  }

  function computeResult() {
    return calculateRubricScore(state.levels);
  }

  function renderRubricBody() {
    const result = computeResult();
    bodyEl.innerHTML = "";

    RUBRIC_CRITERIA.forEach((criterion) => {
      const level = state.levels[criterion.id] || 0;
      const points = result.breakdown.find((b) => b.criterionId === criterion.id).points;
      const card = h(`
        <div class="mission-card">
          <div class="mission-header">
            <div>
              <h3 class="font-display" style="font-weight:700;">${escapeHtml(criterion.name)}</h3>
              <p class="mt-1 text-muted" style="font-size:0.9rem;">${escapeHtml(criterion.description)}</p>
            </div>
            <p class="mission-score font-score">${points}<small>/${criterion.weight}</small></p>
          </div>
          <div class="level-grid"></div>
        </div>
      `);
      const grid = card.querySelector(".level-grid");
      RUBRIC_LEVELS.forEach((lvl) => {
        const btn = h(`
          <button type="button" class="level-btn ${level === lvl.level ? "active" : ""}" title="${escapeHtml(lvl.name)}: ${escapeHtml(lvl.description)}">
            <strong>${lvl.level}</strong>
            <small>${escapeHtml(lvl.name)}</small>
          </button>`);
        btn.addEventListener("click", () => {
          state.levels[criterion.id] = lvl.level;
          renderRubricBody();
        });
        grid.appendChild(btn);
      });
      bodyEl.appendChild(card);
    });

    const metaCard = h(`
      <div class="card mission-card">
        <div class="grid-form-2">
          <label class="field-label">Professor(a) / Juiz(a)
            <input id="rubric-judge" class="field-input" value="${escapeHtml(state.judgeName)}" />
          </label>
          <label class="field-label">Observações
            <input id="rubric-notes" class="field-input" value="${escapeHtml(state.notes)}" />
          </label>
        </div>
      </div>
    `);
    metaCard.querySelector("#rubric-judge").addEventListener("input", (e) => (state.judgeName = e.target.value));
    metaCard.querySelector("#rubric-notes").addEventListener("input", (e) => (state.notes = e.target.value));
    bodyEl.appendChild(metaCard);

    const summary = h(`
      <div class="sticky-summary">
        <div class="summary-row">
          <div>
            <p style="font-size:0.9rem; color:rgba(246,243,234,0.6);">Total da rúbrica</p>
            <p class="font-score summary-score">${result.total}<span> / ${result.maxPossible} pts</span></p>
          </div>
          <button id="save-rubric-btn" class="btn btn-lime">Salvar avaliação</button>
        </div>
        <p id="rubric-saved-msg" class="mt-2" style="font-size:0.9rem; font-weight:600; color:var(--lime);"></p>
      </div>
    `);
    summary.querySelector("#save-rubric-btn").addEventListener("click", () => handleSaveRubric(summary));
    bodyEl.appendChild(summary);
  }

  async function handleSaveRubric(summaryEl) {
    const btn = summaryEl.querySelector("#save-rubric-btn");
    const msgEl = summaryEl.querySelector("#rubric-saved-msg");
    btn.disabled = true;
    btn.textContent = "Salvando…";
    showError(null);
    try {
      const result = computeResult();
      const saved = await Data.upsertRubric({
        id: state.existing?.id,
        team_id: state.teamId,
        grade: state.grade,
        levels: state.levels,
        total: result.total,
        judge_name: state.judgeName || null,
        notes: state.notes || null,
      });
      state.existing = saved;
      msgEl.textContent = "Avaliação salva com sucesso.";
    } catch (err) {
      showError(err.message || "Erro ao salvar avaliação.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Salvar avaliação";
    }
  }

  gradeSelect.addEventListener("change", async (e) => {
    state.grade = e.target.value;
    await loadTeams();
  });
  teamSelect.addEventListener("change", async (e) => {
    state.teamId = e.target.value;
    await loadRubric();
  });

  await loadTeams();
});

// =============================================================================
// PÁGINA: Placar
// =============================================================================
route("/placar", async (app) => {
  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  const GRADE_FILTERS = ["Todos", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano"];
  const state = { grade: "Todos", autoRefresh: true, timer: null };

  const root = h(`
    <div class="container-mid section">
      <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h1 class="font-display" style="font-size:2rem; font-weight:700;">Placar</h1>
          <p class="text-muted">Atualiza sozinho a cada poucos segundos.</p>
        </div>
        <label class="flex items-center gap-2" style="font-size:0.9rem; font-weight:500; color:rgba(18,33,29,0.7);">
          <input type="checkbox" id="auto-refresh-toggle" checked style="height:1rem;width:1rem;accent-color:var(--lime-deep);" />
          Atualização automática
        </label>
      </div>

      <div class="flex gap-2 mt-4" id="grade-filters" style="flex-wrap:wrap;"></div>
      <div id="placar-error"></div>
      <div id="placar-body" class="mt-6"><p class="spinner-text">Carregando placar…</p></div>
    </div>
  `);
  app.appendChild(root);

  const filtersEl = root.querySelector("#grade-filters");
  const errorEl = root.querySelector("#placar-error");
  const bodyEl = root.querySelector("#placar-body");
  const autoToggle = root.querySelector("#auto-refresh-toggle");

  function showError(msg) {
    errorEl.innerHTML = msg ? `<p class="banner-error mt-4">${escapeHtml(msg)}</p>` : "";
  }

  GRADE_FILTERS.forEach((g) => {
    const btn = h(`<button class="chip ${state.grade === g ? "active" : ""}">${g}</button>`);
    btn.addEventListener("click", async () => {
      state.grade = g;
      filtersEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      await loadLeaderboard();
    });
    filtersEl.appendChild(btn);
  });

  async function loadLeaderboard() {
    try {
      const rows = await Data.getLeaderboard(state.grade === "Todos" ? undefined : state.grade);
      rows.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        if (b.best_round_score !== a.best_round_score) return b.best_round_score - a.best_round_score;
        const at = a.best_round_time_seconds ?? Infinity;
        const bt = b.best_round_time_seconds ?? Infinity;
        return at - bt;
      });
      showError(null);
      renderRows(rows);
    } catch (err) {
      showError(err.message || "Erro ao carregar placar.");
    }
  }

  function renderRows(rows) {
    bodyEl.innerHTML = "";
    if (rows.length === 0) {
      bodyEl.appendChild(h(`<p class="dashed-empty">Ainda não há pontuações lançadas.</p>`));
      return;
    }
    const byGrade = new Map();
    rows.forEach((row) => {
      const arr = byGrade.get(row.grade) || [];
      arr.push(row);
      byGrade.set(row.grade, arr);
    });

    byGrade.forEach((teams, grade) => {
      const section = h(`
        <div style="margin-bottom:2rem;">
          <h2 class="font-display" style="font-size:1.35rem; font-weight:700;">${escapeHtml(grade)}</h2>
          <div class="leaderboard-wrap">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipe</th>
                  <th class="num">Missões</th>
                  <th class="num">Tempo</th>
                  <th class="num">Destaque</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      `);
      const tbody = section.querySelector("tbody");
      teams.forEach((row, i) => {
        tbody.appendChild(
          h(`
          <tr>
            <td class="font-score" style="font-weight:700; color:rgba(18,33,29,0.6);">${i + 1}</td>
            <td>
              <p style="font-weight:600;">${escapeHtml(row.team_name)}</p>
              ${row.class ? `<p class="text-faint" style="font-size:0.75rem;">${escapeHtml(row.class)}</p>` : ""}
            </td>
            <td class="num font-score" style="font-size:1.1rem; font-weight:700;">${row.best_round_score}</td>
            <td class="num font-score text-muted" style="font-size:0.85rem;">${formatTime(row.best_round_time_seconds)}</td>
            <td class="num font-score text-muted" style="font-size:0.85rem;">${row.rubric_score > 0 ? `${row.rubric_score}/100` : "—"}</td>
          </tr>
        `)
        );
      });
      bodyEl.appendChild(section);
    });
  }

  function scheduleAutoRefresh() {
    if (state.timer) clearInterval(state.timer);
    if (state.autoRefresh) {
      state.timer = setInterval(loadLeaderboard, 8000);
    }
  }

  autoToggle.addEventListener("change", (e) => {
    state.autoRefresh = e.target.checked;
    scheduleAutoRefresh();
  });

  // limpa o timer ao sair da página
  window.addEventListener(
    "hashchange",
    () => {
      if (state.timer) clearInterval(state.timer);
    },
    { once: true }
  );

  await loadLeaderboard();
  scheduleAutoRefresh();
});

// =============================================================================
// PÁGINA: Equipes (gestão geral)
// =============================================================================
route("/equipes", async (app) => {
  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  const root = h(`
    <div class="container-mid section">
      <h1 class="font-display" style="font-size:2rem; font-weight:700;">Equipes</h1>
      <p class="mt-2 text-muted">Todas as equipes cadastradas, organizadas por ano. Para adicionar uma equipe, acesse a página de pontuação do ano desejado.</p>
      <div id="equipes-error"></div>
      <div id="equipes-body" class="mt-6"><p class="spinner-text">Carregando equipes…</p></div>
    </div>
  `);
  app.appendChild(root);

  const errorEl = root.querySelector("#equipes-error");
  const bodyEl = root.querySelector("#equipes-body");

  function showError(msg) {
    errorEl.innerHTML = msg ? `<p class="banner-error mt-4">${escapeHtml(msg)}</p>` : "";
  }

  async function loadAll() {
    bodyEl.innerHTML = `<p class="spinner-text">Carregando equipes…</p>`;
    try {
      const teams = await Data.listTeams();
      const byGrade = new Map();
      GRADES.forEach((g) => byGrade.set(g.grade, []));
      teams.forEach((t) => {
        const arr = byGrade.get(t.grade) || [];
        arr.push(t);
        byGrade.set(t.grade, arr);
      });

      bodyEl.innerHTML = "";
      byGrade.forEach((list, grade) => {
        const slug = getSlugByGrade(grade);
        const section = h(`
          <div style="margin-bottom:2rem;">
            <div class="flex items-center justify-between">
              <h2 class="font-display" style="font-size:1.35rem; font-weight:700;">${escapeHtml(grade)}</h2>
              <a href="#/pontuar/${slug}" style="font-size:0.9rem; font-weight:600; color:var(--lime-deep);">+ adicionar equipe</a>
            </div>
            <div class="equipes-list-inner mt-3"></div>
          </div>
        `);
        const inner = section.querySelector(".equipes-list-inner");
        if (list.length === 0) {
          inner.appendChild(h(`<p class="dashed-empty" style="padding:1rem;">Nenhuma equipe cadastrada ainda.</p>`));
        } else {
          const grid = h(`<div class="grid-2"></div>`);
          list.forEach((team) => {
            const row = h(`
              <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem;">
                <a href="#/pontuar/${slug}/${team.id}" style="flex:1;">
                  <p style="font-weight:600;">${escapeHtml(team.name)}</p>
                  <p class="text-faint" style="font-size:0.75rem;">${escapeHtml(team.class || "turma não informada")}</p>
                </a>
                <button aria-label="Remover" class="del-btn" data-id="${team.id}" data-name="${escapeHtml(team.name)}"
                  style="background:none; border:none; color:rgba(18,33,29,0.3); font-size:1rem; margin-left:0.75rem;">✕</button>
              </div>
            `);
            grid.appendChild(row);
          });
          inner.appendChild(grid);
        }
        bodyEl.appendChild(section);
      });

      bodyEl.querySelectorAll(".del-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const name = btn.dataset.name;
          if (!confirm(`Remover a equipe "${name}" e todas as pontuações lançadas para ela?`)) return;
          try {
            await Data.deleteTeam(id);
            await loadAll();
          } catch (err) {
            showError(err.message || "Erro ao remover equipe.");
          }
        });
      });

      showError(null);
    } catch (err) {
      showError(err.message || "Erro ao carregar equipes.");
      bodyEl.innerHTML = "";
    }
  }

  await loadAll();
});

// =============================================================================
// PÁGINA: Ajuda / Como usar
// =============================================================================
route("/ajuda", async (app) => {
  const steps = [
    {
      title: "Cadastre a equipe (uma única vez)",
      body: 'Vá em "Pontuar missões", escolha o ano da equipe e toque em "+ Nova equipe". Preencha o nome da equipe, a turma e os alunos.',
    },
    {
      title: "Abra a equipe e escolha o round",
      body: "Toque na equipe cadastrada. Escolha Round 1 ou Round 2 no topo da tela — a equipe joga duas vezes, e vale a maior pontuação.",
    },
    {
      title: "Marque as missões durante a partida",
      body: "Para cada missão, marque os itens concluídos (como no fichário de papel). Contadores como número de empresas ou torneiras têm botões de + e −. A pontuação total aparece na tela na hora.",
    },
    {
      title: "Registre as penalidades",
      body: `Toda vez que a equipe tocar no robô fora da Área da Base ou violar uma regra, toque em "+" nas Penalidades. Cada uma desconta ${PENALTY_POINTS} pontos.`,
    },
    {
      title: "Preencha tempo e juiz(a), e salve",
      body: 'Anote o tempo do round (em segundos) — ele decide o desempate. Toque em "Salvar Round" para gravar no banco de dados. O placar atualiza sozinho.',
    },
    {
      title: "Avalie a Equipe Destaque (separado)",
      body: 'Na aba "Equipe destaque", escolha a equipe e marque um nível de 1 a 5 para cada um dos 6 critérios. Essa nota não entra no placar de missões.',
    },
  ];

  app.appendChild(
    h(`
    <div class="container-narrow section">
      <h1 class="font-display" style="font-size:2rem; font-weight:700;">Como usar</h1>
      <p class="mt-2 text-muted">Guia rápido para professoras e professor no dia do torneio, além do passo a passo para configurar o aplicativo pela primeira vez.</p>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.4rem; font-weight:700;">No dia do torneio</h2>
        <ol id="ajuda-steps" style="list-style:none; margin:1rem 0 0; padding:0; display:flex; flex-direction:column; gap:1rem;"></ol>
      </section>

      <section class="mt-6 card-dark">
        <h2 class="font-display" style="font-size:1.2rem; font-weight:700;">Regras que o app já aplica sozinho</h2>
        <ul style="margin:0.75rem 0 0; padding-left:1.1rem; font-size:0.9rem; color:rgba(246,243,234,0.75); display:flex; flex-direction:column; gap:0.4rem;">
          <li>A pontuação de cada missão nunca passa do máximo definido no fichário.</li>
          <li>Penalidades descontam ${PENALTY_POINTS} pontos cada, sem deixar o total ficar negativo.</li>
          <li>No placar, vale sempre a maior pontuação entre os dois rounds da equipe.</li>
          <li>Em caso de empate na pontuação, o placar ordena pelo menor tempo do round.</li>
        </ul>
      </section>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.4rem; font-weight:700;">Configuração inicial (só quem for publicar o app)</h2>
        <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
          <div class="card">
            <p class="font-display" style="font-weight:700;">1. Criar o banco de dados no Supabase</p>
            <p class="mt-1 text-muted" style="font-size:0.9rem;">Crie um projeto gratuito em supabase.com. No SQL Editor do projeto, cole o conteúdo do arquivo <code class="inline-code">supabase/schema.sql</code> (incluído nesta pasta) e clique em "Run". Isso cria as tabelas de equipes, pontuações e a rúbrica.</p>
          </div>
          <div class="card">
            <p class="font-display" style="font-weight:700;">2. Pegar as chaves do projeto</p>
            <p class="mt-1 text-muted" style="font-size:0.9rem;">Em Project Settings → API, copie a "Project URL" e a chave <strong>anon public</strong>.</p>
          </div>
          <div class="card">
            <p class="font-display" style="font-weight:700;">3. Preencher o config.js</p>
            <p class="mt-1 text-muted" style="font-size:0.9rem;">Abra o arquivo <code class="inline-code">config.js</code> desta pasta e preencha:</p>
            <pre class="code-block">window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "sua-chave-anon-aqui",
};</pre>
          </div>
          <div class="card">
            <p class="font-display" style="font-weight:700;">4. Abrir o aplicativo</p>
            <p class="mt-1 text-muted" style="font-size:0.9rem;">Não precisa de instalação nem build: é só abrir o arquivo <code class="inline-code">index.html</code> em um navegador, ou hospedar a pasta inteira em qualquer serviço de arquivos estáticos (Vercel, Netlify, GitHub Pages, ou até um pen drive).</p>
          </div>
        </div>
      </section>
    </div>
  `)
  );

  const stepsEl = document.getElementById("ajuda-steps");
  steps.forEach((step, i) => {
    stepsEl.appendChild(
      h(`
      <li class="card" style="display:flex; gap:1rem; align-items:flex-start;">
        <span class="font-score" style="display:grid; place-items:center; height:2.25rem; width:2.25rem; flex-shrink:0; border-radius:999px; background:var(--lime); font-weight:700;">${i + 1}</span>
        <div>
          <p class="font-display" style="font-weight:700;">${escapeHtml(step.title)}</p>
          <p class="mt-1 text-muted" style="font-size:0.9rem;">${escapeHtml(step.body)}</p>
        </div>
      </li>`)
    );
  });
});
