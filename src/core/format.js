/** Formatage des nombres pour l'affichage (locale fr-FR). */

const int = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export const formatInt = v => int.format(v);
export const formatDec = v => dec.format(v);

export const formatKg = v => (Math.abs(v) >= 1000 ? `${dec.format(v / 1000)} t` : `${int.format(v)} kg`);
export const formatEur = v => `${int.format(v)} €`;
export const formatYears = v => `${dec.format(v)} ${v >= 2 ? "ans" : "an"}`;
export const formatPct = v => `${int.format(v)} %`;

/** Un gain s'affiche "+X", une perte "−X". */
export const formatGain = (v, fmt) => `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v))}`;
