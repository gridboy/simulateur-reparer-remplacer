/**
 * Calendrier des dépenses et des émissions réelles, cumulées année par année (SVG).
 * Chaque marche est un achat ou une réparation ; l'économie amortie est donnée par la vue savings.
 */
import { events, cumulative, SCENARIO } from "../core/calc.js?v=202610270823";
import { formatKg, formatEur, formatInt } from "../core/format.js?v=202610270823";

const SIZE = { width: 440, height: 230, left: 50, right: 14, top: 12, bottom: 28 };
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

const CHARTS = [
  { id: "co2", title: "Calendrier des émissions", unit: "kgCO₂e", key: "co2", rate: (d, g) => d.kwh * g.ef, format: formatKg },
  { id: "eur", title: "Calendrier des dépenses", unit: "€ HT", key: "eur", rate: (d, g) => d.kwh * g.elec, format: formatEur }
];

const SERIES = [
  { scenario: SCENARIO.REPLACE, label: "Remplacer" },
  { scenario: SCENARIO.REPAIR, label: "Réparer" }
];

function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return NICE_STEPS.find(m => m * power >= value) * power;
}

function svg(series, horizon, unit) {
  const { width: W, height: H, left, right, top, bottom } = SIZE;
  const innerW = W - left - right;
  const innerH = H - top - bottom;
  const maxY = niceMax(Math.max(...series.flatMap(s => s.points.map(p => p[1]))));
  const x = t => left + (t / horizon) * innerW;
  const y = v => top + innerH - (v / maxY) * innerH;

  const grid = [0, 1, 2, 3, 4].map(i => {
    const v = (maxY * i) / 4;
    return `<line class="grid" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>
      <text x="${left - 6}" y="${y(v) + 3}" text-anchor="end">${formatInt(v)}</text>`;
  }).join("");

  const stepX = horizon > 12 ? 4 : 2;
  const xTicks = [];
  for (let t = 0; t <= horizon; t += stepX) {
    xTicks.push(`<text x="${x(t)}" y="${H - 8}" text-anchor="middle">${t} an${t > 1 ? "s" : ""}</text>`);
  }

  const lines = series.map(s => {
    const path = s.points.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
    const end = s.points[s.points.length - 1];
    return `<g class="series" data-scenario="${s.scenario}">
      <path class="area" d="${path} L${x(horizon)} ${y(0)} L${x(0)} ${y(0)} Z"/>
      <path class="line" d="${path}"/>
      <circle cx="${x(end[0])}" cy="${y(end[1])}" r="3.5"/>
    </g>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumul en ${unit} sur ${horizon} ans">${grid}${xTicks.join("")}${lines}</svg>`;
}

export function mountCharts(root, store) {
  root.innerHTML = CHARTS.map(c => `
    <figure class="chart">
      <figcaption><h3>${c.title}</h3><span class="eyebrow">${c.unit}</span></figcaption>
      <div class="chart-svg" id="chart-${c.id}"></div>
      <div class="legend" id="legend-${c.id}"></div>
    </figure>`).join("");

  function render(state) {
    const d = store.device();
    const { horizon } = state.global;
    CHARTS.forEach(c => {
      const rate = c.rate(d, state.global);
      const series = SERIES.map(s => ({
        ...s,
        points: cumulative(events(d, horizon, s.scenario), horizon, rate, c.key)
      }));
      root.querySelector(`#chart-${c.id}`).innerHTML = svg(series, horizon, c.unit);
      root.querySelector(`#legend-${c.id}`).innerHTML = series.map(s => `
        <span data-scenario="${s.scenario}"><i class="swatch line"></i>${s.label}
        <b>${c.format(s.points[s.points.length - 1][1])}</b></span>`).join("");
    });
  }

  store.subscribe(render);
  render(store.get());
}
