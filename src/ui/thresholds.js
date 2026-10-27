/**
 * Seuils de pertinence sur l'horizon : budget total de réparations au-delà duquel réparer
 * ne fait plus gagner, en euros et en carbone. Cohérent avec le bilan des économies.
 */
import { compare } from "../core/calc.js?v=202610270837";
import { formatEur, formatKg, formatYears, formatPct } from "../core/format.js?v=202610270837";

function gauge(label, used, limit, format) {
  const ratio = limit > 0 ? used / limit : used > 0 ? Infinity : 1;
  const state = ratio <= 0.6 ? "ok" : ratio <= 1 ? "watch" : "over";
  return `
    <div class="threshold" data-state="${state}">
      <div class="threshold-head">
        <span>${label}</span>
        <span class="threshold-values"><b>${format(used)}</b> sur ${format(Math.max(0, limit))} possibles</span>
      </div>
      <div class="gauge"><span style="width:${Math.min(100, ratio * 100)}%"></span></div>
      <small>${state === "over"
        ? "Seuil dépassé : remplacer devient plus avantageux."
        : `Marge restante : ${format(limit - used)}.`}</small>
    </div>`;
}

export function mountThresholds(root, store) {
  function render(state) {
    const d = store.device();
    const c = compare(d, state.global);
    const gained = d.lifeExt - d.life;
    if (gained <= 0) {
      root.innerHTML = `<p class="muted">Ajoutez des années gagnées par la réparation pour calculer les seuils de pertinence.</p>`;
      return;
    }
    const horizon = state.global.horizon;
    root.innerHTML = `
      ${gauge(`Budget de réparation sur ${horizon} ans`, c.money.repairs, c.budget.eur, formatEur)}
      ${gauge(`Empreinte des réparations sur ${horizon} ans`, c.carbon.repairs, c.budget.co2, formatKg)}
      <p class="field-note">Budget = années bonus sans amortissement − revente perdue. Au-delà, le bilan affiché plus haut devient négatif.</p>
      <ul class="facts">
        <li>Les réparations coûtent <b>${formatPct(c.repair.repairEur / d.price * 100)}</b> du prix d'un équipement neuf
          et émettent <b>${formatPct(d.fab ? c.repair.repairCo2 / d.fab * 100 : 0)}</b> de son empreinte de fabrication.</li>
        <li>Amorti en ${formatYears(d.life)}, l'équipement réparé sert ensuite <b>${formatYears(gained)} bonus</b> sans dotation : chaque année bonus vous fait éviter ${formatEur(d.price / d.life)} d'amortissement et ${formatKg(d.fab / d.life)} CO₂e de fabrication.</li>
      </ul>`;
  }
  store.subscribe(render);
  render(store.get());
}
