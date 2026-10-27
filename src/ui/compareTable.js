/** Tableau des quatre équipements avec leurs hypothèses, et total pour un poste complet. */
import { compare } from "../core/calc.js?v=202610270823";
import { formatDec, formatInt, formatEur, formatKg, formatGain, formatPct } from "../core/format.js?v=202610270823";

const pill = pct => `<span class="pill ${pct < 0 ? "is-negative" : ""}">${formatGain(pct, formatPct)}</span>`;

function rowHtml(name, lives, r) {
  return `
    <tr>
      <th scope="row">${name}</th>
      <td>${lives}</td>
      <td>${formatDec(r.co2A)}</td><td>${formatDec(r.co2B)}</td><td>${pill(r.co2Pct)}</td>
      <td>${formatInt(r.eurA)}</td><td>${formatInt(r.eurB)}</td><td>${pill(r.eurPct)}</td>
      <td>${formatGain(r.co2Net, formatKg)}</td><td>${formatGain(r.eurNet, formatEur)}</td>
    </tr>`;
}

const pct = (a, b) => (a ? (a - b) / a * 100 : 0);

export function mountCompareTable(root, store) {
  root.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Équipement</th><th scope="col">Durées</th>
            <th scope="col">kgCO₂e/an*<br>remplacer</th><th scope="col">kgCO₂e/an*<br>réparer</th><th scope="col">Écart</th>
            <th scope="col">€/an*<br>remplacer</th><th scope="col">€/an*<br>réparer</th><th scope="col">Écart</th>
            <th scope="col">Gain carbone<br>horizon</th><th scope="col">Gain financier<br>horizon</th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot></tfoot>
      </table>
    </div>`;
  const body = root.querySelector("tbody");
  const foot = root.querySelector("tfoot");

  function render(state) {
    const total = { co2A: 0, co2B: 0, eurA: 0, eurB: 0, co2Net: 0, eurNet: 0 };
    body.innerHTML = Object.values(state.devices).map(d => {
      const c = compare(d, state.global);
      const H = state.global.horizon;
      const r = {
        co2A: c.carbon.before / H, co2B: c.carbon.after / H,
        eurA: c.money.before / H, eurB: c.money.after / H,
        co2Net: c.carbon.net, eurNet: c.money.net
      };
      Object.keys(total).forEach(k => { total[k] += r[k]; });
      return rowHtml(d.name, `${formatDec(d.life)} → ${formatDec(d.lifeExt)} ans`,
        { ...r, co2Pct: pct(r.co2A, r.co2B), eurPct: pct(r.eurA, r.eurB) });
    }).join("");
    foot.innerHTML = rowHtml("Poste complet", "",
      { ...total, co2Pct: pct(total.co2A, total.co2B), eurPct: pct(total.eurA, total.eurB) });
  }
  store.subscribe(render);
  render(store.get());
}
