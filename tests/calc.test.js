import test from "node:test";
import assert from "node:assert/strict";
import { compare, activeRepairs, repairCost, events, cumulative, purchases, SCENARIO } from "../src/core/calc.js";
import { DEVICE_DEFAULTS, GLOBAL_DEFAULTS } from "../src/data/defaults.js";

const global = { ...GLOBAL_DEFAULTS };
const laptop = () => structuredClone(DEVICE_DEFAULTS.laptop);
const close = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≠ ${expected}`);

test("portable : bilans annuels remplacer et réparer", () => {
  const c = compare(laptop(), global);
  close(c.replace.co2.total, 181 / 4 + 30 * 0.052);
  close(c.repair.co2.total, (181 + 6) / 7 + 30 * 0.052);
  close(c.replace.eur.total, 1100 / 4 + 30 * 0.2);
  close(c.repair.eur.total, (1100 + 90 + 40) / 7 + 30 * 0.2);
});

test("gain net = gain brut − coût des réparations", () => {
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

test("au seuil de pertinence, réparer équivaut à remplacer", () => {
  const d = laptop();
  const { breakEven } = compare(d, global);
  d.repairs = [{ label: "seuil", year: 4, parts: breakEven.eur, labor: 0, co2: breakEven.co2, on: true }];
  const c = compare(d, global);
  close(c.money.perYear, 0);
  close(c.carbon.perYear, 0);
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
