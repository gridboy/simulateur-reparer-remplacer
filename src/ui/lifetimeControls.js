/**
 * Contrôleurs de durée de vie : remplacer (durée habituelle) et réparer (durée prolongée).
 * Chaque contrôleur combine boutons −/+ et curseur ; une règle commune visualise l'écart.
 */
import { LIFETIME_RANGE } from "../data/defaults.js";
import { formatYears, formatDec } from "../core/format.js";

const { min, max, step } = LIFETIME_RANGE;

const CONTROLS = [
  { key: "life", scenario: "replace", tag: "Remplacer", title: "Durée de vie habituelle", hint: "Renouvellement au rythme actuel" },
  { key: "lifeExt", scenario: "repair", tag: "Réparer", title: "Durée de vie prolongée", hint: "Avec les réparations prévues" }
];

const clamp = v => Math.min(max, Math.max(min, Math.round(v / step) * step));
const pct = v => (v / max) * 100;

function controlHtml(c) {
  return `
    <div class="life-control" data-scenario="${c.scenario}">
      <div class="life-head">
        <span class="tag">${c.tag}</span>
        <label for="life-range-${c.key}">${c.title}</label>
        <small>${c.hint}</small>
      </div>
      <div class="stepper">
        <button type="button" data-key="${c.key}" data-step="-1" aria-label="${c.title} : retirer 6 mois">−</button>
        <output id="life-out-${c.key}" for="life-range-${c.key}" aria-live="polite"></output>
        <button type="button" data-key="${c.key}" data-step="1" aria-label="${c.title} : ajouter 6 mois">+</button>
      </div>
      <input type="range" id="life-range-${c.key}" data-key="${c.key}" min="${min}" max="${max}" step="${step}">
    </div>`;
}

function rulerTicks() {
  const ticks = [];
  for (let y = 0; y <= max; y += 3) ticks.push(`<span style="left:${pct(y)}%">${y}</span>`);
  return ticks.join("");
}

export function mountLifetimeControls(root, store) {
  root.innerHTML = `
    <div class="life-controls">${CONTROLS.map(controlHtml).join("")}</div>
    <div class="ruler" aria-hidden="true">
      <div class="ruler-track">
        <div class="ruler-bar" data-scenario="replace"></div>
        <div class="ruler-bar" data-scenario="repair"></div>
        <div class="ruler-compta"></div>
      </div>
      <div class="ruler-ticks">${rulerTicks()}</div>
    </div>
    <p class="life-gain" id="life-gain"></p>`;

  const setLife = (key, value) => store.update(state => { state.devices[state.current][key] = clamp(value); });

  root.addEventListener("input", event => {
    if (event.target.type === "range") setLife(event.target.dataset.key, +event.target.value);
  });
  root.addEventListener("click", event => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const key = button.dataset.key;
    setLife(key, store.device()[key] + step * +button.dataset.step);
  });

  function render() {
    const d = store.device();
    CONTROLS.forEach(c => {
      root.querySelector(`#life-out-${c.key}`).textContent = formatYears(d[c.key]);
      root.querySelector(`#life-range-${c.key}`).value = d[c.key];
    });
    root.querySelector('.ruler-bar[data-scenario="replace"]').style.width = `${pct(d.life)}%`;
    root.querySelector('.ruler-bar[data-scenario="repair"]').style.width = `${pct(d.lifeExt)}%`;
    root.querySelector(".ruler-compta").style.left = `${pct(d.compta)}%`;

    const gained = d.lifeExt - d.life;
    const gain = root.querySelector("#life-gain");
    gain.classList.toggle("is-warning", gained <= 0);
    gain.innerHTML = gained > 0
      ? `<strong>+${formatDec(gained)} ${gained >= 2 ? "ans" : "an"}</strong> d'usage gagnés par la réparation · amortissement comptable sur ${formatYears(d.compta)} (trait)`
      : "La durée prolongée doit dépasser la durée habituelle pour comparer les deux scénarios.";
  }

  store.subscribe(render);
  render();
}
