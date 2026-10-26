/**
 * Champs numériques déclaratifs : une définition = un libellé, une unité, des bornes,
 * et un accès (get/set) à l'état. Un seul écouteur délégué par conteneur.
 */
import { byId, readNumber, setValue } from "./dom.js?v=202610262159";

/** HTML d'une liste de champs. */
export function fieldsHtml(prefix, defs) {
  return defs.map(f => `
    <div class="field">
      <label for="${prefix}-${f.key}">${f.label}<small>${f.unit}</small></label>
      <input type="number" id="${prefix}-${f.key}" data-key="${f.key}"
        min="${f.min ?? 0}" ${f.max != null ? `max="${f.max}"` : ""} step="${f.step ?? 1}" inputmode="decimal">
    </div>`).join("");
}

/** Recopie l'état dans les champs (sans écraser une saisie en cours). */
export function syncFields(prefix, defs, source) {
  defs.forEach(f => setValue(byId(`${prefix}-${f.key}`), source[f.key]));
}

/** Branche la saisie : chaque modification met à jour l'état via le store. */
export function bindFields(root, defs, store, target) {
  const byKey = Object.fromEntries(defs.map(f => [f.key, f]));
  root.addEventListener("input", event => {
    const def = byKey[event.target.dataset.key];
    if (!def) return;
    const value = readNumber(event.target, { min: def.min ?? 0, max: def.max });
    store.update(state => { target(state)[def.key] = value; });
  });
}
