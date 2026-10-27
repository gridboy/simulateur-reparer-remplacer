# Reconditionné et revente : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter l'option « acheter reconditionné » et la revente de l'équipement remplacé au simulateur réparer ou remplacer.

**Architecture:** Le moteur pur (`src/core/calc.js`) gagne la revente dans le bilan existant et une fonction qui calcule les trois options. Le panneau d'hypothèses gagne un groupe de champs. Une nouvelle vue (`src/ui/options.js`) compare les trois options. Le pont des économies gagne une ligne de revente.

**Tech Stack:** JavaScript en modules ES, sans dépendance ni build. Tests : `node --test`. Site statique servi par GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-27-reconditionne-revente.md`

## Global Constraints

- Aucune dépendance npm, aucune étape de build.
- Électricité hors des totaux comparés (identique dans toutes les options).
- Tout import relatif porte `?v=…` : lancer `npm run bump` avant chaque commit qui touche `src/`, `styles/` ou `index.html`.
- Commits au nom de « Guillaume G. », **sans** ligne `Co-Authored-By`.
- Textes de l'interface en français, voix active, sans tiret cadratin.
- Couleurs des tracés : `--replace-mark` (remplacer), `--repair-mark` (réparer). Le reconditionné utilise `--muted`, avec une étiquette directe sur chaque barre.
- Clé de stockage inchangée : `tnrc-simulateur-duree-de-vie-v3`. Les nouveaux champs viennent des valeurs par défaut via `sanitize`.

## Review Focus

1. **0 année bonus :** réparer et remplacer doivent donner exactement le même total, revente comprise (test en tâche 1).
2. **Valeur de revente supérieure au prix :** elle est bornée au prix neuf, sans gain fictif (test en tâche 1).
3. **Durée du reconditionné plus longue que l'horizon :** un seul achat, la dotation est comptée uniquement dans l'horizon (test en tâche 1).
4. **État sauvegardé sans `refurb` ni `resale`** (enregistré par la version d'hier) : les valeurs par défaut sont reprises et la page ne casse pas (test en tâche 3).
5. **Reconditionné moins cher que réparer :** le classement se calcule, il n'est jamais supposé. En cas d'égalité, l'ordre fixe reste remplacer, réparer, reconditionné (test en tâche 1).

---

### Task 1 : Moteur, revente et option reconditionné

**Files:**
- Modify: `src/data/defaults.js` (champs `refurb` et `resale` des 4 équipements, valeurs du tableau de la spec)
- Modify: `src/core/calc.js` (`SCENARIO`, `ledger`, `compare`, nouvelles fonctions)
- Test: `tests/calc.test.js`

**Interfaces:**
- Consumes: `events(device, horizon, kind)`, `amortizedYears(device, horizon, kind)`, `ledger(...)` existants.
- Produces:
  - `SCENARIO.REFURB = "refurb"`
  - `resaleCredit(device: Device, horizon: number, kind: "replace" | "repair") -> number` : total des reventes dans l'horizon, en € HT.
  - `compare(device, global)` : `money` gagne `resaleBefore` et `resaleAfter` ; `money.before` et `money.after` en sont déduits ; `net` vaut `avoided − repairs − resaleBefore + resaleAfter`. `carbon` ne change pas.
  - `options(device, global) -> Array<{ kind: "replace" | "repair" | "refurb", eur: number, co2: number }>`, dans cet ordre fixe, totaux sur l'horizon hors usage.
  - `rankOptions(list, key: "eur" | "co2") -> Array` : tri croissant stable.
  - Forme d'un `Device` : ajout de `resale: number` et `refurb: { price: number, fab: number, life: number }`.

- [ ] **Step 1 : écrire les tests qui doivent échouer** (portable par défaut, horizon 12, `global` existant)

```js
test("revente : 2 portables revendus 100 € à 4 et 8 ans si l'on remplace", () => {
  const c = compare(laptop(), global);
  close(c.money.resaleBefore, 200);
  close(c.money.resaleAfter, 0);           // réparé, gardé 7 ans : âge > 4, valeur 0
  close(c.money.before, 2400 - 200);
  close(c.money.after, 1600 + 260);
  close(c.money.net, 340);
});

test("0 année bonus : réparer = remplacer, revente comprise", () => {
  const d = laptop(); d.lifeExt = d.life;
  const c = compare(d, global);
  close(c.money.before, c.money.after);
  close(c.money.net, 0);
});

test("revente bornée au prix neuf", () => {
  const d = laptop(); d.resale = 5000;
  assert.equal(resaleCredit(d, 12, SCENARIO.REPLACE), 2 * 800);
});

test("trois options sur 12 ans", () => {
  const o = options(laptop(), global);
  assert.deepEqual(o.map(x => x.kind), ["replace", "repair", "refurb"]);
  close(o[0].eur, 2200); close(o[1].eur, 1860); close(o[2].eur, 450 / 3 * 12);
  close(o[0].co2, 181 / 4 * 12); close(o[2].co2, 27 / 3 * 12);
});

test("reconditionné plus durable que l'horizon : dotation limitée à l'horizon", () => {
  const d = laptop(); d.refurb.life = 15;
  close(options(d, global)[2].eur, 450 / 15 * 12);
});

test("classement stable en cas d'égalité", () => {
  const ranked = rankOptions([{ kind: "replace", eur: 1 }, { kind: "repair", eur: 1 }, { kind: "refurb", eur: 0 }], "eur");
  assert.deepEqual(ranked.map(x => x.kind), ["refurb", "replace", "repair"]);
});
```

Ajoute `resaleCredit`, `options` et `rankOptions` à l'import du fichier de test. Mets à jour le test existant « portable sur 12 ans » : `money.before` vaut `800 / 4 * 12 - 200`, `money.after` ne change pas. Le gain net du second test existant reste `avoided − repairs` côté carbone, et devient `avoided − repairs − 200` côté euros.

- [ ] **Step 2 : lancer les tests, ils doivent échouer**

Run : `npm test`
Expected : FAIL (`resaleCredit` absent, `money.resaleBefore` vaut undefined).

- [ ] **Step 3 : implémenter**

- `resaleCredit` : parcourir les achats (`start` de 0 à l'horizon, pas `life` ou `lifeExt` selon le scénario). Un équipement remplacé à `start + pas < horizon − EPS` rapporte `min(resale, price)` si `pas === life`, sinon 0.
- `ledger` reçoit `resaleBefore` et `resaleAfter` (0 par défaut). Il les soustrait de `before` et `after` et les renvoie. `compare` les passe seulement pour `money`.
- `options` : `replace` = `money.before` et `carbon.before` ; `repair` = `money.after` et `carbon.after` ; `refurb` = `refurb.price / refurb.life × horizon` et `refurb.fab / refurb.life × horizon`.
- `rankOptions` : `[...list].sort((a, b) => a[key] - b[key])` (tri stable en ES2019+).

- [ ] **Step 4 : lancer les tests, ils doivent passer**

Run : `npm test`
Expected : tous PASS.

- [ ] **Step 5 : commit**

```bash
npm run bump
git add src/data/defaults.js src/core/calc.js tests/calc.test.js index.html src styles
git commit -m "feat(calc): revente de l'équipement remplacé et option reconditionné"
```

---

### Task 2 : Ligne de revente dans le pont des économies

**Files:**
- Modify: `src/ui/savings.js` (`bridgeHtml`, rangées du pont euros)

**Interfaces:**
- Consumes: `c.money.resaleBefore`, `c.money.resaleAfter` (tâche 1).
- Produces: rien pour les autres tâches.

- [ ] **Step 1 : ajouter la rangée.** Dans le pont euros uniquement, quand `resaleBefore > 0`, insérer une rangée juste après « Si vous remplacez » :
  - op `−`, libellé `Revente des équipements remplacés`, sous-libellé `N × X €` (N = `resaleBefore ÷ min(resale, price)`) ;
  - barre `is-avoided` de `before` à `before + resaleBefore`, valeur `−X €`.

  `g.before` étant déjà net de revente, la première barre s'étend jusqu'à `before + resaleBefore`. Le libellé de « Si vous remplacez » devient : `12 ans × 200 € d'amortissement − 200 € de revente`.

- [ ] **Step 2 : vérifier dans le navigateur**

Run : `npm start`, ouvrir http://localhost:8080, portable par défaut.
Expected : pont euros = 2 400 − 200 = 2 200 € pour « Si vous remplacez », 1 860 € pour « Si vous réparez », économie 340 €. La somme des rangées tombe juste. Avec revente à 0, la rangée disparaît.

- [ ] **Step 3 : commit**

```bash
npm run bump
git add src styles index.html
git commit -m "feat(ui): revente dans le pont des économies"
```

---

### Task 3 : Hypothèses « Reconditionné et revente » et migration de l'état

**Files:**
- Modify: `src/ui/paramsPanel.js` (nouvelle fonction de montage)
- Modify: `src/state/store.js` (`sanitize` exporté, fusion de `refurb`, bornes)
- Modify: `src/main.js` (vue `refurb-params`)
- Modify: `index.html` (nouveau `<details class="param-group">` « Reconditionné et revente » contenant `#refurb-params`, placé après « Réparations prévues »)
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: `fieldsHtml`, `syncFields`, `bindFields` (existants), `LIFETIME_RANGE`.
- Produces:
  - `export function sanitize(saved) -> State` dans `src/state/store.js`
  - `export function mountRefurbParams(root, store)` dans `src/ui/paramsPanel.js`

- [ ] **Step 1 : écrire le test qui doit échouer** (`tests/store.test.js`)

```js
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
```

- [ ] **Step 2 : lancer les tests, ils doivent échouer**

Run : `npm test`
Expected : FAIL (`sanitize` non exporté).

- [ ] **Step 3 : implémenter**

- `sanitize` (exporté) fusionne `refurb` champ par champ avec les valeurs par défaut. `refurb.life` est borné dans `LIFETIME_RANGE`, `refurb.price` et `refurb.fab` sont ≥ 0, et `resale` est borné entre 0 et `price`. Une valeur non numérique reprend la valeur par défaut.
- `mountRefurbParams` affiche deux listes de champs :
  - préfixe `refurb`, cible `state.devices[state.current].refurb` : `price` (« Prix reconditionné », « € HT », pas 10), `fab` (« Fabrication reconditionné », « kgCO₂e », pas 1), `life` (« Amortissement reconditionné », « années », min 1, max 12, pas 0,5) ;
  - préfixe `resale`, cible l'équipement : `resale` (« Revente de l'équipement remplacé », « € HT, au terme de l'amortissement », pas 10).
- Sous les champs, une ligne d'aide : « Revente sans crédit carbone : la fabrication reste imputée au premier utilisateur. »

- [ ] **Step 4 : lancer les tests, puis vérifier dans le navigateur**

Run : `npm test`, puis `npm start`
Expected : tests PASS. Le groupe « Reconditionné et revente » s'affiche. Modifier un champ met les résultats à jour. Changer d'équipement recharge les valeurs.

- [ ] **Step 5 : commit**

```bash
npm run bump
git add src tests/store.test.js index.html styles
git commit -m "feat(ui): hypothèses reconditionné et revente, migration de l'état"
```

---

### Task 4 : Vue « Trois options », documentation et livraison

**Files:**
- Create: `src/ui/options.js`
- Modify: `src/main.js` (vue `options`), `index.html` (`<section class="card" id="options">` après `#savings`), `styles/app.css` (section « Trois options »), `README.md` (fonctions, modèle, sources), `docs/capture.webp`

**Interfaces:**
- Consumes: `options(device, global)`, `rankOptions(list, key)` (tâche 1), `formatEur`, `formatKg`.
- Produces: `export function mountOptions(root, store)`.

- [ ] **Step 1 : implémenter la vue.**
  - Titre : `Trois options sur ${horizon} ans`.
  - Deux figures, « En euros » et « En carbone ». Chacune montre une rangée par option, triée par `rankOptions` : libellé (« Remplacer par du neuf », « Réparer et garder », « Acheter reconditionné »), barre proportionnelle au maximum, valeur.
  - Badge texte sur la première rangée : « la moins chère » (euros) ou « la plus sobre » (carbone).
  - Classes de barre : `is-replace`, `is-repair`, `is-refurb`. `is-refurb` prend `--muted`.
  - Note : « Totaux hors électricité. Le reconditionné est amorti sur sa propre durée, sans réparation. »

- [ ] **Step 2 : vérifier dans le navigateur, avec un bureau et en 390 px de large**

Run : `npm start`
Expected, pour le portable par défaut :
- euros : reconditionné 1 800 €, réparer 1 860 €, remplacer 2 200 €, avec le badge sur le reconditionné ;
- carbone : reconditionné 108 kg, réparer 374 kg, remplacer 543 kg ;
- aucun débordement horizontal à 390 px.

- [ ] **Step 3 : documentation.** Dans le README :
  - ajouter l'option reconditionné et la revente dans « Fonctions » ;
  - ajouter les règles de la spec dans « Modèle de calcul » ;
  - ajouter la source ADEME/Arcep 2022 dans « Sources et limites ».

  Régénérer `docs/capture.webp` (Chrome sans interface, 1280 × 2000, puis `cwebp -q 78`).

- [ ] **Step 4 : tests, commit, livraison**

```bash
npm test
npm run bump
git add -A
git commit -m "feat(ui): comparaison des trois options, documentation"
git push
```

Expected : tests PASS. Le build GitHub Pages porte le nouveau commit (`gh api repos/gridboy/simulateur-reparer-remplacer/pages/builds/latest`). Le site sert le nouveau `main.js?v=…`.
