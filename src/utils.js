export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function formatDate(dateLike) {
  if (!dateLike) return "--";
  const date = new Date(`${dateLike}T12:00:00`);
  return Number.isNaN(date.valueOf())
    ? "--"
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "--";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.valueOf())
    ? "--"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function clampScore(value) {
  return Math.max(0, Math.min(20, Number(value || 0)));
}

export function scoreLabel(home, away) {
  return `${Number(home)} x ${Number(away)}`;
}

export function toast(message) {
  const stack = qs("[data-toast-stack]");
  if (!stack) return;
  const card = document.createElement("div");
  card.className = "toast-card";
  card.textContent = message;
  stack.append(card);
  setTimeout(() => card.remove(), 3600);
}

export async function copyText(value) {
  await navigator.clipboard.writeText(value);
  toast("Copiado para a área de transferência.");
}

export function serializeForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  qsa("input[type='checkbox']", form).forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

export function groupByScore(bets) {
  return bets.reduce((acc, bet) => {
    const key = scoreLabel(bet.homeScore, bet.awayScore);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function topScore(bets) {
  const entries = Object.entries(groupByScore(bets)).sort((a, b) => b[1] - a[1]);
  return entries[0] || ["Sem palpites", 0];
}

export function paidBets(bets) {
  return bets.filter((bet) => bet.paymentStatus === "paid");
}

export function estimatePrize(game, bets) {
  const participants = paidBets(bets).length;
  const percent = Number(game?.prizePercent ?? 85) / 100;
  return participants * Number(game?.betValue || 0) * percent;
}

export function winnersForScore(bets, home, away) {
  return paidBets(bets).filter(
    (bet) => Number(bet.homeScore) === Number(home) && Number(bet.awayScore) === Number(away)
  );
}

export function whatsappLink(game, bet) {
  const text = `Meu palpite para ${game.teamHome} x ${game.teamAway} é ${scoreLabel(bet.homeScore, bet.awayScore)}! Faça o seu também: ${location.origin}${location.pathname.replace(/[^/]+$/, "palpite.html")}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function renderMetric(label, value, extraClass = "") {
  return `<article class="metric-card ${extraClass}"><span>${label}</span><strong>${value}</strong></article>`;
}
