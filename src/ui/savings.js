/**
 * Ce que l'on économise en réparant plutôt qu'en remplaçant, sur l'horizon choisi :
 *  1. la réponse en grands chiffres (euros, kgCO₂e, bénéfice global) et en une phrase ;
 *  2. un pont de calcul par dimension : total si l'on remplace − achats évités
 *     + réparations = total si l'on répare, l'écart étant annoté sur la dernière barre.
 */
import { compare, events, SCENARIO } from "../core/calc.js?v=202610270821";
import { CAR_KG_PER_KM } from "../data/defaults.js?v=202610270821";
import { formatKg, formatEur, formatInt, formatDec, formatPct, formatYears } from "../core/format.js?v=202610270821";

const NOUNS = {
  ecran: ["écran", "écrans"],
  fixe: ["ordinateur fixe", "ordinateurs fixes"],
  laptop: ["ordinateur portable", "ordinateurs portables"],
  phone: ["smartphone", "smartphones"]
};


const BRIDGES = [
  {
    kind: "money", title: "D'où vient l'économie en euros", gainKey: "money", format: formatEur,
    unitLabel: "d'amortissement", usageNote: "L'électricité",
    replaceLabel: "Si vous remplacez", avoidedLabel: "Années bonus sans amortissement", repairsLabel: "Réparations payées"
  },
  {
    kind: "carbon", title: "D'où vient l'économie en carbone", gainKey: "carbon", format: formatKg,
    unitLabel: "de fabrication amortie", usageNote: "L'empreinte de l'électricité",
    replaceLabel: "Si vous remplacez", avoidedLabel: "Années bonus sans fabrication amortie", repairsLabel: "Empreinte des réparations"
  }
];

/** « 0, 4 et 8 ans » */
function listYears(years) {
  const parts = years.map(formatDec);
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} et ${parts.at(-1)}` : parts[0];
  return `${text} an${years.at(-1) >= 2 ? "s" : ""}`;
}

/** Périodes bonus de l'horizon : amorti, toujours en service. */
function bonusPeriods(device, horizon) {
  const periods = [];
  for (let start = 0; start < horizon; start += device.lifeExt) {
    const from = start + device.life;
    const to = Math.min(start + device.lifeExt, horizon);
    if (from < to) periods.push(`de ${formatDec(from)} à ${formatDec(to)} ans`);
  }
  return periods;
}

/** Titre et calendrier en clair des deux scénarios sur l'horizon. */
function storyHtml(device, key, global, bonus) {
  const { horizon } = global;
  const [one, many] = NOUNS[key];
  const extension = device.lifeExt - device.life;
  const buys = kind => events(device, horizon, kind).filter(e => e.kind === "buy").map(e => e.t);
  const repairYears = events(device, horizon, SCENARIO.REPAIR).filter(e => e.kind === "repair").map(e => e.t);

  const title = extension > 0
    ? `En réparant, vous gardez chaque ${one} <b>${formatYears(extension)} de plus</b> après son amortissement de ${formatYears(device.life)}.`
    : `Sans année bonus, réparer revient à remplacer : rachat tous les ${formatYears(device.life)}.`;

  const replaceBuys = buys(SCENARIO.REPLACE);
  const repairBuys = buys(SCENARIO.REPAIR);
  const periods = bonusPeriods(device, horizon);
  const repairLine = [
    `${repairBuys.length > 1 ? "achats" : "achat"} à ${listYears(repairBuys)}`,
    repairYears.length ? `${repairYears.length > 1 ? "réparations" : "réparation"} à ${listYears(repairYears)}` : "",
    periods.length ? `années bonus ${periods.join(", ")}, soit <b>${formatYears(bonus)}</b>` : "aucune année bonus"
  ].filter(Boolean).join(" · ");

  return `
    <h3 id="savings-title" class="savings-story">${title}</h3>
    <dl class="calendar">
      <div data-scenario="replace"><dt>Remplacer</dt>
        <dd>${replaceBuys.length > 1 ? "achats" : "achat"} à ${listYears(replaceBuys)} · ${replaceBuys.length} ${replaceBuys.length > 1 ? many : one} amorti${replaceBuys.length > 1 ? "s" : ""} en continu, aucune année bonus</dd></div>
      <div data-scenario="repair"><dt>Réparer</dt><dd>${repairLine}</dd></div>
    </dl>`;
}

// En dessous d'une demi-unité, l'écart s'affiche à l'équilibre plutôt qu'en gain ou perte de 0
const NEUTRAL = 0.5;

function heroHtml({ kind, amount, text, label, negLabel, detail }) {
  const state = Math.abs(amount) < NEUTRAL ? "is-neutral" : amount < 0 ? "is-negative" : "";
  const shown = state === "is-neutral" ? "à l'équilibre" : state === "is-negative" ? negLabel : label;
  return `
    <div class="hero ${state}" data-kind="${kind}">
      <span class="hero-value">${text}</span>
      <span class="hero-label">${shown}</span>
      <small>${detail}</small>
    </div>`;
}

function heroesHtml(c, global) {
  const { money, carbon } = c;
  const km = Math.abs(carbon.net) / CAR_KG_PER_KM;
  const direction = v => (v >= 0 ? "de moins" : "de plus");
  return `
    <div class="hero-row">
      ${heroHtml({
        kind: "money", amount: money.net, text: formatEur(Math.abs(money.net)),
        label: "économisés", negLabel: "de surcoût",
        detail: `${formatInt(Math.abs(money.perYear))} € par an · ${formatPct(Math.abs(money.pct))} ${direction(money.net)}`
      })}
      ${heroHtml({
        kind: "carbon", amount: carbon.net, text: formatKg(Math.abs(carbon.net)),
        label: "de CO₂e évités", negLabel: "de CO₂e émis en plus",
        detail: `≈ ${formatInt(km)} km en voiture · ${formatDec(Math.abs(carbon.perYear))} kg par an · ${formatPct(Math.abs(carbon.pct))} ${direction(carbon.net)}`
      })}
      ${heroHtml({
        kind: "total", amount: c.total, text: formatEur(Math.abs(c.total)),
        label: "de bénéfice global", negLabel: "de perte globale",
        detail: `économie + carbone évité valorisé ${formatEur(c.carbonValue)} (${formatInt(global.carbon)} €/t)`
      })}
    </div>`;
}

function bridgeHtml(b, c) {
  // c porte bonusYears ; g le bilan du poste (money ou carbon)
  const g = { ...c[b.gainKey], horizonYears: c.amortizedYears + c.bonusYears };
  const afterAvoided = g.before - g.avoided;
  // Revente à laquelle on renonce en gardant l'équipement (poste euros seulement)
  const resaleLost = (g.resaleBefore || 0) - (g.resaleAfter || 0);
  const afterRepairs = afterAvoided + g.repairs;
  const max = Math.max(g.before, afterRepairs, afterRepairs + resaleLost, g.after) || 1;
  const pos = v => (v / max) * 100;
  const saving = g.before - g.after;
  const bar = (from, to, cls, title) =>
    `<span class="bridge-bar ${cls}" style="left:${pos(Math.min(from, to))}%;width:${pos(Math.abs(to - from))}%" title="${title}"></span>`;

  const rows = [
    { op: "", label: `${b.replaceLabel}<small>${formatYears(g.horizonYears)} × ${b.format(g.charge)} ${b.unitLabel}${g.resaleBefore ? ` − ${b.format(g.resaleBefore)} de revente` : ""}</small>`, value: b.format(g.before),
      bar: bar(0, g.before, "is-replace", `Total si vous remplacez : ${b.format(g.before)}`) },
    { op: "−", label: `${b.avoidedLabel}<small>${formatDec(c.bonusYears)} an${c.bonusYears >= 2 ? "s" : ""} × ${b.format(c.bonusYears ? g.avoided / c.bonusYears : 0)}</small>`, value: `−${b.format(g.avoided)}`,
      bar: bar(afterAvoided, g.before, "is-avoided", `${b.avoidedLabel} : ${b.format(g.avoided)}`) },
    { op: "+", label: b.repairsLabel, value: `+${b.format(g.repairs)}`,
      bar: bar(afterAvoided, afterRepairs, "is-repairs", `${b.repairsLabel} : ${b.format(g.repairs)}`) },
    ...(resaleLost > 0.5 ? [{
      op: "+", label: "Revente perdue<small>l'équipement gardé ne se revend plus</small>", value: `+${b.format(resaleLost)}`,
      bar: bar(afterRepairs, afterRepairs + resaleLost, "is-repairs", `Revente perdue : ${b.format(resaleLost)}`)
    }] : []),
    { op: "=", label: `Si vous réparez<small>${formatYears(g.amortized)} × ${b.format(g.charge)} ${b.unitLabel} + ${b.format(g.repairs)} de réparations</small>`, value: b.format(g.after), total: true,
      bar: bar(0, g.after, "is-repair", `Total si vous réparez : ${b.format(g.after)}`)
        + (Math.abs(saving) > 0.5
          ? `<span class="bridge-gap ${saving < 0 ? "is-negative" : ""}" style="left:${pos(Math.min(g.after, g.before))}%;width:${pos(Math.abs(saving))}%">
              <span>${saving >= 0 ? "économie" : "surcoût"} ${b.format(Math.abs(saving))}</span></span>`
          : "") }
  ];

  return `
    <figure class="bridge" data-kind="${b.kind}">
      <figcaption><h3>${b.title}</h3></figcaption>
      <div class="bridge-rows">
        ${rows.map(r => `
          <div class="bridge-row ${r.total ? "is-total" : ""}">
            <span class="bridge-label"><span class="bridge-op" aria-hidden="true">${r.op}</span><span>${r.label}</span></span>
            <span class="bridge-track">${r.bar}</span>
            <span class="bridge-value">${r.value}</span>
          </div>`).join("")}
      </div>
    </figure>`;
}

export function mountSavings(root, store) {
  function render(state) {
    const d = store.device();
    const c = compare(d, state.global);
    root.innerHTML = `
      <section class="savings" aria-labelledby="savings-title">
        <header class="savings-head">
          <span class="eyebrow">Sur ${state.global.horizon} ans, en réparant plutôt qu'en remplaçant</span>
          ${storyHtml(d, state.current, state.global, c.bonusYears)}
        </header>
        ${heroesHtml(c, state.global)}
        <div class="bridges">${BRIDGES.map(b => bridgeHtml(b, c)).join("")}</div>
        <p class="savings-note">Totaux sur ${state.global.horizon} ans. Achat et fabrication sont amortis sur la durée d'amortissement ; au-delà, chaque année bonus n'en coûte plus. L'électricité (${formatEur(c.money.usage)}, ${formatKg(c.carbon.usage)} CO₂e) est la même dans les deux cas : elle n'est pas comptée. Équivalence voiture : ${String(CAR_KG_PER_KM).replace(".", ",")} kgCO₂e/km, ADEME.</p>
      </section>`;
  }
  store.subscribe(render);
  render(store.get());
}
