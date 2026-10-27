/**
 * État de l'application : hypothèses globales, hypothèses par équipement, équipement affiché.
 * Persistance locale (localStorage) en confort : l'application fonctionne sans.
 */
import { GLOBAL_DEFAULTS, DEVICE_DEFAULTS, DEFAULT_DEVICE, LIFETIME_RANGE, EXTENSION_RANGE } from "../data/defaults.js?v=202610270821";

const STORAGE_KEY = "tnrc-simulateur-duree-de-vie-v3";

const clone = value => structuredClone(value);

function initialState() {
  return { global: clone(GLOBAL_DEFAULTS), devices: clone(DEVICE_DEFAULTS), current: DEFAULT_DEVICE };
}

function isValid(state) {
  return state && state.global && state.devices
    && Object.keys(DEVICE_DEFAULTS).every(k => state.devices[k])
    && DEVICE_DEFAULTS[state.current];
}

const clamp = (v, min, max, fallback) => (Number.isFinite(+v) ? Math.min(max, Math.max(min, +v)) : fallback);

/**
 * Remet en cohérence un état sauvegardé par une version antérieure :
 * durées bornées, durée prolongée jamais inférieure à la durée habituelle,
 * champs manquants repris des valeurs par défaut.
 */
function sanitize(saved) {
  const state = { ...initialState(), ...saved, global: { ...GLOBAL_DEFAULTS, ...saved.global } };
  for (const [key, defaults] of Object.entries(DEVICE_DEFAULTS)) {
    const d = { ...clone(defaults), ...saved.devices[key] };
    d.life = clamp(d.life, LIFETIME_RANGE.min, LIFETIME_RANGE.max, defaults.life);
    d.lifeExt = d.life + clamp(d.lifeExt - d.life, EXTENSION_RANGE.min, EXTENSION_RANGE.max, defaults.lifeExt - defaults.life);
    if (!Array.isArray(d.repairs)) d.repairs = clone(defaults.repairs);
    delete d.compta; // remplacé par la durée habituelle, figée
    state.devices[key] = d;
  }
  return state;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isValid(saved) ? sanitize(saved) : initialState();
  } catch {
    return initialState();
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // stockage indisponible : on continue sans persistance
  }
}

// Raisons de changement, de la plus large à la plus fine
const REASONS = ["reset", "device", "repairs", "value"];
const PERSIST_DELAY_MS = 300;

/**
 * Store minimal : lecture, mise à jour par mutation encadrée, abonnement.
 * Les notifications sont regroupées par frame d'affichage (curseurs, saisie rapide)
 * et la sauvegarde est différée. Chaque abonné reçoit l'état et la raison la plus large
 * du lot ("reset", "device", "repairs" ou "value").
 */
export function createStore() {
  let state = load();
  const listeners = new Set();
  let pending = null;
  let persistTimer = null;

  function schedule(reason) {
    if (pending === null) {
      pending = reason;
      requestAnimationFrame(() => {
        const batched = pending;
        pending = null;
        // Une vue en erreur ne doit pas empêcher les autres de se mettre à jour
        listeners.forEach(fn => {
          try {
            fn(state, batched);
          } catch (error) {
            console.error("[simulateur] échec de mise à jour d'une vue", error);
          }
        });
      });
    } else if (REASONS.indexOf(reason) < REASONS.indexOf(pending)) {
      pending = reason;
    }
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persist(state), PERSIST_DELAY_MS);
  }

  return {
    get: () => state,
    device: () => state.devices[state.current],

    update(mutate, reason = "value") {
      mutate(state);
      schedule(reason);
    },

    reset() {
      const current = state.current;
      state = { ...initialState(), current };
      schedule("reset");
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
