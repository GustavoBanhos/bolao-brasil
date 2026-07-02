import { groupByScore, paidBets, scoreLabel } from "./utils.js";

const instances = new Map();

function chart(id, config) {
  if (!window.Chart) return;
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (instances.has(id)) instances.get(id).destroy();
  instances.set(id, new Chart(canvas, config));
}

export function renderRankingChart(id, bets) {
  const ranking = Object.entries(groupByScore(paidBets(bets)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  chart(id, {
    type: "bar",
    data: {
      labels: ranking.map(([label]) => label),
      datasets: [{ label: "Palpites pagos", data: ranking.map(([, total]) => total), backgroundColor: "#a6193c" }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { precision: 0 } } }
    }
  });
}

export function renderPaymentChart(id, bets) {
  const paid = paidBets(bets).length;
  const pending = bets.length - paid;
  chart(id, {
    type: "doughnut",
    data: {
      labels: ["Pagos", "Pendentes"],
      datasets: [{ data: [paid, pending], backgroundColor: ["#198754", "#f4b400"] }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

export function renderHeatmap(container, bets, maxScore = 5) {
  if (!container) return;
  const paid = paidBets(bets);
  const maxBetScore = Math.max(
    maxScore,
    ...paid.flatMap((bet) => [Number(bet.homeScore), Number(bet.awayScore)]).filter(Number.isFinite)
  );
  const size = Math.min(20, maxBetScore);
  const counts = paid.reduce((acc, bet) => {
    const key = scoreLabel(bet.homeScore, bet.awayScore);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(counts));

  let html = "<table class=\"heatmap\"><thead><tr><th>BR \\ ADV</th>";
  for (let away = 0; away <= size; away += 1) html += `<th>${away}</th>`;
  html += "</tr></thead><tbody>";
  for (let home = 0; home <= size; home += 1) {
    html += `<tr><th>${home}</th>`;
    for (let away = 0; away <= size; away += 1) {
      const count = counts[scoreLabel(home, away)] || 0;
      const alpha = count / maxCount;
      const color = count ? `rgba(166, 25, 60, ${0.22 + alpha * 0.72})` : "rgba(166, 25, 60, 0.08)";
      html += `<td style="background:${color}" title="${scoreLabel(home, away)}: ${count}">${count || ""}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
}
