/**
 * Ce que l'on économise en réparant plutôt qu'en remplaçant, sur l'horizon choisi :
 *  1. la réponse en grands chiffres (euros, kgCO₂e, bénéfice global) et en une phrase ;
 *  2. un pont de calcul par dimension : total si l'on remplace − achats évités
 *     + réparations = total si l'on répare, l'écart étant annoté sur la dernière barre.
 */
import { compare, events, purchases, SCENARIO } from "../core/calc.js?v=202610262207";
import { CAR_KG_PER_KM } from "../data/defaults.js?v=202610262207";
import { formatKg, formatEur, formatInt, formatDec, formatPct } from "../core/format.js?v=202610262207";

const NOUNS = {
  ecran: ["écran", "écrans"],
  fixe: ["ordinateur fixe", "ordinateurs fixes"],
  laptop: ["ordinateur portable", "ordinateurs portables"],
  phone: ["smartphone", "smartphones"]
};

const plural = (n, [one, many]) => `${formatInt(n)} ${n > 1 ? many : one}`;

const BRIDGES = [
  {
    kind: "money", title: "D'où vient l'économie en euros", gainKey: "money", format: formatEur,
    replaceLabel: "Si vous remplacez", avoidedLabel: "Années bonus sans amortissement", repairsLabel: "Réparations payées"
  },
  {
    kind: "carbon", title: "D'où vient l'économie en carbone", gainKey: "carbon", format: formatKg,
    replaceLabel: "Si vous remplacez", avoidedLabel: "Années bonus sans fabrication amortie", repairsLabel: "Empreinte des réparations"
  }
];

function storyHtml(device, key, global, bonus) {
  const { horizon } = global;
  const nA = purchases(device, horizon, SCENARIO.REPLACE);
  const nB = purchases(device, horizon, SCENARIO.REPAIR);
  const nRep = events(device, horizon, SCENARIO.REPAIR).filter(e => e.kind === "repair").length;
  const noun = NOUNS[key];
  if (device.lifeExt <= device.life) {
    return `Sans année gagnée, vous achetez ${plural(nA, noun)} en ${horizon} ans dans les deux cas.`;
  }
  const repairs = nRep ? `${nRep} réparation${nRep > 1 ? "s" : ""}` : "";
  if (nB === nA) {
    return `En ${horizon} ans, vous achetez <b>${plural(nB, noun)}</b> dans les deux cas${repairs ? `, et payez en plus ${repairs}` : ""}.`;
  }
  return `En ${horizon} ans, vous achetez <b>${plural(nB, noun)}</b> au lieu de ${formatInt(nA)}${repairs ? ` et payez ${repairs}` : ""} : <b>${formatDec(bonus)} an${bonus >= 2 ? "s" : ""} bonus</b> sans amortissement.`;
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
  const g = c[b.gainKey];
  const afterAvoided = g.before - g.avoided;
  const max = Math.max(g.before, afterAvoided + g.repairs, g.after) || 1;
  const pos = v => (v / max) * 100;
  const saving = g.before - g.after;
  const bar = (from, to, cls, title) =>
    `<span class="bridge-bar ${cls}" style="left:${pos(Math.min(from, to))}%;width:${pos(Math.abs(to - from))}%" title="${title}"></span>`;

  const rows = [
    { op: "", label: `${b.replaceLabel}<small>amortissement chaque année</small>`, value: b.format(g.before),
      bar: bar(0, g.before, "is-replace", `Total si vous remplacez : ${b.format(g.before)}`) },
    { op: "−", label: `${b.avoidedLabel}<small>${formatDec(c.bonusYears)} an${c.bonusYears >= 2 ? "s" : ""} × ${b.format(c.bonusYears ? g.avoided / c.bonusYears : 0)}</small>`, value: `−${b.format(g.avoided)}`,
      bar: bar(afterAvoided, g.before, "is-avoided", `${b.avoidedLabel} : ${b.format(g.avoided)}`) },
    { op: "+", label: b.repairsLabel, value: `+${b.format(g.repairs)}`,
      bar: bar(afterAvoided, afterAvoided + g.repairs, "is-repairs", `${b.repairsLabel} : ${b.format(g.repairs)}`) },
    { op: "=", label: "Si vous réparez", value: b.format(g.after), total: true,
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
          <h3 id="savings-title" class="savings-story">${storyHtml(d, state.current, state.global, c.bonusYears)}</h3>
        </header>
        ${heroesHtml(c, state.global)}
        <div class="bridges">${BRIDGES.map(b => bridgeHtml(b, c)).join("")}</div>
        <p class="savings-note">Totaux sur ${state.global.horizon} ans. Achat et fabrication sont amortis sur la durée d'amortissement ; au-delà, chaque année bonus n'en coûte plus. Électricité comprise, identique dans les deux cas. Équivalence voiture : ${String(CAR_KG_PER_KM).replace(".", ",")} kgCO₂e/km, ADEME.</p>
      </section>`;
  }
  store.subscribe(render);
  render(store.get());
}
