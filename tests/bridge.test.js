import test from "node:test";
import assert from "node:assert/strict";
import { bridgeScale } from "../src/ui/bridgeScale.js";

test("échelle du pont : une valeur intermédiaire négative reste dans la piste", () => {
  // Smartphone, revente élevée, prolongation maximale : avant 1 136, après années bonus −80
  const pos = bridgeScale([1136, -80, 100, 196]);
  assert.equal(pos(-80), 0);
  assert.equal(pos(1136), 100);
  assert.ok(pos(0) > 0 && pos(0) < 100);
});

test("échelle du pont : sans valeur négative, zéro reste à gauche", () => {
  const pos = bridgeScale([2400, 1600, 1860]);
  assert.equal(pos(0), 0);
  assert.equal(pos(2400), 100);
});
