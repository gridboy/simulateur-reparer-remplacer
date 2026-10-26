/**
 * Hypothèses par défaut du simulateur.
 *
 * Empreinte de fabrication (kgCO₂e, cycle de vie hors usage) : ADEME Base Empreinte
 * (données NegaOctet), reprises par l'API Boavizta (boaviztapi/data/factors.yml).
 * Prix 2026, consommations et empreinte des pièces : ordres de grandeur à ajuster.
 */

export const GLOBAL_DEFAULTS = Object.freeze({
  horizon: 12,     // années d'analyse
  ef: 0.052,       // kgCO₂e / kWh, mix moyen France (ADEME)
  elec: 0.20,      // € HT / kWh
  carbon: 200      // € / tCO₂e, valeur de l'action pour le climat ≈ 2026
});

export const EMISSION_FACTORS = Object.freeze([
  { value: 0.052, label: "France · 0,052" },
  { value: 0.25, label: "Moyenne UE · 0,25" },
  { value: 0.45, label: "Moyenne monde · 0,45" }
]);

export const CARBON_PRICES = Object.freeze([
  { value: 75, label: "Marché UE ETS", detail: "75 €/t" },
  { value: 200, label: "Valeur tutélaire 2026", detail: "200 €/t" },
  { value: 250, label: "Valeur tutélaire 2030", detail: "250 €/t" }
]);

export const LIFETIME_RANGE = Object.freeze({ min: 1, max: 15, step: 0.5 });

export const DEVICE_DEFAULTS = Object.freeze({
  ecran: {
    name: "Écran 24″",
    sub: "Moniteur LED 23,8–24″, bureautique",
    fab: 64.7, price: 180, kwh: 35, compta: 3, life: 6, lifeExt: 10, aid: 0,
    repairs: [
      { label: "Carte d'alimentation", year: 6, parts: 40, labor: 40, co2: 3, on: true }
    ]
  },
  fixe: {
    name: "Ordinateur fixe",
    sub: "Unité centrale bureautique, sans écran",
    fab: 277, price: 850, kwh: 120, compta: 3, life: 5, lifeExt: 8, aid: 0,
    repairs: [
      { label: "Mise à niveau SSD + RAM", year: 5, parts: 110, labor: 50, co2: 20, on: true },
      { label: "Alimentation", year: 6.5, parts: 60, labor: 40, co2: 4, on: false }
    ]
  },
  laptop: {
    name: "Ordinateur portable",
    sub: "14″ bureautique pro",
    fab: 181, price: 1100, kwh: 30, compta: 3, life: 4, lifeExt: 7, aid: 0,
    repairs: [
      { label: "Batterie", year: 4, parts: 90, labor: 40, co2: 6, on: true },
      { label: "Dalle d'écran", year: 5, parts: 180, labor: 70, co2: 25, on: false },
      { label: "Clavier", year: 5.5, parts: 70, labor: 50, co2: 3, on: false }
    ]
  },
  phone: {
    name: "Smartphone 6″",
    sub: "Milieu de gamme, 6 pouces",
    fab: 84, price: 450, kwh: 4, compta: 3, life: 2.5, lifeExt: 5, aid: 0,
    repairs: [
      { label: "Batterie", year: 2.5, parts: 50, labor: 30, co2: 2, on: true },
      { label: "Écran", year: 3.5, parts: 120, labor: 40, co2: 10, on: false }
    ]
  }
});

export const DEFAULT_DEVICE = "laptop";
