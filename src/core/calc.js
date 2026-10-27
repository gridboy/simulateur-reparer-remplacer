/**
 * Moteur de calcul : fonctions pures, sans accès au DOM.
 *
 * Deux scénarios pour un même équipement :
 *  - "replace" : remplacer au terme de la durée de vie habituelle (life)
 *  - "repair"  : réparer et prolonger jusqu'à la durée prolongée (lifeExt)
 *
 * Logique comptable : la durée habituelle est la durée d'amortissement, figée.
 * Prix d'achat et fabrication sont amortis linéairement sur cette durée ; les années
 * de service au-delà sont des années bonus, sans dotation. Les réparations sont
 * comptées l'année où elles ont lieu. (La méthode Bilan Carbone amortit de même
 * l'empreinte des immobilisations sur leur durée d'amortissement.)
 */

export const SCENARIO = Object.freeze({ REPLACE: "replace", REPAIR: "repair", REFURB: "refurb" });

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

/** Années d'amortissement comprises dans l'horizon pour un scénario (le reste est bonus). */
export function amortizedYears(device, horizon, kind) {
  const step = lifetimeOf(device, kind);
  let years = 0;
  for (let start = 0; start < horizon - EPS; start += step) {
    years += Math.min(device.life, horizon - start);
  }
  return years;
}

/**
 * Bilan d'un poste sur l'horizon, en logique d'amortissement (hors usage, identique) :
 * remplacer = dotation chaque année ; réparer = dotation pendant les années
 * d'amortissement seulement, plus les réparations.
 */
function ledger({ charge, use, horizon, amortized, repairs, resaleBefore = 0, resaleAfter = 0 }) {
  // L'usage (électricité) est identique dans les deux scénarios : il est reporté à part
  // et n'entre pas dans les totaux comparés.
  const before = charge * horizon - resaleBefore;
  const avoided = charge * (horizon - amortized);
  const after = charge * amortized + repairs - resaleAfter;
  const net = before - after;
  return {
    before, after, avoided, repairs, net, perYear: net / horizon, pct: before ? net / before * 100 : 0,
    charge, amortized, usage: use * horizon, resaleBefore, resaleAfter
  };
}

/** Comparaison réparer vs remplacer : gain carbone, gain financier, valeur du carbone évité. */
export function compare(device, global) {
  const { horizon } = global;
  const replace = scenario(device, global, SCENARIO.REPLACE);
  const repair = scenario(device, global, SCENARIO.REPAIR);
  const amortized = amortizedYears(device, horizon, SCENARIO.REPAIR);
  const repairsInHorizon = events(device, horizon, SCENARIO.REPAIR).filter(e => e.kind === "repair");

  const carbon = ledger({
    charge: device.fab / device.life, use: device.kwh * global.ef, horizon, amortized,
    repairs: repairsInHorizon.reduce((sum, e) => sum + e.co2, 0)
  });
  const money = ledger({
    charge: device.price / device.life, use: device.kwh * global.elec, horizon, amortized,
    repairs: repairsInHorizon.reduce((sum, e) => sum + e.eur, 0),
    resaleBefore: resaleCredit(device, horizon, SCENARIO.REPLACE),
    resaleAfter: resaleCredit(device, horizon, SCENARIO.REPAIR)
  });
  const carbonValue = carbon.net / 1000 * global.carbon;
  const extension = device.lifeExt / device.life - 1;

  return {
    replace,
    repair,
    carbon,
    money,
    carbonValue,
    total: money.net + carbonValue,
    amortizedYears: amortized,
    bonusYears: horizon - amortized,
    repairCount: repairsInHorizon.length,
    // Total des réparations d'un cycle au-delà duquel réparer ne fait plus gagner
    // Réparer renonce à une revente par cycle prolongé : elle réduit le budget de réparation
    breakEven: {
      eur: device.price * extension - (device.lifeExt > device.life ? resaleValue(device, SCENARIO.REPLACE) : 0),
      co2: device.fab * extension
    },
    // Budget de réparation sur l'horizon : au-delà, le bilan affiché devient négatif
    budget: {
      eur: money.avoided - (money.resaleBefore - money.resaleAfter),
      co2: carbon.avoided
    }
  };
}

/** Valeur de revente d'un équipement remplacé au terme de son amortissement (0 s'il est gardé au-delà). */
function resaleValue(device, kind) {
  if (lifetimeOf(device, kind) !== device.life) return 0;
  return Math.min(Math.max(0, toNumber(device.resale)), device.price);
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
    // Revente de l'équipement remplacé avant la fin de l'horizon (recette, sans crédit carbone)
    const resale = resaleValue(device, kind);
    if (resale > 0 && start + life < horizon - EPS) {
      list.push({ t: start + life, co2: 0, eur: -resale, kind: "resale" });
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

/**
 * Reventes dans l'horizon : un équipement remplacé avant la fin de l'horizon rapporte
 * sa valeur de revente (bornée au prix neuf) s'il est remplacé au terme de son
 * amortissement ; gardé au-delà (réparé), il ne vaut plus rien.
 */
export function resaleCredit(device, horizon, kind) {
  const step = lifetimeOf(device, kind);
  const value = resaleValue(device, kind);
  if (!value) return 0;
  let total = 0;
  for (let start = 0; start + step < horizon - EPS; start += step) total += value;
  return total;
}

/**
 * Trois options sur l'horizon, hors usage : remplacer par du neuf, réparer,
 * acheter reconditionné (amorti sur sa propre durée, sans réparation ni revente).
 */
export function options(device, global) {
  const c = compare(device, global);
  const { horizon } = global;
  const refurb = device.refurb;
  return [
    { kind: SCENARIO.REPLACE, eur: c.money.before, co2: c.carbon.before },
    { kind: SCENARIO.REPAIR, eur: c.money.after, co2: c.carbon.after },
    { kind: SCENARIO.REFURB, eur: refurb.price / refurb.life * horizon, co2: refurb.fab / refurb.life * horizon }
  ];
}

/** Options au minimum pour une clé (à une demi-unité près) : plusieurs en cas d'égalité. */
export function cheapest(list, key) {
  const min = Math.min(...list.map(o => o[key]));
  return list.filter(o => o[key] - min < 0.5).map(o => o.kind);
}

/** Tri croissant stable : à égalité, l'ordre d'origine est conservé. */
export function rankOptions(list, key) {
  return [...list].sort((a, b) => a[key] - b[key]);
}

/** Nombre d'équipements achetés sur l'horizon. */
export function purchases(device, horizon, kind) {
  return Math.ceil(horizon / lifetimeOf(device, kind) - EPS);
}
