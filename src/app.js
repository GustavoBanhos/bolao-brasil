import {
  createBet,
  deleteBet,
  deleteGame,
  getActiveGame,
  listenBets,
  listenGame,
  listenNotifications,
  saveGame,
  updateBetPayment,
  updateScore
} from "./database.js";
import {
  ensureAdminAccess,
  loginAdmin,
  logoutAdmin,
  redirectAdminIfLogged,
  watchAdminAuth
} from "./auth.js";
import { renderHeatmap, renderPaymentChart, renderRankingChart } from "./charts.js";
import {
  clampScore,
  copyText,
  estimatePrize,
  formatCurrency,
  formatDate,
  formatDateTime,
  paidBets,
  qsa,
  qs,
  renderMetric,
  scoreLabel,
  serializeForm,
  toast,
  topScore,
  whatsappLink,
  winnersForScore
} from "./utils.js";

let activeGame = null;
let activeBets = [];
let unsubs = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupTheme();
  setupNavigation();
  registerServiceWorker();

  const page = document.body.dataset.page;
  if (page === "login") {
    initLogin();
    return;
  }

  if (page === "admin") {
    const user = await ensureAdminAccess();
    if (!user) return;
  }

  activeGame = await getActiveGame();
  if (!activeGame && page === "admin") {
    activeGame = defaultGame();
  }
  if (!activeGame) {
    toast("Nenhum jogo cadastrado.");
    return;
  }

  if (page === "home") initHome();
  if (page === "palpite") initPrediction();
  if (page === "ranking") initRanking();
  if (page === "jogo") initLiveGame();
  if (page === "admin") initAdmin();
}

function setupNavigation() {
  const page = document.body.dataset.page;
  qsa(`[data-nav="${page}"]`).forEach((item) => item.classList.add("active"));
  if (page === "login") qsa('[data-nav="admin"]').forEach((item) => item.classList.add("active"));
}

function setupTheme() {
  const saved = localStorage.getItem("bolaoTheme") || "light";
  document.documentElement.dataset.theme = saved;
  qsa("[data-action='theme']").forEach((button) => {
    button.textContent = saved === "dark" ? "Modo claro" : "Modo escuro";
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("bolaoTheme", next);
      button.textContent = next === "dark" ? "Modo claro" : "Modo escuro";
    });
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function defaultGame() {
  return {
    id: "",
    teamHome: "Brasil",
    teamAway: "Noruega",
    date: "",
    time: "",
    location: "",
    betValue: 10,
    prizePercent: 85,
    pixKey: "",
    pixPayload: "",
    championship: "",
    imageUrl: "",
    isOpen: true,
    active: true,
    currentHomeScore: 0,
    currentAwayScore: 0,
    matchStatus: "Pré-jogo",
    matchMinute: "00:00"
  };
}

function initLogin() {
  redirectAdminIfLogged();
  const form = qs("#loginForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { email, password } = serializeForm(event.currentTarget);
    try {
      await loginAdmin(email, password);
      window.location.replace("admin.html");
    } catch (error) {
      toast(error.message || "Login não autorizado.");
    }
  });
}

async function wireRealtime(render) {
  unsubs.forEach((unsub) => unsub());
  unsubs = [];
  if (!activeGame?.id) {
    activeBets = [];
    render();
    return;
  }
  unsubs.push(listenGame(activeGame.id, (game) => {
    activeGame = game || activeGame;
    render();
  }));
  unsubs.push(listenBets(activeGame.id, (bets) => {
    activeBets = bets;
    render();
  }));
}

function initHome() {
  listenNotifications(renderNotifications);
  wireRealtime(renderHome);
}

function renderHome() {
  if (!activeGame) return;
  const paid = paidBets(activeBets);
  const [score, total] = topScore(activeBets);
  setText("[data-home-team-home]", activeGame.teamHome);
  setText("[data-home-team-away]", activeGame.teamAway);
  setText("[data-home-championship]", activeGame.championship || "Bolão");
  setText("[data-home-date]", formatDate(activeGame.date));
  setText("[data-home-time]", activeGame.time || "--");
  setText("[data-home-location]", activeGame.location || "--");
  setText("[data-home-value]", formatCurrency(activeGame.betValue));
  setText("[data-home-raised]", formatCurrency(paid.length * Number(activeGame.betValue || 0)));
  setText("[data-home-paid]", paid.length);
  setText("[data-home-prize]", formatCurrency(estimatePrize(activeGame, activeBets)));
  setText("[data-live-home]", activeGame.currentHomeScore ?? 0);
  setText("[data-live-away]", activeGame.currentAwayScore ?? 0);
  setText("[data-home-top-score]", `${score} (${total} palpite${total === 1 ? "" : "s"})`);
}

function renderNotifications(items) {
  const list = qs("[data-notifications]");
  if (!list) return;
  list.innerHTML = items.length
    ? items.map((item) => `<div class="notification-item">${item.message}</div>`).join("")
    : "<div class=\"notification-item\">Sem notificações por enquanto.</div>";
}

function initPrediction() {
  setText("[data-prediction-title]", `${activeGame.teamHome} x ${activeGame.teamAway}`);
  setText("[data-form-home]", activeGame.teamHome);
  setText("[data-form-away]", activeGame.teamAway);
  const form = qs("#predictionForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const bet = await createBet(activeGame, serializeForm(form));
      toast("Palpite confirmado. Agora finalize o Pix.");
      showPayment(bet);
      form.reset();
    } catch (error) {
      toast(error.message || "Não foi possível salvar o palpite.");
    }
  });
}

function showPayment(bet) {
  const panel = qs("[data-payment-panel]");
  const qr = qs("[data-qr-code]");
  const pixKey = qs("[data-pix-key]");
  const payload = activeGame.pixPayload || activeGame.pixKey;
  panel.classList.remove("is-hidden");
  pixKey.value = activeGame.pixKey;
  qr.innerHTML = "";
  if (window.QRCode) {
    new QRCode(qr, { text: payload, width: 164, height: 164 });
  } else {
    qr.textContent = payload;
  }
  qs("[data-copy-pix]").onclick = () => copyText(activeGame.pixKey);
  const share = qs("[data-share-whatsapp]");
  share.href = whatsappLink(activeGame, bet);
}

function initRanking() {
  wireRealtime(renderRanking);
}

function renderRanking() {
  const paid = paidBets(activeBets);
  const [score, total] = topScore(paid);
  const container = qs("[data-ranking-kpis]");
  container.innerHTML = [
    renderMetric("Participantes", paid.length),
    renderMetric("Palpites", activeBets.length),
    renderMetric("Prêmio", formatCurrency(estimatePrize(activeGame, activeBets)), "highlight"),
    renderMetric("Mais apostado", `${score} (${total})`)
  ].join("");
  renderRankingChart("rankingChart", activeBets);
  renderPaymentChart("paymentChart", activeBets);
  renderHeatmap(qs("[data-heatmap]"), activeBets);
}

function initLiveGame() {
  watchAdminAuth((user) => {
    qs("[data-live-controls]")?.classList.toggle("is-hidden", !user);
  });
  qsa("[data-goal]").forEach((button) => button.addEventListener("click", () => addGoal(button.dataset.goal)));
  qs("[data-match-finish]")?.addEventListener("click", () => updateScore(activeGame.id, { matchStatus: "Encerrado" }));
  wireRealtime(renderLiveGame);
}

function renderLiveGame() {
  setText("[data-game-home]", activeGame.teamHome);
  setText("[data-game-away]", activeGame.teamAway);
  setText("[data-game-home-score]", activeGame.currentHomeScore ?? 0);
  setText("[data-game-away-score]", activeGame.currentAwayScore ?? 0);
  setText("[data-game-status]", activeGame.matchStatus || "Pré-jogo");
  setText("[data-game-minute]", activeGame.matchMinute || "00:00");

  const winners = winnersForScore(activeBets, activeGame.currentHomeScore || 0, activeGame.currentAwayScore || 0);
  const prize = winners.length ? estimatePrize(activeGame, activeBets) / winners.length : 0;
  qs("[data-live-kpis]").innerHTML = [
    renderMetric("Vencedores", winners.length),
    renderMetric("Prêmio individual", formatCurrency(prize), "highlight"),
    renderMetric("Pagantes", paidBets(activeBets).length),
    renderMetric("Placar atual", scoreLabel(activeGame.currentHomeScore || 0, activeGame.currentAwayScore || 0))
  ].join("");
  renderWinners(qs("[data-winners-table]"), winners, prize);
}

function initAdmin() {
  const panel = qs("[data-admin-panel]");
  qs("[data-admin-logout]").addEventListener("click", async () => {
    await logoutAdmin();
  });
  panel?.classList.remove("is-hidden");
  fillGameForm();
  wireAdmin();
}

function wireAdmin() {
  const gameForm = qs("#gameForm");
  const statusForm = qs("#statusForm");
  gameForm.onsubmit = async (event) => {
    event.preventDefault();
    const payload = serializeForm(gameForm);
    await saveGame({ ...activeGame, ...payload });
    toast("Jogo salvo.");
  };
  statusForm.onsubmit = async (event) => {
    event.preventDefault();
    await updateScore(activeGame.id, serializeForm(statusForm));
    toast("Status atualizado.");
  };
  qsa("[data-goal]").forEach((button) => (button.onclick = () => addGoal(button.dataset.goal)));
  qsa("[data-undo-goal]").forEach((button) => (button.onclick = () => undoGoal(button.dataset.undoGoal)));
  qs("[data-delete-game]").onclick = async () => {
    if (!confirm("Excluir o jogo ativo e seus palpites?")) return;
    await deleteGame(activeGame.id);
    toast("Jogo excluído.");
  };
  qsa("[data-filter]").forEach((input) => (input.oninput = renderAdmin));
  qsa("[data-sim-home], [data-sim-away]").forEach((input) => (input.oninput = renderSimulator));
  wireRealtime(() => {
    fillGameForm();
    renderAdmin();
  });
}

function fillGameForm() {
  const form = qs("#gameForm");
  if (!form || !activeGame) return;
  Object.entries(activeGame).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  });
  setText("[data-admin-home-score]", activeGame.currentHomeScore ?? 0);
  setText("[data-admin-away-score]", activeGame.currentAwayScore ?? 0);
  setText("[data-admin-status]", activeGame.matchStatus || "Pré-jogo");
  qs("#statusForm").elements.matchStatus.value = activeGame.matchStatus || "Pré-jogo";
  qs("#statusForm").elements.matchMinute.value = activeGame.matchMinute || "00:00";
}

function renderAdmin() {
  const paid = paidBets(activeBets);
  const pending = activeBets.length - paid.length;
  const averageHome = paid.length ? paid.reduce((sum, bet) => sum + Number(bet.homeScore), 0) / paid.length : 0;
  const averageAway = paid.length ? paid.reduce((sum, bet) => sum + Number(bet.awayScore), 0) / paid.length : 0;
  const [top, topTotal] = topScore(paid);
  qs("[data-admin-kpis]").innerHTML = [
    renderMetric("Participantes", paid.length),
    renderMetric("Arrecadação", formatCurrency(paid.length * Number(activeGame.betValue || 0))),
    renderMetric("Maior prêmio", formatCurrency(estimatePrize(activeGame, activeBets)), "highlight"),
    renderMetric("Palpites", activeBets.length),
    renderMetric("Pagantes", paid.length),
    renderMetric("Pendentes", pending),
    renderMetric("Média Brasil", averageHome.toFixed(1)),
    renderMetric("Média adversário", averageAway.toFixed(1)),
    renderMetric("Placar mais apostado", `${top} (${topTotal})`)
  ].join("");
  renderAdminBets();
  renderHeatmap(qs("[data-heatmap]"), activeBets);
  renderSimulator();
}

function renderAdminBets() {
  const tbody = qs("[data-admin-bets]");
  const filters = Object.fromEntries(qsa("[data-filter]").map((input) => [input.dataset.filter, input.value.trim().toLowerCase()]));
  const rows = activeBets.filter((bet) => {
    const score = scoreLabel(bet.homeScore, bet.awayScore).toLowerCase();
    const created = String(bet.createdAt || "");
    return (!filters.name || bet.name.toLowerCase().includes(filters.name))
      && (!filters.phone || bet.phone.toLowerCase().includes(filters.phone))
      && (!filters.environment || bet.environment.toLowerCase().includes(filters.environment))
      && (!filters.paymentStatus || bet.paymentStatus === filters.paymentStatus)
      && (!filters.score || score.includes(filters.score))
      && (!filters.date || created.includes(filters.date));
  });

  tbody.innerHTML = rows.map((bet) => `
    <tr>
      <td>${bet.name}</td>
      <td>${bet.phone}</td>
      <td>${bet.environment}</td>
      <td>${scoreLabel(bet.homeScore, bet.awayScore)}</td>
      <td>${formatDateTime(bet.createdAt)}</td>
      <td>${bet.paymentStatus === "paid" ? "Participando" : "Aguardando"}</td>
      <td><button class="btn btn-sm ${bet.paymentStatus === "paid" ? "btn-success" : "btn-secondary"}" data-pay="${bet.id}" data-status="${bet.paymentStatus === "paid" ? "pending" : "paid"}">${bet.paymentStatus === "paid" ? "Pago" : "Pendente"}</button></td>
      <td><button class="btn btn-sm btn-outline-danger" data-remove-bet="${bet.id}">Excluir</button></td>
    </tr>
  `).join("") || "<tr><td colspan=\"8\">Nenhum palpite encontrado.</td></tr>";

  qsa("[data-pay]").forEach((button) => button.onclick = () => updateBetPayment(button.dataset.pay, button.dataset.status));
  qsa("[data-remove-bet]").forEach((button) => button.onclick = async () => {
    if (confirm("Excluir este palpite?")) await deleteBet(button.dataset.removeBet);
  });
}

function renderSimulator() {
  const home = clampScore(qs("[data-sim-home]")?.value ?? activeGame.currentHomeScore);
  const away = clampScore(qs("[data-sim-away]")?.value ?? activeGame.currentAwayScore);
  const winners = winnersForScore(activeBets, home, away);
  const prize = winners.length ? estimatePrize(activeGame, activeBets) / winners.length : 0;
  const paid = paidBets(activeBets);
  const percent = paid.length ? (winners.length / paid.length) * 100 : 0;
  const kpis = qs("[data-simulator-kpis]");
  if (kpis) {
    kpis.innerHTML = [
      renderMetric("Vencedores", winners.length),
      renderMetric("Prêmio individual", formatCurrency(prize), "highlight"),
      renderMetric("Acerto", `${percent.toFixed(1)}%`),
      renderMetric("Placar", scoreLabel(home, away))
    ].join("");
  }
  renderWinners(qs("[data-simulator-winners]"), winners, prize, true);
}

async function addGoal(side) {
  const patch = {
    matchStatus: "Ao vivo",
    currentHomeScore: Number(activeGame.currentHomeScore || 0),
    currentAwayScore: Number(activeGame.currentAwayScore || 0)
  };
  if (side === "home") patch.currentHomeScore += 1;
  if (side === "away") patch.currentAwayScore += 1;
  await updateScore(activeGame.id, patch);
}

async function undoGoal(side) {
  const patch = {
    currentHomeScore: Number(activeGame.currentHomeScore || 0),
    currentAwayScore: Number(activeGame.currentAwayScore || 0)
  };
  if (side === "home") patch.currentHomeScore = Math.max(0, patch.currentHomeScore - 1);
  if (side === "away") patch.currentAwayScore = Math.max(0, patch.currentAwayScore - 1);
  await updateScore(activeGame.id, patch);
}

function renderWinners(tbody, winners, prize, compact = false) {
  if (!tbody) return;
  tbody.innerHTML = winners.map((bet) => `
    <tr>
      <td>${bet.name}</td>
      <td>${bet.environment}</td>
      <td>${bet.phone}</td>
      <td>${scoreLabel(bet.homeScore, bet.awayScore)}</td>
      <td>${formatCurrency(prize)}</td>
      ${compact ? "" : "<td>Pago</td>"}
    </tr>
  `).join("") || `<tr><td colspan="${compact ? 5 : 6}">Nenhum vencedor para este placar.</td></tr>`;
}

function setText(selector, value) {
  qsa(selector).forEach((item) => {
    item.textContent = value;
  });
}
