/** Seuils de pertinence : jusqu'où la réparation reste gagnante, en euros et en carbone. */
import { compare } from "../core/calc.js?v=202610262156";
import { formatEur, formatKg, formatYears, formatPct } from "../core/format.js?v=202610262156";

function gauge(label, used, limit, format) {
  const ratio = limit > 0 ? used / limit : 1;
  const state = ratio <= 0.6 ? "ok" : ratio <= 1 ? "watch" : "over";
  return `
    <div class="threshold" data-state="${state}">
      <div class="threshold-head">
        <span>${label}</span>
        <span class="threshold-values"><b>${format(used)}</b> sur ${format(limit)} possibles</span>
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
    const afterCompta = years => formatYears(Math.max(0, years - d.compta));
    root.innerHTML = `
      ${gauge("Budget de réparation", c.repair.repairEur, c.breakEven.eur, formatEur)}
      ${gauge("Empreinte des réparations", c.repair.repairCo2, c.breakEven.co2, formatKg)}
      <ul class="facts">
        <li>Les réparations coûtent <b>${formatPct(c.repair.repairEur / d.price * 100)}</b> du prix d'un équipement neuf
          et émettent <b>${formatPct(d.fab ? c.repair.repairCo2 / d.fab * 100 : 0)}</b> de son empreinte de fabrication.</li>
        <li>Amorti en ${formatYears(d.compta)}, l'équipement réparé sert encore <b>${afterCompta(d.lifeExt)}</b> sans dotation,
          contre ${afterCompta(d.life)} en le remplaçant.</li>
      </ul>`;
  }
  store.subscribe(render);
  render(store.get());
}
