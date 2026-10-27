import test from "node:test";
import assert from "node:assert/strict";
import { sanitize } from "../src/state/store.js";
import { DEVICE_DEFAULTS, GLOBAL_DEFAULTS } from "../src/data/defaults.js";

test("état d'hier sans refurb ni resale : valeurs par défaut reprises", () => {
  const old = structuredClone({ global: GLOBAL_DEFAULTS, devices: DEVICE_DEFAULTS, current: "laptop" });
  for (const d of Object.values(old.devices)) { delete d.refurb; delete d.resale; }
  const s = sanitize(old);
  assert.deepEqual(s.devices.laptop.refurb, DEVICE_DEFAULTS.laptop.refurb);
  assert.equal(s.devices.laptop.resale, DEVICE_DEFAULTS.laptop.resale);
});

test("refurb partiel ou invalide : complété et borné", () => {
  const saved = structuredClone({ global: GLOBAL_DEFAULTS, devices: DEVICE_DEFAULTS, current: "laptop" });
  saved.devices.laptop.refurb = { price: 400, life: "abc" };
  saved.devices.laptop.resale = -50;
  const s = sanitize(saved);
  assert.equal(s.devices.laptop.refurb.price, 400);
  assert.equal(s.devices.laptop.refurb.fab, DEVICE_DEFAULTS.laptop.refurb.fab);
  assert.equal(s.devices.laptop.refurb.life, DEVICE_DEFAULTS.laptop.refurb.life);
  assert.equal(s.devices.laptop.resale, 0);
});
