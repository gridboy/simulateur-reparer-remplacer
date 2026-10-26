/**
 * Les deux bilans séparés de la comparaison réparer vs remplacer :
 *  - gain carbone (kgCO₂e) : fabrication évitée − empreinte des réparations
 *  - gain financier (€)    : achats évités − coût des réparations
 * puis la synthèse : valeur du carbone évité au prix choisi et bénéfice global.
 */
import { compare } from "../core/calc.js";
import { formatKg, formatEur, formatDec, formatInt, formatPct, formatGain } from "../core/format.js";

const PANELS = {
  carbon: {
    eyebrow: "Gain carbone",
    title: "Émissions évitées",
    unit: "kgCO₂e",
    annual: c => [c.replace.co2, c.repair.co2],
    gain: c => c.carbon,
    format: formatKg,
    perYear: v => `${formatDec(v)} kgCO₂e`,
    segments: [
      { key: "fab", label: "Fabrication", cls: "main" },
      { key: "rep", label: "Réparations", cls: "rep" },
      { key: "use", label: "Usage", cls: "use" }
    ],
    ledger: [
      { label: "Fabrication évitée", value: g => g.avoided, sign: 1 },
      { label: "Empreinte des réparations", value: g => g.repairs, sign: -1 }
    ]
  },
  money: {
    eyebrow: "Gain financier",
    title: "Dépenses évitées",
    unit: "€ HT",
    annual: c => [c.replace.eur, c.repair.eur],
    gain: c => c.money,
    format: formatEur,
    perYear: v => `${formatInt(v)} €`,
    segments: [
      { key: "buy", label: "Achat", cls: "main" },
      { key: "rep", label: "Réparations", cls: "rep" },
      { key: "use", label: "Électricité", cls: "use" }
    ],
    ledger: [
      { label: "Achats évités", value: g => g.avoided, sign: 1 },
      { label: "Coût des réparations (pièces + main-d'œuvre)", value: g => g.repairs, sign: -1 }
    ]
  }
};

function barsHtml(panel, annuals) {
  const max = Math.max(...annuals.map(a => a.total)) || 1;
  const rows = [["replace", "Remplacer"], ["repair", "Réparer"]];
  return rows.map(([scenario, label], i) => {
    const a = annuals[i];
    const segments = panel.segments
      .filter(s => a[s.key] > 0)
      .map(s => `<span class="seg seg-${s.cls}"
        style="width:${a[s.key] / max * 100}%" title="${s.label} : ${panel.perYear(a[s.key])} par an"></span>`)
      .join("");
    return `
      <div class="bar-row" data-scenario="${scenario}">
        <span class="bar-label">${label}</span>
        <span class="bar">${segments}</span>
        <span class="bar-value">${panel.perYear(a.total)}<small>/an</small></span>
      </div>`;
  }).join("");
}

function legendHtml(panel) {
  return panel.segments.map(s => `<span><i class="swatch seg-${s.cls}"></i>${s.label}</span>`).join("");
}

function panelHtml(kind, c, horizon) {
  const panel = PANELS[kind];
  const g = panel.gain(c);
  const positive = g.net >= 0;
  const ledger = panel.ledger.map(l => `
    <div class="ledger-row"><dt>${l.label}</dt><dd>${formatGain(l.sign * l.value(g), panel.format)}</dd></div>`).join("");
  return `
    <article class="gain-card ${positive ? "" : "is-negative"}" data-kind="${kind}">
      <header class="gain-head">
        <span class="eyebrow">${panel.eyebrow}</span>
        <h3>${panel.title} en réparant</h3>
      </header>
      <p class="gain-main">
        <strong>${formatGain(g.perYear, v => panel.perYear(v))}</strong><span>par an</span>
      </p>
      <p class="gain-sub">${positive ? "Soit" : "Soit un surcoût de"} ${formatPct(Math.abs(g.pct))} ${positive ? "de moins qu'en remplaçant" : "par rapport au remplacement"}</p>
      <div class="bars">${barsHtml(panel, panel.annual(c))}</div>
      <div class="legend">${legendHtml(panel)}</div>
      <dl class="ledger">
        <div class="ledger-caption">Sur ${horizon} ans</div>
        ${ledger}
        <div class="ledger-row ledger-total"><dt>Gain net</dt><dd>${formatGain(g.net, panel.format)}</dd></div>
      </dl>
    </article>`;
}

function synthesisHtml(c, global) {
  return `
    <div class="synthesis">
      <div>
        <span class="eyebrow">Valeur du carbone évité</span>
        <p><strong>${formatGain(c.carbonValue, formatEur)}</strong> sur ${global.horizon} ans</p>
        <small>${formatKg(Math.abs(c.carbon.net))} CO₂e × ${formatInt(global.carbon)} €/t</small>
      </div>
      <div class="synthesis-op" aria-hidden="true">+</div>
      <div>
        <span class="eyebrow">Gain financier</span>
        <p><strong>${formatGain(c.money.net, formatEur)}</strong> sur ${global.horizon} ans</p>
        <small>dépenses réelles, réparations déduites</small>
      </div>
      <div class="synthesis-op" aria-hidden="true">=</div>
      <div class="synthesis-total ${c.total >= 0 ? "" : "is-negative"}">
        <span class="eyebrow">Bénéfice global</span>
        <p><strong>${formatGain(c.total, formatEur)}</strong></p>
        <small>en réparant plutôt qu'en remplaçant</small>
      </div>
    </div>`;
}

export function mountGainPanels(root, store) {
  function render(state) {
    const c = compare(store.device(), state.global);
    root.innerHTML = `
      <div class="gain-grid">
        ${panelHtml("carbon", c, state.global.horizon)}
        ${panelHtml("money", c, state.global.horizon)}
      </div>
      ${synthesisHtml(c, state.global)}`;
  }
  store.subscribe(render);
  render(store.get());
}
