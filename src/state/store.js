/**
 * État de l'application : hypothèses globales, hypothèses par équipement, équipement affiché.
 * Persistance locale (localStorage) en confort : l'application fonctionne sans.
 */
import { GLOBAL_DEFAULTS, DEVICE_DEFAULTS, DEFAULT_DEVICE } from "../data/defaults.js";

const STORAGE_KEY = "tnrc-simulateur-duree-de-vie-v2";

const clone = value => structuredClone(value);

function initialState() {
  return { global: clone(GLOBAL_DEFAULTS), devices: clone(DEVICE_DEFAULTS), current: DEFAULT_DEVICE };
}

function isValid(state) {
  return state && state.global && state.devices
    && Object.keys(DEVICE_DEFAULTS).every(k => state.devices[k])
    && DEVICE_DEFAULTS[state.current];
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isValid(saved) ? saved : initialState();
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
        listeners.forEach(fn => fn(state, batched));
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
