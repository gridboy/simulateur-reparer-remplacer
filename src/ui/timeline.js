/** Frise des achats, des périodes d'amortissement, des années bonus et des réparations sur l'horizon. */
import { activeRepairs, purchases, SCENARIO } from "../core/calc.js?v=202610262216";
import { formatDec } from "../core/format.js?v=202610262216";
import { escapeHtml } from "./dom.js?v=202610262216";

const ROWS = [
  { scenario: SCENARIO.REPLACE, label: "Remplacer", lifeKey: "life" },
  { scenario: SCENARIO.REPAIR, label: "Réparer", lifeKey: "lifeExt" }
];

function trackHtml(device, horizon, row) {
  const life = device[row.lifeKey];
  const repairs = row.scenario === SCENARIO.REPAIR ? activeRepairs(device) : [];
  const parts = [];
  for (let start = 0; start < horizon - 1e-9; start += life) {
    const width = Math.min(life, horizon - start);
    const amortized = Math.min(device.life, width);
    parts.push(`<span class="tl-unit" style="left:${start / horizon * 100}%;width:${width / horizon * 100}%">
      <span class="tl-amort" style="width:${amortized / width * 100}%"></span></span>`);
    for (const r of repairs) {
      const t = start + r.year;
      if (t < horizon) {
        parts.push(`<span class="tl-repair" style="left:${t / horizon * 100}%" title="${escapeHtml(r.label)}, année ${formatDec(t)}"></span>`);
      }
    }
  }
  return parts.join("");
}

export function mountTimeline(root, store) {
  function render(state) {
    const d = store.device();
    const { horizon } = state.global;
    const ticks = [];
    for (let t = 0; t <= horizon; t += horizon > 12 ? 4 : 2) ticks.push(`<span>${t}</span>`);

    root.innerHTML = `
      ${ROWS.map(row => {
        const n = purchases(d, horizon, row.scenario);
        const reps = row.scenario === SCENARIO.REPAIR ? activeRepairs(d).length * n : 0;
        return `
          <div class="tl-row" data-scenario="${row.scenario}">
            <div class="tl-name">${row.label}<small>${n} achat${n > 1 ? "s" : ""}${reps ? ` · ${reps} réparation${reps > 1 ? "s" : ""}` : ""}</small></div>
            <div class="tl-track">${trackHtml(d, horizon, row)}</div>
          </div>`;
      }).join("")}
      <div class="tl-axis"><span></span><div>${ticks.join("")}</div></div>
      <div class="legend">
        <span><i class="swatch tl-key-amort"></i>En amortissement</span>
        <span><i class="swatch tl-key-free"></i>Années bonus : amorti, toujours en service</span>
        <span><i class="swatch tl-key-repair"></i>Réparation</span>
      </div>`;
  }
  store.subscribe(render);
  render(store.get());
}
