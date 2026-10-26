/**
 * Contrôleurs de durée de vie :
 *  - remplacer : durée de vie habituelle de l'équipement
 *  - réparer   : années gagnées par la réparation, ajoutées à la durée habituelle (dès 0)
 * L'état garde la durée prolongée (lifeExt = life + années gagnées) ; changer la durée
 * habituelle conserve le nombre d'années gagnées.
 */
import { LIFETIME_RANGE, EXTENSION_RANGE } from "../data/defaults.js";
import { formatYears, formatDec } from "../core/format.js";

const CONTROLS = [
  {
    key: "life", scenario: "replace", tag: "Remplacer", range: LIFETIME_RANGE,
    title: "Durée de vie habituelle", hint: "Renouvellement au rythme actuel"
  },
  {
    key: "extension", scenario: "repair", tag: "Réparer", range: EXTENSION_RANGE,
    title: "Années gagnées par la réparation", hint: "Ajoutées à la durée habituelle"
  }
];

const RULER_MAX = LIFETIME_RANGE.max + EXTENSION_RANGE.max;

const snap = (v, { min, max, step }) => Math.min(max, Math.max(min, Math.round(v / step) * step));
const pct = v => (v / RULER_MAX) * 100;
const extensionOf = d => Math.max(0, d.lifeExt - d.life);

function controlHtml(c) {
  const { min, max, step } = c.range;
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
      <small class="life-total" id="life-total-${c.key}"></small>
    </div>`;
}

function rulerTicks() {
  const ticks = [];
  for (let y = 0; y <= RULER_MAX; y += 5) ticks.push(`<span style="left:${pct(y)}%">${y}</span>`);
  return ticks.join("");
}

export function mountLifetimeControls(root, store) {
  root.innerHTML = `
    <div class="life-controls">${CONTROLS.map(controlHtml).join("")}</div>
    <div class="ruler" aria-hidden="true">
      <div class="ruler-track">
        <div class="ruler-bar" data-scenario="replace"></div>
        <div class="ruler-bar" data-scenario="repair"></div>
        <span class="ruler-label" data-scenario="replace"></span>
        <span class="ruler-label" data-scenario="repair"></span>
        <div class="ruler-compta"></div>
      </div>
      <div class="ruler-ticks">${rulerTicks()}</div>
    </div>
    <p class="life-gain" id="life-gain"></p>`;

  const setters = {
    life: value => store.update(state => {
      const d = state.devices[state.current];
      const extension = extensionOf(d);
      d.life = snap(value, LIFETIME_RANGE);
      d.lifeExt = d.life + extension;
    }),
    extension: value => store.update(state => {
      const d = state.devices[state.current];
      d.lifeExt = d.life + snap(value, EXTENSION_RANGE);
    })
  };
  const current = { life: d => d.life, extension: extensionOf };

  root.addEventListener("input", event => {
    const key = event.target.dataset.key;
    if (event.target.type === "range" && setters[key]) setters[key](+event.target.value);
  });
  root.addEventListener("click", event => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const key = button.dataset.key;
    setters[key](current[key](store.device()) + LIFETIME_RANGE.step * +button.dataset.step);
  });

  function render() {
    const d = store.device();
    const extension = extensionOf(d);

    root.querySelector("#life-out-life").textContent = formatYears(d.life);
    root.querySelector("#life-range-life").value = d.life;
    root.querySelector("#life-total-life").textContent = "";

    root.querySelector("#life-out-extension").textContent = `+${formatYears(extension)}`;
    root.querySelector("#life-range-extension").value = extension;
    root.querySelector("#life-total-extension").textContent = `Soit ${formatYears(d.lifeExt)} d'usage au total`;

    root.querySelector('.ruler-bar[data-scenario="replace"]').style.width = `${pct(d.life)}%`;
    root.querySelector('.ruler-bar[data-scenario="repair"]').style.width = `${pct(d.lifeExt)}%`;
    root.querySelector(".ruler-compta").style.left = `${pct(d.compta)}%`;
    const labelReplace = root.querySelector('.ruler-label[data-scenario="replace"]');
    labelReplace.style.left = `${pct(d.life)}%`;
    labelReplace.textContent = `remplacer : ${formatYears(d.life)}`;
    const labelRepair = root.querySelector('.ruler-label[data-scenario="repair"]');
    labelRepair.style.left = `${pct(d.lifeExt)}%`;
    labelRepair.textContent = `réparer : ${formatYears(d.lifeExt)}`;

    root.querySelector("#life-gain").innerHTML = extension > 0
      ? `<strong>+${formatDec(extension)} ${extension >= 2 ? "ans" : "an"}</strong> d'usage gagnés par la réparation · amortissement comptable sur ${formatYears(d.compta)} (trait)`
      : "Aucune année gagnée : réparer revient ici à remplacer. Ajoutez des années pour mesurer l'effet de la réparation.";
  }

  store.subscribe(render);
  render();
}
