/**
 * Comparaison des trois options sur l'horizon : remplacer par du neuf, réparer et garder,
 * acheter reconditionné. Une figure par dimension, rangées triées de la moins coûteuse
 * à la plus coûteuse, la première signalée par un badge.
 */
import { options, rankOptions, cheapest } from "../core/calc.js?v=202610270837";
import { formatEur, formatKg } from "../core/format.js?v=202610270837";

const LABELS = {
  replace: "Remplacer par du neuf",
  repair: "Réparer et garder",
  refurb: "Acheter reconditionné"
};

const FIGURES = [
  { key: "eur", title: "En euros", format: formatEur, badge: "la moins chère" },
  { key: "co2", title: "En carbone", format: formatKg, badge: "la plus sobre" }
];

function figureHtml(fig, list) {
  const ranked = rankOptions(list, fig.key);
  const winners = cheapest(list, fig.key);
  const max = Math.max(...ranked.map(o => o[fig.key])) || 1;
  return `
    <figure class="option-figure">
      <figcaption><h4>${fig.title}</h4></figcaption>
      <div class="option-rows">
        ${ranked.map(o => `
          <div class="option-row">
            <span class="option-label">${LABELS[o.kind]}${winners.includes(o.kind) ? ` <span class="option-badge">${winners.length > 1 ? "à égalité" : fig.badge}</span>` : ""}</span>
            <span class="option-track"><span class="option-bar is-${o.kind}" style="width:${o[fig.key] / max * 100}%"></span></span>
            <span class="option-value">${fig.format(o[fig.key])}</span>
          </div>`).join("")}
      </div>
    </figure>`;
}

export function mountOptions(root, store) {
  function render(state) {
    const list = options(store.device(), state.global);
    root.innerHTML = `
      <h3>Trois options sur ${state.global.horizon} ans</h3>
      <div class="option-figures">${FIGURES.map(fig => figureHtml(fig, list)).join("")}</div>
      <p class="savings-note">Totaux hors électricité. Remplacer déduit la revente des équipements remplacés ; le reconditionné est amorti sur sa propre durée, sans réparation ni revente.</p>`;
  }
  store.subscribe(render);
  render(store.get());
}
