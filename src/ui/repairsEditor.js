/**
 * Éditeur des réparations du scénario "réparer".
 * Chaque intervention : libellé, année, pièces, main-d'œuvre, empreinte, activation.
 */
import { escapeHtml, readNumber } from "./dom.js?v=202610262216";
import { repairCost } from "../core/calc.js?v=202610262216";
import { formatEur } from "../core/format.js?v=202610262216";

const NUMERIC = ["year", "parts", "labor", "co2"];
const STRUCTURAL = new Set(["device", "reset", "repairs"]);

const NEW_REPAIR = { label: "Nouvelle intervention", parts: 60, labor: 40, co2: 5, on: true };

function rowHtml(r, i, device) {
  const outside = r.year >= device.lifeExt;
  const id = `rep-${i}`;
  return `
    <li class="repair ${r.on && !outside ? "" : "is-off"}" data-index="${i}">
      <div class="repair-top">
        <input type="checkbox" id="${id}-on" data-f="on" ${r.on ? "checked" : ""} aria-label="Prendre en compte ${escapeHtml(r.label)}">
        <input type="text" class="repair-label" id="${id}-label" data-f="label" value="${escapeHtml(r.label)}" aria-label="Intitulé de l'intervention">
        <button type="button" class="icon-btn" data-remove="${i}" aria-label="Supprimer ${escapeHtml(r.label)}">×</button>
      </div>
      <div class="repair-grid">
        <label>Année<input type="number" id="${id}-year" data-f="year" min="0.5" step="0.5" value="${r.year}" inputmode="decimal"></label>
        <label>Pièces €<input type="number" id="${id}-parts" data-f="parts" min="0" step="10" value="${r.parts}" inputmode="decimal"></label>
        <label>Main-d'œuvre €<input type="number" id="${id}-labor" data-f="labor" min="0" step="10" value="${r.labor}" inputmode="decimal"></label>
        <label>kgCO₂e<input type="number" id="${id}-co2" data-f="co2" min="0" step="1" value="${r.co2}" inputmode="decimal"></label>
      </div>
      <p class="repair-note">${outside
        ? "Après la fin de la durée prolongée : non comptée."
        : `Coût net ${formatEur(repairCost(r, device.aid))}${device.aid ? ` après aide de ${formatEur(device.aid)}` : ""}`}</p>
    </li>`;
}

export function mountRepairsEditor(root, store) {
  root.innerHTML = `
    <ol class="repairs" id="repairs-list"></ol>
    <button type="button" class="btn-secondary" id="repair-add">Ajouter une intervention</button>`;
  const list = root.querySelector("#repairs-list");

  function render() {
    const d = store.device();
    list.innerHTML = d.repairs.length
      ? d.repairs.map((r, i) => rowHtml(r, i, d)).join("")
      : `<li class="empty">Aucune réparation : le scénario « réparer » prolonge seulement la durée de vie.</li>`;
  }

  // Mise à jour légère d'une ligne existante (sans perdre le focus)
  function refreshRow(row, r, d) {
    const outside = r.year >= d.lifeExt;
    row.classList.toggle("is-off", !r.on || outside);
    row.querySelector(".repair-note").textContent = outside
      ? "Après la fin de la durée prolongée : non comptée."
      : `Coût net ${formatEur(repairCost(r, d.aid))}${d.aid ? ` après aide de ${formatEur(d.aid)}` : ""}`;
  }

  list.addEventListener("input", event => {
    const row = event.target.closest("[data-index]");
    const field = event.target.dataset.f;
    if (!row || !field) return;
    const index = +row.dataset.index;
    store.update(state => {
      const r = state.devices[state.current].repairs[index];
      if (field === "on") r.on = event.target.checked;
      else if (field === "label") r.label = event.target.value;
      else if (NUMERIC.includes(field)) r[field] = readNumber(event.target, { min: 0 });
    });
  });

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    store.update(state => { state.devices[state.current].repairs.splice(+button.dataset.remove, 1); }, "repairs");
  });

  root.querySelector("#repair-add").addEventListener("click", () => {
    store.update(state => {
      const d = state.devices[state.current];
      d.repairs.push({ ...NEW_REPAIR, year: Math.max(0.5, Math.floor(d.life)) });
    }, "repairs");
  });

  store.subscribe((state, reason) => {
    if (STRUCTURAL.has(reason)) return render();
    const d = store.device();
    list.querySelectorAll("[data-index]").forEach(row => refreshRow(row, d.repairs[+row.dataset.index], d));
  });
  render();
}
