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
// Estado global de fase (Seletiva 16/9, Seletiva 23/9, Final)
// Persistido em sessionStorage para lembrar a escolha durante a navegação,
// mas sempre pode ser trocado pela barra de fase no topo de cada página.
// ---------------------------------------------------------------------------
const AppState = {
  get phase() {
    return sessionStorage.getItem("tmr_phase") || DEFAULT_PHASE_SLUG;
  },
  set phase(slug) {
    sessionStorage.setItem("tmr_phase", slug);
  },
};

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

  async setQualified(id, qualified) {
    const { data, error } = await sb()
      .from("teams")
      .update({ qualified_for_final: qualified })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listRoundsForTeam(teamId, phase) {
    let q = sb().from("score_rounds").select("*").eq("team_id", teamId).order("round_number", { ascending: true });
    if (phase) q = q.eq("phase", phase);
    const { data, error } = await q;
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
        phase: input.phase,
        round_number: input.round_number,
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getRubricForTeam(teamId, phase) {
    const { data, error } = await sb()
      .from("rubric_scores")
      .select("*")
      .eq("team_id", teamId)
      .eq("phase", phase)
      .maybeSingle();
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
      .insert({ team_id: input.team_id, grade: input.grade, phase: input.phase, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getLeaderboard(phase, grade) {
    let q = sb().from("leaderboard").select("*");
    if (phase) q = q.eq("phase", phase);
    if (grade) q = q.eq("grade", grade);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // -------------------------------------------------------------------------
  // Ações administrativas (reset de pontuações). Usadas apenas pela página
  // /admin, protegida por senha.
  // -------------------------------------------------------------------------
  async resetRoundsByPhase(phase) {
    const { error } = await sb().from("score_rounds").delete().eq("phase", phase);
    if (error) throw error;
  },

  async resetRubricByPhase(phase) {
    const { error } = await sb().from("rubric_scores").delete().eq("phase", phase);
    if (error) throw error;
  },

  async resetAllQualifications() {
    const { error } = await sb().from("teams").update({ qualified_for_final: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
  },

  async resetEverything() {
    const { error: e1 } = await sb().from("score_rounds").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e1) throw e1;
    const { error: e2 } = await sb().from("rubric_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e2) throw e2;
    const { error: e3 } = await sb().from("teams").update({ qualified_for_final: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (e3) throw e3;
  },

  async deleteAllTeams() {
    const { error } = await sb().from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
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
      window.scrollTo(0, 0);
      return;
    }
  }
  app.innerHTML = "";
  app.appendChild(h(`<div class="container-mid section"><p>Página não encontrada.</p><a href="#/" class="btn btn-primary mt-3">Voltar ao início</a></div>`));
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
  { href: "#/ajuda", label: "Guia da seletiva" },
];

function renderNavShell() {
  const nav = document.getElementById("navbar");
  nav.innerHTML = `
    <div class="container navbar-inner">
      <a href="#/" class="brand">
        <span class="brand-badge">⚡</span>
        <span class="brand-name">Torneio Maker de Robótica
          <span class="brand-sub">Painel de pontuação · Col. Senemby</span>
        </span>
      </a>
      <nav class="nav-links" id="nav-links-desktop"></nav>
      <div class="flex items-center gap-2">
        <a href="#/admin" class="nav-toggle" id="nav-admin-btn" aria-label="Configurações" title="Configurações">⚙️</a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Abrir menu" aria-expanded="false">≡</button>
      </div>
    </div>
    <nav class="container nav-mobile" id="nav-links-mobile"></nav>
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
  mobile.classList.remove("open");
  document.getElementById("nav-toggle").textContent = "≡";

  const linksHtml = () =>
    NAV_LINKS.map((link) => {
      const active = link.href === `#${currentPath}`;
      return `<a href="${link.href}" class="nav-link ${active ? "active" : ""}">${link.label}</a>`;
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
// Componente: seletor de fase (usado nas páginas de pontuar/destaque/placar/equipes)
// ---------------------------------------------------------------------------
function renderPhaseBar(container, { onChange } = {}) {
  container.innerHTML = "";
  const bar = h(`
    <div class="phase-bar">
      <div class="phase-bar-inner">
        <span class="phase-bar-label">Fase do torneio</span>
        <div class="phase-tabs" id="phase-tabs"></div>
      </div>
    </div>
  `);
  container.appendChild(bar);
  const tabsEl = bar.querySelector("#phase-tabs");

  PHASES.forEach((p) => {
    const active = AppState.phase === p.slug;
    const btn = h(`<button class="phase-tab ${p.kind} ${active ? "active" : ""}">${p.short}</button>`);
    btn.addEventListener("click", () => {
      if (AppState.phase === p.slug) return;
      AppState.phase = p.slug;
      renderPhaseBar(container, { onChange });
      if (onChange) onChange(p.slug);
    });
    tabsEl.appendChild(btn);
  });

  return bar;
}

function phaseBadgeHtml(phaseSlug) {
  const phase = getPhaseBySlug(phaseSlug) || PHASES[0];
  return `<span class="phase-badge ${phase.kind}"><span class="dot"></span>${escapeHtml(phase.label)}</span>`;
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
          <a href="#/ajuda" style="font-weight:700; color:var(--color-accent-dark);">Guia da seletiva</a>.
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
      <section class="container hero-inner">
        <div class="card hero-card">
          <span class="eyebrow">📅 FASE ATUAL: ${PHASES.find((p) => p.slug === AppState.phase)?.label || ""}</span>
          <h1>Painel de pontuação do Torneio Maker de Robótica</h1>
          <p>Feito para as professoras e o professor lançarem, na hora, os pontos de cada missão do fichário oficial — nas seletivas e na final — e verem o placar de cada ano se atualizar sozinho.</p>
          <div class="hero-actions">
            <a href="#/pontuar" class="btn btn-primary">Começar a pontuar →</a>
            <a href="#/ajuda" class="btn btn-secondary">Guia da fase seletiva</a>
          </div>
        </div>
      </section>

      <section class="container section-tight">
        <h2 class="font-display" style="font-size:1.4rem; font-weight:700;">Fases do torneio</h2>
        <div class="grid-3 mt-4" id="home-phases"></div>
      </section>

      <section class="container section">
        <h2 class="font-display" style="font-size:1.4rem; font-weight:700;">Cronograma do dia</h2>
        <div class="grid-3 mt-4">
          ${schedule
            .map(
              (s) => `
            <div class="card">
              <p class="font-score" style="font-size:1.7rem; font-weight:700; color:var(--color-accent-dark);">${s.time}</p>
              <p class="mt-1 text-muted" style="font-size:0.9rem; font-weight:600;">${s.segment}</p>
            </div>`
            )
            .join("")}
        </div>
        <p class="mt-4 text-muted" style="font-size:0.9rem;">
          Duas mesas de competição. Cada equipe tem duas chances (rounds) por fase; vale a maior pontuação. Em caso de empate, vale o menor tempo do round de maior pontuação.
        </p>
      </section>

      <section class="container section-tight">
        <h2 class="font-display" style="font-size:1.4rem; font-weight:700;">Fichário por ano</h2>
        <p class="mt-2 text-muted">Cada série tem suas próprias missões e pontuação máxima, exatamente como no formulário impresso.</p>
        <div class="grid-3 mt-4" id="home-grades" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));"></div>
      </section>

      <section class="container section">
        <div class="grid-3">
          <div class="card-dark">
            <p class="font-score" style="font-size:1.7rem; font-weight:700; color:#fca5a5;">-${PENALTY_POINTS}</p>
            <p class="mt-1" style="font-weight:700;">pontos por penalidade</p>
            <p class="mt-2" style="font-size:0.88rem; color:rgba(244,245,251,0.7);">Cada vez que a equipe tocar no robô fora da Área da Base até o cumprimento da tarefa desconta ${PENALTY_POINTS} pontos.</p>
          </div>
          <div class="card-dark">
            <p class="font-score" style="font-size:1.7rem; font-weight:700; color:#a5b4fc;">2 rounds</p>
            <p class="mt-1" style="font-weight:700;">vale a melhor rodada</p>
            <p class="mt-2" style="font-size:0.88rem; color:rgba(244,245,251,0.7);">Em cada fase, a equipe faz até duas tentativas; para a classificação, conta apenas a pontuação mais alta entre as duas.</p>
          </div>
          <div class="card-dark">
            <p class="font-score" style="font-size:1.7rem; font-weight:700; color:#a5b4fc;">100 pts</p>
            <p class="mt-1" style="font-weight:700;">Troféu Equipe Destaque</p>
            <p class="mt-2" style="font-size:0.88rem; color:rgba(244,245,251,0.7);">Avaliação à parte, pela rúbrica de trabalho em equipe e cooperação — não entra no placar de missões.</p>
          </div>
        </div>
      </section>

      <footer class="site-footer">Torneio Maker de Robótica 2026 · Colégio Senemby · Apoio Sphera Educação</footer>
    </div>
  `)
  );

  const phasesEl = document.getElementById("home-phases");
  const phaseIcon = { final: "🏆", treino: "🧪", seletiva: "" };
  const phaseDesc = {
    final: "Só equipes classificadas",
    treino: "Não conta ponto — com cronômetro",
    seletiva: "Aberta para testes e pontuação",
  };
  PHASES.forEach((p) => {
    phasesEl.appendChild(
      h(`
      <a href="#/pontuar" class="card" style="cursor:pointer;" data-phase="${p.slug}">
        <div class="flex items-center justify-between">
          <h3 class="font-display" style="font-size:1.1rem; font-weight:700;">${p.label}</h3>
          ${phaseIcon[p.kind] ? `<span style="font-size:1.2rem;">${phaseIcon[p.kind]}</span>` : ""}
        </div>
        <p class="mt-2 text-muted" style="font-size:0.85rem;">${phaseDesc[p.kind]}</p>
      </a>`)
    );
  });
  phasesEl.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      AppState.phase = a.dataset.phase;
    })
  );

  const gradesEl = document.getElementById("home-grades");
  GRADES.forEach((g) => {
    gradesEl.appendChild(
      h(`
      <a href="#/pontuar/${g.slug}" class="card" style="cursor:pointer;">
        <div class="flex items-center justify-between">
          <h3 class="font-display" style="font-size:1.2rem; font-weight:700;">${g.grade}</h3>
          <span class="font-score text-faint" style="font-size:0.8rem;">máx.</span>
        </div>
        <p class="font-score mt-1" style="font-size:2.1rem; font-weight:700; color:var(--color-accent-dark);">${g.maxPoints}<span style="font-size:1.05rem; font-family:var(--font-main); font-weight:600; color:var(--color-text-faint);"> pts</span></p>
        <p class="mt-2 text-muted" style="font-size:0.85rem;">${g.missions.length} missões · ${g.formLabel}</p>
        <span class="mt-3" style="display:inline-block; font-size:0.85rem; font-weight:700; color:var(--color-accent-dark);">Ver e pontuar →</span>
      </a>`)
    );
  });
});

// =============================================================================
// PÁGINA: Escolher ano para pontuar
// =============================================================================
route("/pontuar", async (app) => {
  const root = h(`
    <div class="container section">
      <div id="phase-bar-wrap"></div>
      <h1 class="font-display mt-4" style="font-size:1.9rem; font-weight:700;">Qual ano você vai pontuar?</h1>
      <p class="mt-2 text-muted">Escolha a série para ver as missões do fichário e lançar a pontuação da equipe nesta fase.</p>
      <div class="grid-3 mt-6" id="pontuar-grades" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));"></div>
    </div>
  `);
  app.appendChild(root);

  renderPhaseBar(root.querySelector("#phase-bar-wrap"));

  const el = root.querySelector("#pontuar-grades");
  GRADES.forEach((g) => {
    el.appendChild(
      h(`
      <a href="#/pontuar/${g.slug}" class="card" style="cursor:pointer;">
        <h2 class="font-display" style="font-size:1.3rem; font-weight:700;">${g.grade}</h2>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">${g.formLabel}</p>
        <p class="font-score mt-4" style="font-size:1.6rem; font-weight:700; color:var(--color-accent-dark);">${g.maxPoints} <span style="font-size:0.95rem; font-family:var(--font-main); font-weight:600; color:var(--color-text-faint);">pts máx.</span></p>
        <span class="mt-3" style="display:inline-block; font-size:0.85rem; font-weight:700; color:var(--color-accent-dark);">Selecionar →</span>
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
      <div id="phase-bar-wrap"></div>
      <div class="flex items-center justify-between mt-4" style="flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h1 class="font-display" style="font-size:1.9rem; font-weight:700;">${escapeHtml(config.grade)}</h1>
          <p class="text-muted">${escapeHtml(config.formLabel)} · máx. ${config.maxPoints} pts</p>
        </div>
        <button id="toggle-form-btn" class="btn btn-primary">+ Nova equipe</button>
      </div>
      <div id="pontuar-error"></div>
      <div id="team-form-wrap"></div>
      <div id="teams-list" class="mt-6"><p class="spinner-text">Carregando equipes…</p></div>
    </div>
  `);
  app.appendChild(wrap);

  renderPhaseBar(wrap.querySelector("#phase-bar-wrap"), { onChange: () => loadTeams() });

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
        <button type="submit" class="btn btn-primary mt-4">Salvar equipe</button>
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
    const currentPhase = getPhaseBySlug(AppState.phase);
    listWrap.innerHTML = `<p class="spinner-text">Carregando equipes…</p>`;
    try {
      let teams = await Data.listTeams(config.grade);
      // na fase final, mostra só equipes marcadas como classificadas
      if (currentPhase.kind === "final") {
        teams = teams.filter((t) => t.qualified_for_final);
      }
      listWrap.innerHTML = "";

      if (currentPhase.kind === "final" && teams.length === 0) {
        listWrap.appendChild(
          h(`<p class="dashed-empty">Nenhuma equipe de ${escapeHtml(config.grade)} está marcada como classificada para a final ainda.<br/>Marque a classificação na página <a href="#/equipes" style="color:var(--color-accent-dark); font-weight:700;">Equipes</a>, com base nos resultados das seletivas.</p>`)
        );
        return;
      }

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
              <p class="font-display" style="font-size:1.05rem; font-weight:700; padding-right:1.5rem;">${escapeHtml(team.name)}</p>
              <p class="text-muted" style="font-size:0.85rem;">${escapeHtml(team.class || "Turma não informada")}</p>
              ${team.students ? `<p class="mt-2 text-faint" style="font-size:0.78rem;">${escapeHtml(team.students)}</p>` : ""}
              <div class="flex items-center gap-2 mt-3">
                <span style="font-size:0.85rem; font-weight:700; color:var(--color-accent-dark);">Pontuar →</span>
                ${team.qualified_for_final ? '<span class="qualified-pill">✓ Classificada</span>' : ""}
              </div>
            </a>
            <button aria-label="Remover equipe" class="delete-team-btn" data-id="${team.id}" data-name="${escapeHtml(team.name)}"
              style="position:absolute; top:1.1rem; right:1.1rem; background:none; border:none; color:var(--color-text-faint); font-size:1rem;">✕</button>
          </div>
        `);
        grid.appendChild(item);
      });
      listWrap.appendChild(grid);

      listWrap.querySelectorAll(".delete-team-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const name = btn.dataset.name;
          if (!confirm(`Remover a equipe "${name}" e todas as pontuações lançadas para ela (em todas as fases)?`)) return;
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
// PÁGINA: Pontuar uma equipe (missões, penalidades, rounds) — dentro da fase atual
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
        <a href="#/pontuar/${slug}" class="mt-2" style="display:inline-block; font-weight:700; color:var(--color-accent-dark);">← Voltar para ${escapeHtml(config.grade)}</a>
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
    phase: AppState.phase,
    roundNumber: 1,
    existingRounds: [],
    values: emptyValues(),
    penaltyCount: 0,
    timeSeconds: "",
    judgeName: "",
    notes: "",
    timerRunning: false,
    timerElapsedMs: 0,
    timerStartedAt: null,
  };

  let timerIntervalId = null;

  function formatStopwatch(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function currentElapsedMs() {
    if (state.timerRunning && state.timerStartedAt) {
      return state.timerElapsedMs + (Date.now() - state.timerStartedAt);
    }
    return state.timerElapsedMs;
  }

  function toggleTimer() {
    if (state.timerRunning) {
      // pausar: consolida o tempo decorrido
      state.timerElapsedMs = currentElapsedMs();
      state.timerRunning = false;
      state.timerStartedAt = null;
    } else {
      state.timerRunning = true;
      state.timerStartedAt = Date.now();
    }
    renderBody();
  }

  function resetTimer() {
    state.timerRunning = false;
    state.timerStartedAt = null;
    state.timerElapsedMs = 0;
    renderBody();
  }

  function startTimerTick() {
    if (timerIntervalId) clearInterval(timerIntervalId);
    timerIntervalId = setInterval(() => {
      if (!state.timerRunning) return;
      const displayEl = document.getElementById("timer-display");
      if (displayEl) {
        displayEl.textContent = formatStopwatch(currentElapsedMs());
      }
    }, 500);
  }
  startTimerTick();
  window.addEventListener("hashchange", () => timerIntervalId && clearInterval(timerIntervalId), { once: true });

  const root = h(`
    <div class="container-mid section">
      <a href="#/pontuar/${slug}" style="font-size:0.88rem; font-weight:600; color:var(--color-text-muted);">← Voltar para ${escapeHtml(config.grade)}</a>
      <div id="phase-bar-wrap" class="mt-2"></div>

      <div class="flex items-center justify-between mt-4" style="flex-wrap:wrap; gap:0.75rem; align-items:flex-end;">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-display" style="font-size:1.9rem; font-weight:700;">${escapeHtml(team.name)}</h1>
            ${team.qualified_for_final ? '<span class="qualified-pill">✓ Classificada</span>' : ""}
          </div>
          <p class="text-muted">${escapeHtml(config.grade)} · ${escapeHtml(team.class || "turma não informada")}</p>
        </div>
        <div id="best-score-badge"></div>
      </div>

      <div class="round-tabs mt-6" id="round-tabs"></div>
      <div id="mat-image-wrap" class="mt-4"></div>
      <div id="score-error"></div>
      <div id="score-body" class="mt-6"><p class="spinner-text">Carregando…</p></div>
    </div>
  `);
  app.appendChild(root);

  renderPhaseBar(root.querySelector("#phase-bar-wrap"), {
    onChange: async (newPhase) => {
      state.phase = newPhase;
      state.roundNumber = 1;
      resetTimer();
      await loadRounds();
      loadRoundIntoForm();
      renderBody();
    },
  });

  const bestBadge = root.querySelector("#best-score-badge");
  const roundTabsEl = root.querySelector("#round-tabs");
  const matImageWrap = root.querySelector("#mat-image-wrap");
  const errorEl = root.querySelector("#score-error");
  const bodyEl = root.querySelector("#score-body");

  if (config.matImage) {
    matImageWrap.appendChild(
      h(`
      <details class="card" style="padding:0;">
        <summary style="cursor:pointer; padding:1rem 1.25rem; font-weight:700; font-size:0.9rem; list-style:none; display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
          <span>🗺️ Ver tapete com as missões 1, 2 e 3 (${escapeHtml(config.grade)})</span>
          <span class="text-faint" style="font-weight:500; font-size:0.8rem;">toque para abrir/fechar</span>
        </summary>
        <div style="padding:0 1.25rem 1.25rem;">
          <img src="${config.matImage}" alt="Tapete do torneio com a localização das missões 1, 2 e 3 do ${escapeHtml(config.grade)}"
            style="width:100%; height:auto; border-radius:var(--radius-sm); box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light); display:block;" />
        </div>
      </details>
    `)
    );
  }

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
      <div class="card" style="padding:0.65rem 1.2rem; text-align:right;">
        <p style="font-size:0.72rem; font-weight:700; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.04em;">Melhor pontuação · ${escapeHtml(getPhaseBySlug(state.phase).short)}</p>
        <p class="font-score" style="font-size:1.5rem; font-weight:700; color:var(--color-accent-dark);">${best} pts</p>
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
        resetTimer();
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
              <p class="mt-1 text-muted" style="font-size:0.88rem;">${escapeHtml(mission.description)}</p>
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
              <span class="bool-label">${escapeHtml(field.label)} <span class="text-faint" style="font-weight:500;">(+${field.points} pts)</span></span>
              <span class="check-visual">✓</span>
              <input type="checkbox" style="display:none;" ${checked ? "checked" : ""} />
            </label>`);
          label.addEventListener("click", (e) => {
            e.preventDefault();
            state.values[mission.id][field.id] = !checked;
            renderBody();
          });
          fieldsWrap.appendChild(label);
        } else {
          const count = Number(raw) || 0;
          const max = field.maxUnits || 0;
          const row = h(`
            <div class="counter-field">
              <span class="bool-label">${escapeHtml(field.label)} <span class="text-faint" style="font-weight:500;">(+${field.pointsPerUnit} pts cada, máx ${max})</span></span>
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
      <div class="mission-card" style="border-left:4px solid var(--color-warning);">
        <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:0.75rem;">
          <div>
            <h3 class="font-display" style="font-weight:700;">Penalidades</h3>
            <p class="text-muted" style="font-size:0.88rem;">${PENALTY_POINTS} pontos descontados cada vez que a equipe tocar no robô fora da Área da Base.</p>
          </div>
          <div class="counter-controls">
            <button type="button" id="penalty-minus" class="counter-btn" aria-label="Diminuir penalidade">−</button>
            <span class="font-score" style="width:2rem; text-align:center; font-size:1.5rem; font-weight:700;">${state.penaltyCount}</span>
            <button type="button" id="penalty-plus" class="counter-btn" aria-label="Aumentar penalidade">+</button>
          </div>
        </div>
        ${state.penaltyCount > 0 ? `<p class="mt-2 font-score" style="font-size:0.9rem; font-weight:700; color:var(--color-danger);">−${result.penaltyTotal} pts no total</p>` : ""}
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

    // Cronômetro (só na fase Treino) — ajuda a professora a cronometrar o
    // round de teste e já preenche o campo de tempo automaticamente.
    if (getPhaseBySlug(state.phase).kind === "treino") {
      const timerCard = h(`
        <div class="mission-card" style="border-left:4px solid #64748b;">
          <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:0.75rem;">
            <div>
              <h3 class="font-display" style="font-weight:700;">🧪 Cronômetro de treino</h3>
              <p class="text-muted" style="font-size:0.88rem;">Use para cronometrar o round de teste. Ao parar, o tempo é preenchido automaticamente abaixo.</p>
            </div>
            <div class="flex items-center gap-3">
              <span id="timer-display" class="font-score" style="font-size:2rem; font-weight:700; color:var(--color-text); min-width:4.5ch; text-align:center;">${formatStopwatch(state.timerElapsedMs)}</span>
            </div>
          </div>
          <div class="flex gap-2 mt-3" style="flex-wrap:wrap;">
            <button type="button" id="timer-toggle" class="btn ${state.timerRunning ? "btn-danger" : "btn-primary"}">${state.timerRunning ? "⏸ Pausar" : "▶ Iniciar"}</button>
            <button type="button" id="timer-reset" class="btn btn-secondary">↺ Zerar</button>
            <button type="button" id="timer-apply" class="btn btn-secondary">✓ Usar este tempo no round</button>
          </div>
        </div>
      `);
      timerCard.querySelector("#timer-toggle").addEventListener("click", () => toggleTimer());
      timerCard.querySelector("#timer-reset").addEventListener("click", () => resetTimer());
      timerCard.querySelector("#timer-apply").addEventListener("click", () => {
        state.timeSeconds = String(Math.round(state.timerElapsedMs / 1000));
        renderBody();
      });
      bodyEl.appendChild(timerCard);
    }

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
            <p style="font-size:0.85rem; color:rgba(244,245,251,0.6); font-weight:600;">${escapeHtml(getPhaseBySlug(state.phase).label)} · Missões: ${result.missionsTotal} pts · Penalidades: −${result.penaltyTotal} pts</p>
            <p class="font-score summary-score">${result.finalScore}<span> / ${result.maxPossible} pts</span></p>
          </div>
          <button id="save-round-btn" class="btn btn-primary">Salvar Round ${state.roundNumber}</button>
        </div>
        <p id="saved-msg" class="mt-2" style="font-size:0.88rem; font-weight:700; color:#a5b4fc;"></p>
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
        phase: state.phase,
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
      msgEl.textContent = `Round ${state.roundNumber} salvo com sucesso (${getPhaseBySlug(state.phase).label}).`;
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
      state.existingRounds = await Data.listRoundsForTeam(team.id, state.phase);
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
// PÁGINA: Rúbrica Equipe Destaque (por fase)
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
    phase: AppState.phase,
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
      <div id="phase-bar-wrap"></div>
      <h1 class="font-display mt-4" style="font-size:1.9rem; font-weight:700;">Rúbrica — Equipe Destaque</h1>
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

  renderPhaseBar(root.querySelector("#phase-bar-wrap"), {
    onChange: async (newPhase) => {
      state.phase = newPhase;
      await loadRubric();
    },
  });

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
      let teams = await Data.listTeams(state.grade);
      if (getPhaseBySlug(state.phase).kind === "final") {
        teams = teams.filter((t) => t.qualified_for_final);
      }
      state.teams = teams;
      if (teams.length === 0) {
        teamSelect.appendChild(h(`<option value="">Nenhuma equipe disponível</option>`));
        state.teamId = "";
      } else {
        teams.forEach((t) => teamSelect.appendChild(h(`<option value="${t.id}">${escapeHtml(t.name)}</option>`)));
        teamSelect.disabled = false;
        state.teamId = teams[0].id;
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
      const rubric = await Data.getRubricForTeam(state.teamId, state.phase);
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
              <p class="mt-1 text-muted" style="font-size:0.88rem;">${escapeHtml(criterion.description)}</p>
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
            <p style="font-size:0.85rem; color:rgba(244,245,251,0.6); font-weight:600;">${escapeHtml(getPhaseBySlug(state.phase).label)} · Total da rúbrica</p>
            <p class="font-score summary-score">${result.total}<span> / ${result.maxPossible} pts</span></p>
          </div>
          <button id="save-rubric-btn" class="btn btn-primary">Salvar avaliação</button>
        </div>
        <p id="rubric-saved-msg" class="mt-2" style="font-size:0.88rem; font-weight:700; color:#a5b4fc;"></p>
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
        phase: state.phase,
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
// PÁGINA: Placar (por fase)
// =============================================================================
route("/placar", async (app) => {
  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  const GRADE_FILTERS = ["Todos", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano"];
  const state = { phase: AppState.phase, grade: "Todos", autoRefresh: true, timer: null };

  const root = h(`
    <div class="container-mid section">
      <div id="phase-bar-wrap"></div>

      <div class="flex items-center justify-between mt-4" style="flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h1 class="font-display" style="font-size:1.9rem; font-weight:700;">Placar</h1>
          <p class="text-muted">Atualiza sozinho a cada poucos segundos.</p>
        </div>
        <label class="flex items-center gap-2" style="font-size:0.85rem; font-weight:600; color:var(--color-text-muted);">
          <input type="checkbox" id="auto-refresh-toggle" checked style="height:1rem;width:1rem;accent-color:var(--color-accent);" />
          Atualização automática
        </label>
      </div>

      <div class="flex gap-2 mt-4" id="grade-filters" style="flex-wrap:wrap;"></div>
      <div id="placar-error"></div>
      <div id="placar-body" class="mt-6"><p class="spinner-text">Carregando placar…</p></div>
    </div>
  `);
  app.appendChild(root);

  renderPhaseBar(root.querySelector("#phase-bar-wrap"), {
    onChange: async (newPhase) => {
      state.phase = newPhase;
      await loadLeaderboard();
    },
  });

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
      const rows = await Data.getLeaderboard(state.phase, state.grade === "Todos" ? undefined : state.grade);
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
      bodyEl.appendChild(h(`<p class="dashed-empty">Ainda não há pontuações lançadas em ${escapeHtml(getPhaseBySlug(state.phase).label)}.</p>`));
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
          <h2 class="font-display" style="font-size:1.3rem; font-weight:700;">${escapeHtml(grade)}</h2>
          <div class="leaderboard-wrap">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th style="width:3rem;"></th>
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
        const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
        tbody.appendChild(
          h(`
          <tr>
            <td><span class="rank-badge ${rankClass}">${i + 1}</span></td>
            <td>
              <div class="flex items-center gap-2">
                <p style="font-weight:700;">${escapeHtml(row.team_name)}</p>
                ${row.qualified_for_final ? '<span class="qualified-pill">✓</span>' : ""}
              </div>
              ${row.class ? `<p class="text-faint" style="font-size:0.75rem;">${escapeHtml(row.class)}</p>` : ""}
            </td>
            <td class="num font-score" style="font-size:1.15rem; font-weight:700; color:var(--color-accent-dark);">${row.best_round_score}</td>
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
// PÁGINA: Equipes (gestão geral + marcação de classificação para a final)
// =============================================================================
route("/equipes", async (app) => {
  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  const root = h(`
    <div class="container-mid section">
      <h1 class="font-display" style="font-size:1.9rem; font-weight:700;">Equipes</h1>
      <p class="mt-2 text-muted">Todas as equipes cadastradas, organizadas por ano. Use o interruptor para marcar quem está classificado para a fase final — essa marcação é sempre manual, com base no resultado das seletivas.</p>
      <div class="banner-info mt-4">
        <p style="font-size:0.88rem; font-weight:600;">💡 Como classificar equipes para a final</p>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">Confira o <a href="#/placar" style="font-weight:700; color:var(--color-accent-dark);">placar</a> das duas seletivas, decida quais equipes de cada ano avançam, e ative o interruptor "Classificada" ao lado do nome dela aqui embaixo. Na fase Final, só equipes marcadas aparecem para pontuação.</p>
      </div>
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
              <h2 class="font-display" style="font-size:1.25rem; font-weight:700;">${escapeHtml(grade)}</h2>
              <a href="#/pontuar/${slug}" style="font-size:0.85rem; font-weight:700; color:var(--color-accent-dark);">+ adicionar equipe</a>
            </div>
            <div class="equipes-list-inner mt-3"></div>
          </div>
        `);
        const inner = section.querySelector(".equipes-list-inner");
        if (list.length === 0) {
          inner.appendChild(h(`<p class="dashed-empty" style="padding:1.5rem;">Nenhuma equipe cadastrada ainda.</p>`));
        } else {
          const stack = h(`<div style="display:flex; flex-direction:column; gap:0.6rem;"></div>`);
          list.forEach((team) => {
            const row = h(`
              <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1.15rem; gap:0.75rem;">
                <a href="#/pontuar/${slug}/${team.id}" style="flex:1; min-width:0;">
                  <p style="font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(team.name)}</p>
                  <p class="text-faint" style="font-size:0.75rem;">${escapeHtml(team.class || "turma não informada")}</p>
                </a>
                <div class="toggle-row">
                  <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-muted); white-space:nowrap;">Classificada</span>
                  <label class="toggle">
                    <input type="checkbox" class="qualify-toggle" data-id="${team.id}" ${team.qualified_for_final ? "checked" : ""} />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <button aria-label="Remover" class="del-btn" data-id="${team.id}" data-name="${escapeHtml(team.name)}"
                  style="background:none; border:none; color:var(--color-text-faint); font-size:1rem;">✕</button>
              </div>
            `);
            stack.appendChild(row);
          });
          inner.appendChild(stack);
        }
        bodyEl.appendChild(section);
      });

      bodyEl.querySelectorAll(".qualify-toggle").forEach((toggle) => {
        toggle.addEventListener("change", async () => {
          toggle.disabled = true;
          try {
            await Data.setQualified(toggle.dataset.id, toggle.checked);
          } catch (err) {
            showError(err.message || "Erro ao atualizar classificação.");
            toggle.checked = !toggle.checked;
          } finally {
            toggle.disabled = false;
          }
        });
      });

      bodyEl.querySelectorAll(".del-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const name = btn.dataset.name;
          if (!confirm(`Remover a equipe "${name}" e todas as pontuações lançadas para ela (em todas as fases)?`)) return;
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
// PÁGINA: Guia da fase seletiva ("Como usar", focado em testes/seletivas)
// =============================================================================
route("/ajuda", async (app) => {
  const steps = [
    {
      title: "Use a fase Treino para testar o app sem compromisso",
      body: 'A fase "Treino" existe para a equipe pedagógica se familiarizar com o painel. As pontuações lançadas nela têm cronômetro próprio e nunca contam para nenhuma classificação — só as seletivas e a final valem oficialmente.',
    },
    {
      title: "Escolha a fase certa antes de pontuar",
      body: 'No topo da página "Pontuar missões" (e também em Placar, Equipe destaque e Equipes) tem um seletor com as 4 fases: Treino, Seletiva 16/9, Seletiva 23/9 e Final. Cada fase guarda suas próprias pontuações, separadas — confirme sempre qual fase está selecionada antes de lançar pontos.',
    },
    {
      title: "Cadastre a equipe (uma única vez, vale para todas as fases)",
      body: 'Vá em "Pontuar missões", escolha o ano da equipe e toque em "+ Nova equipe". Preencha o nome da equipe, a turma e os alunos — o cadastro é único, não precisa recriar a equipe a cada fase.',
    },
    {
      title: "Marque as missões durante a partida",
      body: "Para cada missão, marque os itens concluídos (como no fichário de papel). Contadores como número de empresas ou torneiras têm botões de + e −. A pontuação total aparece na tela na hora.",
    },
    {
      title: "Registre as penalidades",
      body: `Toda vez que a equipe tocar no robô fora da Área da Base até o cumprimento da tarefa, toque em "+" nas Penalidades. Cada uma desconta ${PENALTY_POINTS} pontos.`,
    },
    {
      title: "Depois das seletivas, marque quem está classificado",
      body: 'Confira o placar de cada seletiva, decida com a equipe pedagógica quais equipes avançam, e vá em "Equipes" para ativar o interruptor "Classificada" ao lado de cada uma. Na fase Final, só aparecem as equipes marcadas.',
    },
    {
      title: "Avalie a Equipe Destaque (à parte, também por fase)",
      body: 'Na aba "Equipe destaque", escolha a fase, o ano e a equipe, e marque um nível de 1 a 5 para cada um dos 6 critérios. Essa nota não entra no placar de missões.',
    },
  ];

  app.appendChild(
    h(`
    <div class="container-narrow section">
      <span class="eyebrow">🧪 GUIA DE USO DO PAINEL</span>
      <h1 class="font-display mt-3" style="font-size:1.9rem; font-weight:700;">Guia da fase seletiva</h1>
      <p class="mt-2 text-muted">Use a fase Treino e as seletivas de 16/9 e 23/9 para testar o painel sem pressa. Este guia explica o fluxo completo — do cadastro da equipe até a marcação de quem se classifica para a final.</p>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.3rem; font-weight:700;">Passo a passo</h2>
        <ol id="ajuda-steps" style="list-style:none; margin:1rem 0 0; padding:0; display:flex; flex-direction:column; gap:1rem;"></ol>
      </section>

      <section class="mt-6 card-dark">
        <h2 class="font-display" style="font-size:1.15rem; font-weight:700;">Regras que o app já aplica sozinho</h2>
        <ul style="margin:0.75rem 0 0; padding-left:1.1rem; font-size:0.88rem; color:rgba(244,245,251,0.75); display:flex; flex-direction:column; gap:0.4rem;">
          <li>A pontuação de cada missão nunca passa do máximo definido no fichário.</li>
          <li>Penalidades descontam ${PENALTY_POINTS} pontos cada, sem deixar o total ficar negativo.</li>
          <li>No placar, vale sempre a maior pontuação entre os dois rounds da equipe — dentro de cada fase.</li>
          <li>Em caso de empate na pontuação, o placar ordena pelo menor tempo do round.</li>
          <li>As 3 fases (Seletiva 16/9, Seletiva 23/9, Final) guardam pontuações totalmente separadas.</li>
        </ul>
      </section>
    </div>
  `)
  );

  const stepsEl = document.getElementById("ajuda-steps");
  steps.forEach((step, i) => {
    stepsEl.appendChild(
      h(`
      <li class="card" style="display:flex; gap:1rem; align-items:flex-start;">
        <span class="step-num">${i + 1}</span>
        <div>
          <p class="font-display" style="font-weight:700;">${escapeHtml(step.title)}</p>
          <p class="mt-1 text-muted" style="font-size:0.88rem;">${escapeHtml(step.body)}</p>
        </div>
      </li>`)
    );
  });
});

// =============================================================================
// PÁGINA: Configurações (restrita por senha) — reset de pontuações
// =============================================================================
const ADMIN_PASSWORD = "adminsphera";

function isAdminUnlocked() {
  return sessionStorage.getItem("tmr_admin_unlocked") === "1";
}
function setAdminUnlocked(value) {
  if (value) sessionStorage.setItem("tmr_admin_unlocked", "1");
  else sessionStorage.removeItem("tmr_admin_unlocked");
}

route("/admin", async (app) => {
  if (!isAdminUnlocked()) {
    const root = h(`
      <div class="container-narrow section">
        <h1 class="font-display" style="font-size:1.9rem; font-weight:700;">🔒 Configurações</h1>
        <p class="mt-2 text-muted">Área restrita — use para resetar pontuações do torneio. Peça a senha à coordenação se não a tiver.</p>
        <form id="admin-login-form" class="card mt-6">
          <label class="field-label">Senha de acesso
            <input type="password" id="admin-password" class="field-input" autocomplete="current-password" placeholder="Digite a senha" />
          </label>
          <p id="admin-login-error" class="mt-2" style="font-size:0.85rem; color:var(--color-danger); font-weight:600;"></p>
          <button type="submit" class="btn btn-primary mt-4">Entrar</button>
        </form>
      </div>
    `);
    app.appendChild(root);
    const form = root.querySelector("#admin-login-form");
    const input = root.querySelector("#admin-password");
    const errorEl = root.querySelector("#admin-login-error");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value === ADMIN_PASSWORD) {
        setAdminUnlocked(true);
        renderRoute();
      } else {
        errorEl.textContent = "Senha incorreta. Tente novamente.";
        input.value = "";
        input.focus();
      }
    });
    return;
  }

  if (!isSupabaseConfigured()) {
    app.appendChild(h(setupBannerHtml()));
    return;
  }

  const root = h(`
    <div class="container-narrow section">
      <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h1 class="font-display" style="font-size:1.9rem; font-weight:700;">🔒 Configurações</h1>
          <p class="mt-2 text-muted">Ações administrativas do torneio. Use com cuidado — apagar pontuações não pode ser desfeito.</p>
        </div>
        <button id="admin-logout-btn" class="btn btn-secondary">Sair</button>
      </div>

      <div class="banner-amber mt-6">
        <p style="font-weight:700; font-size:0.9rem;">⚠️ Todas as ações abaixo são permanentes</p>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">Não existe "desfazer". Confirme com a coordenação antes de resetar qualquer pontuação.</p>
      </div>

      <div id="admin-error"></div>
      <div id="admin-msg"></div>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.2rem; font-weight:700;">Resetar pontuações de uma fase</h2>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">Apaga todos os rounds e avaliações de Equipe Destaque lançados em uma fase específica (as outras fases não são afetadas). As equipes cadastradas continuam existindo.</p>
        <div class="card mt-3">
          <div class="grid-form-2">
            <label class="field-label">Fase
              <select id="admin-phase-select" class="field-input"></select>
            </label>
          </div>
          <button id="admin-reset-phase-btn" class="btn btn-danger mt-4">Resetar pontuações desta fase</button>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.2rem; font-weight:700;">Resetar classificações para a final</h2>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">Desmarca "Classificada" de todas as equipes, em todos os anos. Útil para recomeçar a definição de quem vai para a final.</p>
        <div class="card mt-3">
          <button id="admin-reset-qualifications-btn" class="btn btn-danger">Desmarcar todas as classificações</button>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.2rem; font-weight:700;">Resetar todo o torneio</h2>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">Apaga TODAS as pontuações (treino, seletivas e final) e todas as classificações. As equipes cadastradas continuam existindo, só zeradas.</p>
        <div class="card mt-3">
          <button id="admin-reset-all-btn" class="btn btn-danger">Resetar todas as pontuações do torneio</button>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="font-display" style="font-size:1.2rem; font-weight:700;">Apagar todas as equipes</h2>
        <p class="mt-1 text-muted" style="font-size:0.85rem;">Remove todas as equipes cadastradas e, junto com elas, todas as pontuações. Use apenas para recomeçar o cadastro do zero (ex.: entre uma edição do torneio e outra).</p>
        <div class="card mt-3">
          <button id="admin-delete-teams-btn" class="btn btn-danger">Apagar todas as equipes</button>
        </div>
      </section>
    </div>
  `);
  app.appendChild(root);

  const errorEl = root.querySelector("#admin-error");
  const msgEl = root.querySelector("#admin-msg");
  const phaseSelect = root.querySelector("#admin-phase-select");

  PHASES.forEach((p) => phaseSelect.appendChild(h(`<option value="${p.slug}">${p.label}</option>`)));

  function showError(msg) {
    errorEl.innerHTML = msg ? `<p class="banner-error mt-4">${escapeHtml(msg)}</p>` : "";
  }
  function showMsg(msg) {
    msgEl.innerHTML = msg
      ? `<div class="banner-info mt-4"><p style="font-size:0.88rem; font-weight:600;">✓ ${escapeHtml(msg)}</p></div>`
      : "";
  }

  root.querySelector("#admin-logout-btn").addEventListener("click", () => {
    setAdminUnlocked(false);
    renderRoute();
  });

  async function runAction(btn, confirmMsg, action, successMsg) {
    if (!confirm(confirmMsg)) return;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Processando…";
    showError(null);
    showMsg(null);
    try {
      await action();
      showMsg(successMsg);
    } catch (err) {
      showError(err.message || "Erro ao executar a ação.");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  root.querySelector("#admin-reset-phase-btn").addEventListener("click", (e) => {
    const phase = getPhaseBySlug(phaseSelect.value);
    runAction(
      e.target,
      `Apagar TODAS as pontuações (missões e Equipe Destaque) da fase "${phase.label}"? Esta ação não pode ser desfeita.`,
      async () => {
        await Data.resetRoundsByPhase(phase.slug);
        await Data.resetRubricByPhase(phase.slug);
      },
      `Pontuações da fase "${phase.label}" foram resetadas.`
    );
  });

  root.querySelector("#admin-reset-qualifications-btn").addEventListener("click", (e) => {
    runAction(
      e.target,
      "Desmarcar 'Classificada' de todas as equipes, em todos os anos? Esta ação não pode ser desfeita.",
      () => Data.resetAllQualifications(),
      "Classificações para a final foram resetadas."
    );
  });

  root.querySelector("#admin-reset-all-btn").addEventListener("click", (e) => {
    runAction(
      e.target,
      "Apagar TODAS as pontuações do torneio (treino, seletivas e final) e todas as classificações? Esta ação não pode ser desfeita.",
      () => Data.resetEverything(),
      "Todas as pontuações do torneio foram resetadas."
    );
  });

  root.querySelector("#admin-delete-teams-btn").addEventListener("click", (e) => {
    runAction(
      e.target,
      "Apagar TODAS as equipes cadastradas e todas as pontuações? Esta ação não pode ser desfeita.",
      () => Data.deleteAllTeams(),
      "Todas as equipes foram removidas."
    );
  });
});
