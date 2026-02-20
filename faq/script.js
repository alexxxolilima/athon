const refs = {
  globalSearch: document.getElementById("globalSearch"),
  tagCloud: document.getElementById("tagCloud"),
  topicGrid: document.getElementById("topicGrid"),
  topicCount: document.getElementById("topicCount"),
  procResultsWrap: document.getElementById("procResultsWrap"),
  topicSection: document.getElementById("topicSection"),
  topicPanelBody: document.getElementById("topicPanelBody"),
  topicPrev: document.getElementById("topicPrev"),
  topicNext: document.getElementById("topicNext"),
  topicPageInfo: document.getElementById("topicPageInfo"),
  topicPager: document.getElementById("topicPager"),
  scriptCount: document.getElementById("scriptCount"),
  scriptSection: document.getElementById("scriptSection"),
  scriptPanelBody: document.getElementById("scriptPanelBody"),
  scriptPrev: document.getElementById("scriptPrev"),
  scriptNext: document.getElementById("scriptNext"),
  scriptPageInfo: document.getElementById("scriptPageInfo"),
  scriptPager: document.getElementById("scriptPager"),
  scriptResults: document.getElementById("scriptResults"),
  equipmentSearch: document.getElementById("equipmentSearch"),
  equipmentResults: document.getElementById("equipmentResults"),
  equipCount: document.getElementById("equipCount"),
  equipSection: document.getElementById("equipSection"),
  equipPanelBody: document.getElementById("equipPanelBody"),
  equipPrev: document.getElementById("equipPrev"),
  equipNext: document.getElementById("equipNext"),
  equipPageInfo: document.getElementById("equipPageInfo"),
  equipPager: document.getElementById("equipPager"),
  detailModal: document.getElementById("detailModal"),
  closeModal: document.getElementById("closeModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalMeta: document.getElementById("modalMeta"),
  modalMedia: document.getElementById("modalMedia"),
  modalBody: document.getElementById("modalBody"),
  copyModal: document.getElementById("copyModal"),
  toast: document.getElementById("toast"),
  logoSlot: document.getElementById("logoSlot"),
  favList: document.getElementById("favList"),
  favTitle: document.getElementById("favTitle"),
  favTabs: Array.from(document.querySelectorAll(".fav-tab")),
  metricEquip: document.getElementById("metricEquip"),
  metricScripts: document.getElementById("metricScripts"),
  metricTopics: document.getElementById("metricTopics"),
  metricFavs: document.getElementById("metricFavs"),
  branchButtons: Array.from(document.querySelectorAll(".branch-btn")),
  navButtons: Array.from(document.querySelectorAll(".nav-btn")),
  views: Array.from(document.querySelectorAll(".view"))
};

const FAVORITES_KEY = "athon_favorites_v2";
const PAGE_SIZE = { topics: 15, scripts: 4, equips: 18 };

let db = {
  app: { tema_padrao: "light", logo_url: "", animacoes: true, atalho_tema: "Ctrl+J" },
  equipamentos: [],
  scripts: [],
  topicos: [],
  links_rapidos: []
};

let favorites = { equipamentos: [], topicos: [], scripts: [] };
let currentTopic = null;
const pageState = { topics: 1, scripts: 1, equips: 1 };
let activeBranch = "";
let activeFavType = "equipamentos";

function norm(v) {
  return (v || "").toString().toLowerCase();
}

function slugify(v) {
  return (v || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  setTimeout(() => refs.toast.classList.remove("show"), 1700);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copiado.");
  } catch {
    showToast("Falha ao copiar.");
  }
}

function setDarkModeFixed() {
  document.body.classList.add("dark-mode");
}

function withIds(items, prefix) {
  return (items || []).map((item, idx) => {
    const fallback = `${prefix}-${idx + 1}-${slugify(item.titulo || item.modelo || item.nome || "item")}`;
    return { ...item, id: item.id || fallback };
  });
}

function normalizeDb(raw) {
  const merged = {
    app: { tema_padrao: "light", logo_url: "", animacoes: true, atalho_tema: "Ctrl+J" },
    equipamentos: [],
    scripts: [],
    topicos: [],
    links_rapidos: [],
    ...(raw || {})
  };

  merged.app = { tema_padrao: "light", logo_url: "", animacoes: true, atalho_tema: "Ctrl+J", ...(raw?.app || {}) };
  merged.equipamentos = withIds(Array.isArray(merged.equipamentos) ? merged.equipamentos : [], "equip");
  merged.scripts = withIds(Array.isArray(merged.scripts) ? merged.scripts : [], "script");
  merged.topicos = withIds(Array.isArray(merged.topicos) ? merged.topicos : [], "topico");
  merged.links_rapidos = Array.isArray(merged.links_rapidos) ? merged.links_rapidos : [];

  return merged;
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "{}");
    favorites = {
      equipamentos: Array.isArray(parsed.equipamentos) ? parsed.equipamentos : [],
      topicos: Array.isArray(parsed.topicos) ? parsed.topicos : [],
      scripts: Array.isArray(parsed.scripts) ? parsed.scripts : []
    };
  } catch {
    favorites = { equipamentos: [], topicos: [], scripts: [] };
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function isFavorite(type, id) {
  return favorites[type].includes(id);
}

function toggleFavorite(type, id) {
  if (isFavorite(type, id)) {
    favorites[type] = favorites[type].filter((x) => x !== id);
  } else {
    favorites[type].unshift(id);
  }
  saveFavorites();
  renderFavorites();
  updateMetrics();
}

function applyUiConfig() {
  refs.logoSlot.innerHTML = "";
  const logoUrl = db?.app?.logo_url;
  if (logoUrl) {
    const img = document.createElement("img");
    img.src = logoUrl;
    img.alt = "Logo";
    img.addEventListener("error", () => {
      refs.logoSlot.textContent = "LOGO";
    });
    refs.logoSlot.appendChild(img);
  } else {
    refs.logoSlot.textContent = "LOGO";
  }
}

function updateMetrics() {
  if (refs.metricEquip) refs.metricEquip.textContent = String(db.equipamentos.length);
  if (refs.metricScripts) refs.metricScripts.textContent = String(db.scripts.length);
  if (refs.metricTopics) refs.metricTopics.textContent = String(db.topicos.length);
  if (refs.metricFavs) refs.metricFavs.textContent = String(favorites.equipamentos.length + favorites.topicos.length + favorites.scripts.length);
}

function setActiveView(viewId) {
  refs.views.forEach((v) => v.classList.toggle("active", v.id === viewId));
  refs.navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
}

function renderTags() {
  const tagSet = new Set();
  db.topicos.forEach((t) => (t.tags || []).forEach((tag) => tagSet.add(tag)));
  db.scripts.forEach((s) => (s.palavras_chave || []).forEach((tag) => tagSet.add(tag)));

  refs.tagCloud.innerHTML = "";
  [...tagSet].sort().forEach((tag) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = tag;
    b.addEventListener("click", () => {
      refs.globalSearch.value = tag;
      applyGlobalFilter(tag);
    });
    refs.tagCloud.appendChild(b);
  });
}

function cardTopic(item) {
  const fav = isFavorite("topicos", item.id);
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <p class="meta">${item.categoria || "Geral"}</p>
    <h3>${item.titulo}</h3>
    <p>${item.resumo || ""}</p>
    <div class="actions">
      <button type="button" class="detail">Detalhes</button>
      <button type="button" class="copy">Copiar</button>
      <button type="button" class="fav">${fav ? "★" : "☆"}</button>
    </div>
  `;

  card.querySelector(".detail").addEventListener("click", () => openTopic(item));
  card.querySelector(".copy").addEventListener("click", () => {
    copyText(`${item.titulo}\nCategoria: ${item.categoria}\n\n${item.detalhes || ""}`);
  });
  card.querySelector(".fav").addEventListener("click", () => {
    toggleFavorite("topicos", item.id);
    applyGlobalFilter(refs.globalSearch.value);
  });
  return card;
}

function renderTopics(termRaw = "") {
  const term = norm(termRaw);
  refs.topicGrid.innerHTML = "";
  setSectionVisible(refs.topicSection, true);
  refs.topicPanelBody.classList.add("visible");

  const filtered = (term ? db.topicos.filter((item) => {
    return norm(item.titulo).includes(term)
      || norm(item.categoria).includes(term)
      || norm(item.resumo).includes(term)
      || norm(item.detalhes).includes(term)
      || (item.tags || []).some((tag) => norm(tag).includes(term));
  }) : db.topicos);

  if (!filtered.length) {
    refs.topicCount.textContent = "0 tópico(s)";
    refs.topicGrid.innerHTML = `<div class="empty-state">${term ? `Nenhum tópico para "${termRaw}".` : "Sem tópicos cadastrados."}</div>`;
    refs.topicPageInfo.textContent = "Página 0/0";
    refs.topicPrev.disabled = true;
    refs.topicNext.disabled = true;
    refs.topicPager.classList.add("hidden");
    return;
  }

  const { safePage, totalPages, pageItems } = getPageSlice(filtered, pageState.topics, PAGE_SIZE.topics);
  pageState.topics = safePage;
  pageItems.forEach((item) => refs.topicGrid.appendChild(cardTopic(item)));
  refs.topicCount.textContent = `${pageItems.length}/${filtered.length} tópico(s)`;
  refs.topicPageInfo.textContent = `Página ${safePage}/${totalPages}`;
  refs.topicPrev.disabled = safePage <= 1;
  refs.topicNext.disabled = safePage >= totalPages;
  refs.topicPager.classList.toggle("hidden", totalPages <= 1);
}

function renderScripts(termRaw = "") {
  const term = norm(termRaw);
  refs.scriptResults.innerHTML = "";
  setSectionVisible(refs.scriptSection, true);
  refs.scriptPanelBody.classList.add("visible");

  const filtered = (term ? db.scripts.filter((item) => {
    const hay = [item.titulo, item.texto, ...(item.palavras_chave || [])].join(" ");
    return norm(hay).includes(term);
  }) : db.scripts);

  if (!filtered.length) {
    refs.scriptCount.textContent = "0 script(s)";
    refs.scriptResults.innerHTML = `<div class="empty-state">${term ? `Nenhum script para "${termRaw}".` : "Sem scripts cadastrados."}</div>`;
    refs.scriptPageInfo.textContent = "Página 0/0";
    refs.scriptPrev.disabled = true;
    refs.scriptNext.disabled = true;
    refs.scriptPager.classList.add("hidden");
    return;
  }

  const { safePage, totalPages, pageItems } = getPageSlice(filtered, pageState.scripts, PAGE_SIZE.scripts);
  pageState.scripts = safePage;
  pageItems.forEach((item) => {
    const fav = isFavorite("scripts", item.id);
    const row = document.createElement("div");
    row.className = "entry";
    row.innerHTML = `
      <h4>${item.titulo}</h4>
      <small>Palavras-chave: ${(item.palavras_chave || []).join(", ")}</small>
      <p>${item.texto || ""}</p>
      <div class="actions">
        <button type="button" class="copy">Copiar</button>
        <button type="button" class="fav">${fav ? "★" : "☆"}</button>
      </div>
    `;

    row.querySelector(".copy").addEventListener("click", () => copyText(item.texto || ""));
    row.querySelector(".fav").addEventListener("click", () => {
      toggleFavorite("scripts", item.id);
      applyGlobalFilter(refs.globalSearch.value);
    });

    refs.scriptResults.appendChild(row);
  });

  refs.scriptCount.textContent = `${pageItems.length}/${filtered.length} script(s)`;
  refs.scriptPageInfo.textContent = `Página ${safePage}/${totalPages}`;
  refs.scriptPrev.disabled = safePage <= 1;
  refs.scriptNext.disabled = safePage >= totalPages;
  refs.scriptPager.classList.toggle("hidden", totalPages <= 1);
}

function renderEquipments(termRaw = "") {
  const term = norm(termRaw);
  refs.equipmentResults.innerHTML = "";
  setSectionVisible(refs.equipSection, true);
  refs.equipPanelBody.classList.add("visible");

  const filtered = db.equipamentos.filter((item) => {
    const hay = [item.fabricante, item.modelo, item.usuario, item.senha, item.obs, item.filial, ...(item.tags || [])].join(" ");
    const matchTerm = !term || norm(hay).includes(term);
    const matchBranch = !activeBranch || norm(item.filial) === norm(activeBranch);
    return matchTerm && matchBranch;
  });

  if (!filtered.length) {
    const filterLabel = termRaw || activeBranch;
    refs.equipCount.textContent = "0 equipamento(s)";
    refs.equipmentResults.innerHTML = `<div class="empty-state">${term || activeBranch ? `Nenhum equipamento para "${filterLabel}".` : "Sem equipamentos cadastrados."}</div>`;
    refs.equipPageInfo.textContent = "Página 0/0";
    refs.equipPrev.disabled = true;
    refs.equipNext.disabled = true;
    refs.equipPager.classList.add("hidden");
    return;
  }

  const { safePage, totalPages, pageItems } = getPageSlice(filtered, pageState.equips, PAGE_SIZE.equips);
  pageState.equips = safePage;
  pageItems.forEach((item) => {
    const fav = isFavorite("equipamentos", item.id);
    const card = document.createElement("article");
    const branchClass = norm(item.filial) === "tj" ? "branch-tj" : norm(item.filial) === "iw" ? "branch-iw" : norm(item.filial) === "play" ? "branch-play" : "";
    const rawUser = item.usuario;
    const hasUser = rawUser !== undefined && rawUser !== null && norm(rawUser) !== "undefined" && String(rawUser).trim() !== "";
    const userLine = hasUser ? `<p>Usuário: ${rawUser}</p>` : "";
    card.className = `card ${branchClass}`.trim();
    card.innerHTML = `
      <p class="meta">${item.fabricante}</p>
      <p>Filial: ${item.filial || "-"}</p>
      ${userLine}
      <p>Senha: ${item.senha}</p>
      <div class="actions">
        <button type="button" class="copy">Copiar</button>
        <button type="button" class="fav">${fav ? "★" : "☆"}</button>
      </div>
    `;

    card.querySelector(".copy").addEventListener("click", () => {
      const userCopy = hasUser ? `Usuário: ${rawUser}\n` : "";
      copyText(`${userCopy}Senha: ${item.senha}`);
    });
    card.querySelector(".fav").addEventListener("click", () => {
      toggleFavorite("equipamentos", item.id);
      renderEquipments(refs.equipmentSearch.value);
    });

    refs.equipmentResults.appendChild(card);
  });

  refs.equipCount.textContent = `${pageItems.length}/${filtered.length} equipamento(s)`;
  refs.equipPageInfo.textContent = `Página ${safePage}/${totalPages}`;
  refs.equipPrev.disabled = safePage <= 1;
  refs.equipNext.disabled = safePage >= totalPages;
  refs.equipPager.classList.toggle("hidden", totalPages <= 1);
}

function applyGlobalFilter(termRaw = "") {
  pageState.topics = 1;
  pageState.scripts = 1;
  setSectionVisible(refs.procResultsWrap, true);
  renderTopics(termRaw);
  renderScripts(termRaw);
}

function getPageSlice(items, page, size) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * size;
  return {
    safePage,
    totalPages,
    pageItems: items.slice(start, start + size)
  };
}

function setSectionVisible(sectionEl, visible) {
  sectionEl.classList.toggle("visible", visible);
}

function openTopic(item) {
  currentTopic = item;
  refs.modalTitle.textContent = item.titulo;
  refs.modalMeta.textContent = `${item.categoria || "Geral"} | Tags: ${(item.tags || []).join(", ")}`;
  refs.modalBody.textContent = item.detalhes || "";

  refs.modalMedia.innerHTML = "";
  const mediaList = Array.isArray(item?.midias) ? item.midias : [];
  mediaList.forEach((m) => {
    const row = document.createElement("div");
    row.className = "media-item";
    row.innerHTML = `
      <img src="${m.src || ""}" alt="${m.titulo || "Imagem"}">
      <div>
        <h4>${m.titulo || "Imagem de apoio"}</h4>
        <p>${m.texto || ""}</p>
      </div>
    `;
    refs.modalMedia.appendChild(row);
  });

  refs.detailModal.classList.add("open");
  refs.detailModal.setAttribute("aria-hidden", "false");
}

function closeTopic() {
  refs.detailModal.classList.remove("open");
  refs.detailModal.setAttribute("aria-hidden", "true");
  refs.modalMedia.innerHTML = "";
  currentTopic = null;
}

function renderFavorites() {
  refs.favList.innerHTML = "";
  refs.favTabs.forEach((b) => b.classList.toggle("active", b.dataset.favType === activeFavType));

  if (activeFavType === "equipamentos") {
    refs.favTitle.textContent = "Favoritos: Equipamentos";
    const eqs = favorites.equipamentos.map((id) => db.equipamentos.find((x) => x.id === id)).filter(Boolean).slice(0, 8);
    if (!eqs.length) {
      refs.favList.innerHTML = `<div class="empty-state">Sem favoritos.</div>`;
      return;
    }
    eqs.forEach((item) => {
      const row = document.createElement("div");
      row.className = "entry";
      row.innerHTML = `
        <h4>${item.fabricante} ${item.modelo}</h4>
        <div class="actions">
          <button type="button" class="copy">Copiar</button>
          <button type="button" class="remove">Remover</button>
        </div>
      `;
      row.querySelector(".copy").addEventListener("click", () => copyText(`${item.fabricante} ${item.modelo}\nIP: ${item.usuario}\nSenha: ${item.senha}`));
      row.querySelector(".remove").addEventListener("click", () => {
        toggleFavorite("equipamentos", item.id);
        renderEquipments(refs.equipmentSearch.value);
      });
      refs.favList.appendChild(row);
    });
    return;
  }

  if (activeFavType === "topicos") {
    refs.favTitle.textContent = "Favoritos: Tópicos";
    const tps = favorites.topicos.map((id) => db.topicos.find((x) => x.id === id)).filter(Boolean).slice(0, 8);
    if (!tps.length) {
      refs.favList.innerHTML = `<div class="empty-state">Sem favoritos.</div>`;
      return;
    }
    tps.forEach((item) => {
      const row = document.createElement("div");
      row.className = "entry";
      row.innerHTML = `
        <h4>${item.titulo}</h4>
        <div class="actions">
          <button type="button" class="open">Detalhes</button>
          <button type="button" class="remove">Remover</button>
        </div>
      `;
      row.querySelector(".open").addEventListener("click", () => openTopic(item));
      row.querySelector(".remove").addEventListener("click", () => {
        toggleFavorite("topicos", item.id);
        applyGlobalFilter(refs.globalSearch.value);
      });
      refs.favList.appendChild(row);
    });
    return;
  }

  refs.favTitle.textContent = "Favoritos: Script";
  const scs = favorites.scripts.map((id) => db.scripts.find((x) => x.id === id)).filter(Boolean).slice(0, 8);
  if (!scs.length) {
    refs.favList.innerHTML = `<div class="empty-state">Sem favoritos.</div>`;
    return;
  }
  scs.forEach((item) => {
    const row = document.createElement("div");
    row.className = "entry";
    row.innerHTML = `
      <h4>${item.titulo}</h4>
      <div class="actions">
        <button type="button" class="copy">Copiar</button>
        <button type="button" class="remove">Remover</button>
      </div>
    `;
    row.querySelector(".copy").addEventListener("click", () => copyText(item.texto || ""));
    row.querySelector(".remove").addEventListener("click", () => {
      toggleFavorite("scripts", item.id);
      applyGlobalFilter(refs.globalSearch.value);
    });
    refs.favList.appendChild(row);
  });
}

async function loadData() {
  const r = await fetch("dados.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Falha ao carregar dados.json");
  const raw = await r.json();
  db = normalizeDb(raw);
}

function bindEvents() {
  refs.navButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });

  refs.favTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFavType = btn.dataset.favType || "equipamentos";
      renderFavorites();
    });
  });

  refs.globalSearch.addEventListener("input", (e) => applyGlobalFilter(e.target.value));
  refs.equipmentSearch.addEventListener("input", (e) => {
    pageState.equips = 1;
    renderEquipments(e.target.value);
  });

  refs.branchButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const clicked = btn.dataset.branch || "";
      activeBranch = norm(activeBranch) === norm(clicked) ? "" : clicked;
      refs.branchButtons.forEach((b) => b.classList.toggle("active", norm(b.dataset.branch) === norm(activeBranch)));
      pageState.equips = 1;
      renderEquipments(refs.equipmentSearch.value);
    });
  });

  refs.topicPrev.addEventListener("click", () => {
    pageState.topics -= 1;
    renderTopics(refs.globalSearch.value);
  });
  refs.topicNext.addEventListener("click", () => {
    pageState.topics += 1;
    renderTopics(refs.globalSearch.value);
  });

  refs.scriptPrev.addEventListener("click", () => {
    pageState.scripts -= 1;
    renderScripts(refs.globalSearch.value);
  });
  refs.scriptNext.addEventListener("click", () => {
    pageState.scripts += 1;
    renderScripts(refs.globalSearch.value);
  });

  refs.equipPrev.addEventListener("click", () => {
    pageState.equips -= 1;
    renderEquipments(refs.equipmentSearch.value);
  });
  refs.equipNext.addEventListener("click", () => {
    pageState.equips += 1;
    renderEquipments(refs.equipmentSearch.value);
  });

  refs.closeModal.addEventListener("click", closeTopic);
  refs.detailModal.addEventListener("click", (e) => {
    if (e.target === refs.detailModal) closeTopic();
  });

  refs.copyModal.addEventListener("click", () => {
    if (!currentTopic) return;
    copyText(`${currentTopic.titulo}\nCategoria: ${currentTopic.categoria}\n\n${currentTopic.detalhes || ""}`);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTopic();
    }
  });
}

async function init() {
  try {
    loadFavorites();
    await loadData();
    applyUiConfig();
    setDarkModeFixed();
    renderTags();
    applyGlobalFilter("");
    renderEquipments("");
    renderFavorites();
    updateMetrics();
    bindEvents();
  } catch (err) {
    refs.topicGrid.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

init();
