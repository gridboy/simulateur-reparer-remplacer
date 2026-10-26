# Réparer ou remplacer ?

Un simulateur pour décider s'il vaut mieux remplacer un équipement numérique ou le réparer, en comparant ce que chaque option coûte en euros et en carbone.

Il couvre quatre équipements courants en 2026 : écran 24″, ordinateur fixe, ordinateur portable et smartphone 6″. Il ne mesure pas l'empreinte d'un parc. Il sert à simuler l'effet d'une décision : garder un équipement plus longtemps, payer ses réparations, et voir ce que l'on y gagne ou y perd.

Projet porté avec **LaNum Pays Basque** et **NéoNum**.

## Pourquoi simuler avant de remplacer

Quand un équipement vieillit ou tombe en panne, la décision se prend souvent sur deux chiffres : le devis de réparation et le prix du modèle neuf. Ces deux chiffres ne suffisent pas, pour trois raisons.

**1. L'essentiel de l'empreinte carbone est payé à l'achat.** Pour un ordinateur portable, un smartphone ou un écran, la fabrication représente la plus grande part des émissions sur le cycle de vie, surtout en France où l'électricité est peu carbonée. Remplacer un équipement qui fonctionne encore, c'est payer une nouvelle fois cette fabrication. Le seul moyen de l'amortir est d'allonger la durée d'usage. Sans simulation, cet impact reste invisible au moment de décider.

**2. Le coût réel d'un équipement dépend de sa durée d'usage, pas de sa durée comptable.** Un portable amorti en 3 ans et gardé 7 ans coûte, par année de service, presque deux fois moins qu'un portable remplacé tous les 4 ans. Une réparation qui paraît chère en valeur absolue devient souvent très rentable une fois ramenée au nombre d'années qu'elle ajoute. Il faut donc comparer des coûts annualisés, réparations comprises, et pas un devis face à un prix d'achat.

**3. Le gain financier et le gain carbone ne vont pas toujours dans le même sens.** Une réparation peut être neutre en euros mais très favorable en carbone, ou l'inverse quand les pièces sont lourdes à produire. Les afficher séparément permet de voir lequel des deux motive la décision. Valoriser ensuite le carbone évité à un prix de référence permet de les additionner pour un arbitrage global.

Le simulateur rend ces trois éléments explicites. Pour chaque équipement, il répond à la question : **jusqu'à quel montant de réparation, et quelle empreinte de pièces, réparer reste-t-il plus intéressant que remplacer ?**

### Exemple : ordinateur portable pro

Avec les hypothèses par défaut : portable à 1 100 € HT, 181 kgCO₂e de fabrication, remplacé tous les 4 ans, ou gardé 7 ans avec un changement de batterie à 130 €.

| | Remplacer (4 ans) | Réparer (7 ans) |
|---|---|---|
| Empreinte par an | 46,8 kgCO₂e | 28,3 kgCO₂e |
| Coût par an | 281 € | 182 € |

Sur 12 ans, réparer évite environ 222 kgCO₂e et 1 190 € de dépenses. La réparation reste rentable jusqu'à 825 € d'interventions cumulées.

## Ce que fait le simulateur

- **Durées de vie** : un réglage pour la durée habituelle (remplacer) et un pour la durée prolongée (réparer), avec boutons et curseur.
- **Réparations** : chaque intervention a une année, un coût de pièces, un coût de main-d'œuvre et une empreinte carbone. Une aide à la réparation peut être déduite.
- **Gain carbone** : fabrication évitée moins empreinte des réparations, par an et sur l'horizon choisi.
- **Gain financier** : achats évités moins coût des réparations, électricité comprise.
- **Bénéfice global** : gain financier plus valeur du carbone évité, au prix du carbone choisi (marché UE ETS ou valeur tutélaire).
- **Seuils de pertinence** : budget et empreinte de réparation au-delà desquels remplacer devient préférable.
- **Amortissement comptable** : la frise montre les années où l'équipement est amorti mais toujours en service.
- **Comparaison** des quatre équipements et d'un poste de travail complet.

## Modèle de calcul

- Empreinte annuelle = (fabrication + réparations) ÷ durée de vie + consommation × mix électrique
- Coût annuel = (prix d'achat + pièces + main-d'œuvre − aide) ÷ durée de vie + consommation × prix de l'électricité
- Gain net sur l'horizon = (bilan « remplacer » − bilan « réparer ») × horizon
- Seuil de pertinence = prix neuf (ou empreinte de fabrication) × (durée prolongée ÷ durée habituelle − 1)

La consommation électrique est la même dans les deux scénarios.

## Sources et limites

- Empreinte de fabrication : [ADEME Base Empreinte](https://base-empreinte.ademe.fr/) (données NegaOctet), reprises par l'[API Boavizta](https://github.com/Boavizta/boaviztapi). Portable pro 181, ordinateur fixe 277 (unité centrale seule), écran 64,7 et smartphone 84 kgCO₂e.
- Mix électrique France : 0,052 kgCO₂e/kWh (ADEME).
- Prix du carbone : valeur de l'action pour le climat (rapport Quinet, 2019), environ 200 €/t en 2026 et 250 €/t en 2030.
- Les prix 2026, les consommations et l'empreinte des pièces détachées sont des ordres de grandeur. Remplacez-les par vos propres données (devis, fiches produits, inventaire).
- Les facteurs ADEME décrivent des équipements de référence antérieurs à 2026.
- Outil voisin : [Boavizta Terminal Impact](https://dataviz.boavizta.org/terminalimpact).

## Lancer

```sh
npm start        # http://localhost:8080 (serveur statique Python)
npm test         # tests du moteur de calcul (Node ≥ 18)
```

L'application n'a aucune dépendance et aucune étape de build. Elle utilise des modules ES, il faut donc la servir en HTTP : l'ouverture directe du fichier en `file://` ne fonctionne pas. Tout hébergement statique convient (GitHub Pages, par exemple).

Les réglages sont conservés dans le navigateur de chaque utilisateur (localStorage). Aucune donnée n'est envoyée à un serveur.

## Structure

```
index.html              page et structure des sections
styles/tokens.css       jetons de design (couleurs, polices, thèmes clair/sombre)
styles/app.css          styles des composants
src/main.js             point d'entrée : store et montage des vues
src/data/defaults.js    hypothèses par défaut (ADEME / Boavizta, prix 2026)
src/core/calc.js        moteur de calcul, fonctions pures
src/core/format.js      formatage fr-FR
src/state/store.js      état, abonnements, persistance locale
src/ui/*.js             une vue par fichier (sélecteur, durées, bilans, courbes…)
assets/logos/           logos partenaires (LaNum, NéoNum)
tests/calc.test.js      tests du moteur
```

## Sobriété

L'application suit les principes d'éco-conception qu'elle promeut. Elle charge 2 familles de polices (4 variantes), aucun framework, et ses logos pèsent moins de 20 Ko au total. Les graphiques sont en SVG généré, et le calcul se fait entièrement côté navigateur.
