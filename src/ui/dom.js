/** Petits utilitaires DOM partagés par les vues. */

export const byId = id => document.getElementById(id);

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Échappe un texte saisi par l'utilisateur avant insertion dans du HTML. */
export const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ESCAPES[c]);

/** Lit un nombre saisi (virgule acceptée), borné. */
export function readNumber(input, { min = 0, max = Infinity } = {}) {
  const n = parseFloat(String(input.value).replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

/** Met à jour la valeur d'un champ sans écraser la saisie en cours. */
export function setValue(input, value) {
  if (document.activeElement !== input) input.value = value;
}
