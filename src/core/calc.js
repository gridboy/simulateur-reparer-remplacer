/**
 * Moteur de calcul : fonctions pures, sans accès au DOM.
 *
 * Deux scénarios pour un même équipement :
 *  - "replace" : remplacer à la durée de vie habituelle (life)
 *  - "repair"  : réparer et prolonger jusqu'à la durée prolongée (lifeExt)
 * Les valeurs annuelles sont amorties sur la durée d'usage réelle.
 */

export const SCENARIO = Object.freeze({ REPLACE: "replace", REPAIR: "repair" });

const EPS = 1e-9;
const toNumber = v => +v || 0;

/** Réparations prises en compte : actives et situées avant la fin de la durée prolongée. */
export function activeRepairs(device) {
  return device.repairs.filter(r => r.on && r.year > 0 && r.year < device.lifeExt);
}

/** Coût d'une intervention (pièces + main-d'œuvre), aide à la réparation déduite. */
export function repairCost(repair, aid = 0) {
  return Math.max(0, toNumber(repair.parts) + toNumber(repair.labor) - aid);
}

function lifetimeOf(device, kind) {
  return kind === SCENARIO.REPAIR ? device.lifeExt : device.life;
}

function repairsOf(device, kind) {
  return kind === SCENARIO.REPAIR ? activeRepairs(device) : [];
}

/** Bilan annualisé d'un scénario, détaillé par poste. */
export function scenario(device, global, kind) {
  const life = lifetimeOf(device, kind);
  const repairs = repairsOf(device, kind);
  const repairEur = repairs.reduce((sum, r) => sum + repairCost(r, device.aid), 0);
  const repairCo2 = repairs.reduce((sum, r) => sum + toNumber(r.co2), 0);

  const co2 = { fab: device.fab / life, rep: repairCo2 / life, use: device.kwh * global.ef };
  const eur = { buy: device.price / life, rep: repairEur / life, use: device.kwh * global.elec };
  co2.total = co2.fab + co2.rep + co2.use;
  eur.total = eur.buy + eur.rep + eur.use;

  return { life, repairs, repairEur, repairCo2, co2, eur };
}

/** Gain d'un poste : brut évité, coût des réparations, net. Valeurs sur l'horizon. */
function gain(replaceAnnual, repairAnnual, avoidedKey, horizon) {
  const perYear = replaceAnnual.total - repairAnnual.total;
  return {
    avoided: (replaceAnnual[avoidedKey] - repairAnnual[avoidedKey]) * horizon,
    repairs: repairAnnual.rep * horizon,
    perYear,
    net: perYear * horizon,
    pct: replaceAnnual.total ? perYear / replaceAnnual.total * 100 : 0
  };
}

/** Comparaison réparer vs remplacer : gain carbone, gain financier, valeur du carbone évité. */
export function compare(device, global) {
  const replace = scenario(device, global, SCENARIO.REPLACE);
  const repair = scenario(device, global, SCENARIO.REPAIR);
  const carbon = gain(replace.co2, repair.co2, "fab", global.horizon);
  const money = gain(replace.eur, repair.eur, "buy", global.horizon);
  const carbonValue = carbon.net / 1000 * global.carbon;
  const extension = device.lifeExt / device.life - 1;

  return {
    replace,
    repair,
    carbon,
    money,
    carbonValue,
    total: money.net + carbonValue,
    // Total des réparations au-delà duquel réparer ne fait plus gagner
    breakEven: { eur: device.price * extension, co2: device.fab * extension }
  };
}

/** Décaissements (achats et réparations) dans le temps, sur l'horizon. */
export function events(device, horizon, kind) {
  const life = lifetimeOf(device, kind);
  const repairs = repairsOf(device, kind);
  const list = [];
  for (let start = 0; start < horizon - EPS; start += life) {
    list.push({ t: start, co2: device.fab, eur: device.price, kind: "buy" });
    for (const r of repairs) {
      const t = start + r.year;
      if (t < horizon - EPS) {
        list.push({ t, co2: toNumber(r.co2), eur: repairCost(r, device.aid), kind: "repair", label: r.label });
      }
    }
  }
  return list.sort((a, b) => a.t - b.t);
}

/** Courbe cumulée en escalier : usage continu (rate par an) et marche à chaque événement. */
export function cumulative(eventList, horizon, rate, key) {
  const points = [];
  let total = 0;
  let last = 0;
  for (const e of eventList) {
    total += (e.t - last) * rate;
    last = e.t;
    points.push([e.t, total]);
    total += e[key];
    points.push([e.t, total]);
  }
  total += (horizon - last) * rate;
  points.push([horizon, total]);
  return points;
}

/** Nombre d'équipements achetés sur l'horizon. */
export function purchases(device, horizon, kind) {
  return Math.ceil(horizon / lifetimeOf(device, kind) - EPS);
}
