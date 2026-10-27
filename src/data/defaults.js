/**
 * Hypothèses par défaut du simulateur.
 *
 * La durée de vie habituelle (life) est aussi la durée d'amortissement, figée.
 *
 * Empreinte de fabrication (kgCO₂e, cycle de vie hors usage) : ADEME Base Empreinte
 * (données NegaOctet), reprises par l'API Boavizta (boaviztapi/data/factors.yml).
 * Prix 2026 : entrée de gamme professionnelle, tarifs grand compte (achats groupés, marchés cadres), en € HT.
 * Prix, consommations et empreinte des pièces : ordres de grandeur à ajuster.
 * Reconditionné : fabrication ≈ 15 % du neuf (ordre de grandeur ADEME/Arcep 2022, à confirmer).
 * resale : valeur de revente de l'équipement remplacé au terme de son amortissement, € HT.
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

export const LIFETIME_RANGE = Object.freeze({ min: 1, max: 12, step: 0.5 });     // durée habituelle
export const EXTENSION_RANGE = Object.freeze({ min: 0, max: 10, step: 0.5 });    // années gagnées en réparant

export const DEVICE_DEFAULTS = Object.freeze({
  ecran: {
    name: "Écran 24″",
    sub: "Moniteur LED 23,8–24″, bureautique",
    fab: 64.7, price: 100, kwh: 35, life: 6, lifeExt: 10, aid: 0,
    resale: 15, refurb: { price: 55, fab: 10, life: 4 },
    repairs: [
      { label: "Carte d'alimentation", year: 6, parts: 40, labor: 40, co2: 3, on: true }
    ]
  },
  fixe: {
    name: "Ordinateur fixe",
    sub: "Unité centrale bureautique, sans écran",
    fab: 277, price: 450, kwh: 120, life: 5, lifeExt: 8, aid: 0,
    resale: 35, refurb: { price: 250, fab: 42, life: 4 },
    repairs: [
      { label: "Mise à niveau SSD + RAM", year: 5, parts: 110, labor: 50, co2: 20, on: true },
      { label: "Alimentation", year: 6.5, parts: 60, labor: 40, co2: 4, on: false }
    ]
  },
  laptop: {
    name: "Ordinateur portable",
    sub: "14″ bureautique pro",
    fab: 181, price: 600, kwh: 30, life: 4, lifeExt: 7, aid: 0,
    resale: 70, refurb: { price: 330, fab: 27, life: 3 },
    repairs: [
      { label: "Batterie", year: 4, parts: 90, labor: 40, co2: 6, on: true },
      { label: "Dalle d'écran", year: 5, parts: 180, labor: 70, co2: 25, on: false },
      { label: "Clavier", year: 5.5, parts: 70, labor: 50, co2: 3, on: false }
    ]
  },
  phone: {
    name: "Smartphone 6″",
    sub: "Milieu de gamme, 6 pouces",
    fab: 84, price: 220, kwh: 4, life: 2.5, lifeExt: 5, aid: 0,
    resale: 40, refurb: { price: 130, fab: 13, life: 2 },
    repairs: [
      { label: "Batterie", year: 2.5, parts: 50, labor: 30, co2: 2, on: true },
      { label: "Écran", year: 3.5, parts: 120, labor: 40, co2: 10, on: false }
    ]
  }
});

export const DEFAULT_DEVICE = "laptop";

// Équivalence parlante : voiture thermique moyenne (ADEME, Impact CO2), kgCO₂e par km
export const CAR_KG_PER_KM = 0.218;
