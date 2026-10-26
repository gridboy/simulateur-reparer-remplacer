import test from "node:test";
import assert from "node:assert/strict";
import { compare, activeRepairs, repairCost, events, cumulative, purchases, SCENARIO } from "../src/core/calc.js";
import { DEVICE_DEFAULTS, GLOBAL_DEFAULTS } from "../src/data/defaults.js";

const global = { ...GLOBAL_DEFAULTS };
const laptop = () => structuredClone(DEVICE_DEFAULTS.laptop);
const close = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≠ ${expected}`);

test("portable sur 12 ans : 4 ans d'amortissement, 3 ans bonus par cycle", () => {
  const c = compare(laptop(), global);
  // Réparer : achats à 0 et 7 ans, amortis 4 ans chacun dans l'horizon → 8 ans amortis, 4 ans bonus
  assert.equal(c.amortizedYears, 8);
  assert.equal(c.bonusYears, 4);
  assert.equal(c.repairCount, 2); // batterie à 4 et 11 ans
  close(c.money.before, 800 / 4 * 12);
  close(c.money.avoided, 800 / 4 * 4);
  close(c.money.repairs, 2 * (90 + 40));
  close(c.money.after, (800 / 4) * 8 + 2 * 130);
  close(c.money.usage, 30 * 0.2 * 12);
  close(c.carbon.avoided, 181 / 4 * 4);
  close(c.carbon.repairs, 2 * 6);
});

test("gain net = années bonus − réparations, et bénéfice global", () => {
  const c = compare(laptop(), global);
  close(c.carbon.net, c.carbon.avoided - c.carbon.repairs);
  close(c.money.net, c.money.avoided - c.money.repairs);
  close(c.total, c.money.net + c.carbon.net / 1000 * global.carbon);
});

test("réparations désactivées ou au-delà de la durée prolongée ignorées", () => {
  const d = laptop();
  assert.equal(activeRepairs(d).length, 1);
  d.repairs[0].year = d.lifeExt;
  assert.equal(activeRepairs(d).length, 0);
});

test("coût d'intervention : pièces + main-d'œuvre − aide, jamais négatif", () => {
  assert.equal(repairCost({ parts: 50, labor: 30 }, 25), 55);
  assert.equal(repairCost({ parts: 10, labor: 0 }, 25), 0);
});

test("sur un cycle complet, réparer au seuil de pertinence équivaut à remplacer", () => {
  const d = laptop();
  const oneCycle = { ...global, horizon: d.lifeExt };
  const { breakEven } = compare(d, oneCycle);
  d.repairs = [{ label: "seuil", year: 4, parts: breakEven.eur, labor: 0, co2: breakEven.co2, on: true }];
  const c = compare(d, oneCycle);
  close(c.money.net, 0);
  close(c.carbon.net, 0);
});

test("sans année gagnée, réparer sans intervention équivaut à remplacer", () => {
  const d = laptop();
  d.lifeExt = d.life;
  const c = compare(d, global);
  assert.equal(c.repair.repairs.length, 0);
  assert.equal(c.bonusYears, 0);
  close(c.carbon.net, 0);
  close(c.money.net, 0);
});

test("nombre d'achats sur 12 ans", () => {
  const d = laptop();
  assert.equal(purchases(d, 12, SCENARIO.REPLACE), 3);
  assert.equal(purchases(d, 12, SCENARIO.REPAIR), 2);
  assert.equal(events(d, 12, SCENARIO.REPLACE).filter(e => e.kind === "buy").length, 3);
});

test("cumul final = somme des décaissements + usage", () => {
  const d = laptop();
  const list = events(d, 12, SCENARIO.REPAIR);
  const points = cumulative(list, 12, 6, "eur");
  close(points.at(-1)[1], list.reduce((s, e) => s + e.eur, 0) + 12 * 6);
});
