/** Panneau d'hypothèses : équipement neuf et paramètres communs. */
import { EMISSION_FACTORS, CARBON_PRICES } from "../data/defaults.js?v=202610270823";
import { byId } from "./dom.js?v=202610270823";
import { fieldsHtml, syncFields, bindFields } from "./fields.js?v=202610270823";

const DEVICE_FIELDS = [
  { key: "fab", label: "Fabrication", unit: "kgCO₂e, hors usage", step: 1 },
  { key: "price", label: "Prix d'achat", unit: "€ HT", step: 10 },
  { key: "kwh", label: "Consommation", unit: "kWh par an", step: 1 },
  { key: "aid", label: "Aide à la réparation", unit: "€ par intervention", step: 5 }
];

const GLOBAL_FIELDS = [
  { key: "horizon", label: "Horizon d'analyse", unit: "années", min: 1, max: 30, step: 1 },
  { key: "elec", label: "Prix de l'électricité", unit: "€ HT / kWh", step: 0.01 },
  { key: "carbon", label: "Prix du carbone", unit: "€ / tCO₂e", step: 10 }
];

export function mountDeviceParams(root, store) {
  root.innerHTML = fieldsHtml("dev", DEVICE_FIELDS);
  bindFields(root, DEVICE_FIELDS, store, state => state.devices[state.current]);

  const render = () => syncFields("dev", DEVICE_FIELDS, store.device());
  store.subscribe(render);
  render();
}

const REFURB_FIELDS = [
  { key: "price", label: "Prix reconditionné", unit: "€ HT", step: 10 },
  { key: "fab", label: "Fabrication reconditionné", unit: "kgCO₂e", step: 1 },
  { key: "life", label: "Amortissement reconditionné", unit: "années", min: 1, max: 12, step: 0.5 }
];

const RESALE_FIELDS = [
  { key: "resale", label: "Revente de l'équipement remplacé", unit: "€ HT, au terme de l'amortissement", step: 10 }
];

export function mountRefurbParams(root, store) {
  root.innerHTML = `
    ${fieldsHtml("refurb", REFURB_FIELDS)}
    ${fieldsHtml("resale", RESALE_FIELDS)}
    <p class="field-note">Revente sans crédit carbone : la fabrication reste imputée au premier utilisateur.</p>`;
  bindFields(root, REFURB_FIELDS, store, state => state.devices[state.current].refurb);
  bindFields(root, RESALE_FIELDS, store, state => state.devices[state.current]);

  const render = () => {
    syncFields("refurb", REFURB_FIELDS, store.device().refurb);
    syncFields("resale", RESALE_FIELDS, store.device());
  };
  store.subscribe(render);
  render();
}

export function mountGlobalParams(root, store) {
  root.innerHTML = `
    ${fieldsHtml("glob", GLOBAL_FIELDS)}
    <div class="chips" role="group" aria-label="Prix du carbone de référence">
      ${CARBON_PRICES.map(p => `<button type="button" class="chip" data-carbon="${p.value}">${p.label} · ${p.detail}</button>`).join("")}
    </div>
    <div class="field">
      <label for="glob-ef">Mix électrique<small>kgCO₂e / kWh</small></label>
      <select id="glob-ef">${EMISSION_FACTORS.map(f => `<option value="${f.value}">${f.label}</option>`).join("")}</select>
    </div>`;

  bindFields(root, GLOBAL_FIELDS, store, state => state.global);

  byId("glob-ef").addEventListener("change", event => {
    store.update(state => { state.global.ef = +event.target.value; });
  });
  root.addEventListener("click", event => {
    const chip = event.target.closest("[data-carbon]");
    if (chip) store.update(state => { state.global.carbon = +chip.dataset.carbon; });
  });

  function render(state) {
    syncFields("glob", GLOBAL_FIELDS, state.global);
    byId("glob-ef").value = String(state.global.ef);
    root.querySelectorAll("[data-carbon]").forEach(chip => {
      chip.setAttribute("aria-pressed", +chip.dataset.carbon === state.global.carbon);
    });
  }
  store.subscribe(render);
  render(store.get());
}
