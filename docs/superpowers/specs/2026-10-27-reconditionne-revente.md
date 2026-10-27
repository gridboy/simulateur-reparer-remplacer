# Spec : reconditionné et revente

## Objectif

Ajouter au simulateur deux leviers de décision :

1. **Acheter reconditionné** : troisième option, à comparer à « remplacer par du neuf » et « réparer ».
2. **Revendre l'équipement remplacé** : la valeur de revente réduit le coût des options qui renouvellent.

## Modèle

Même logique comptable que l'existant : chaque achat est amorti linéairement sur une durée figée ; les années au-delà sont des années bonus sans dotation ; l'électricité, identique dans toutes les options, reste hors des totaux comparés.

### Option « reconditionné »

- Rachat tous les `refurb.life` ans (durée d'amortissement du reconditionné, figée).
- Coût : dotation `refurb.price / refurb.life` chaque année de l'horizon.
- Carbone : `refurb.fab / refurb.life` chaque année de l'horizon. `refurb.fab` couvre le reconditionnement et la part de fabrication restant à allouer ; la fabrication d'origine reste imputée au premier utilisateur.
- Pas de réparation ni d'année bonus dans cette option (hors périmètre).

### Revente

- Un équipement est revendu quand il est remplacé avant la fin de l'horizon (date de remplacement `< horizon`).
- Valeur : `resale` (€ HT) s'il est remplacé au terme de son amortissement (âge = `life`) ; 0 s'il est gardé au-delà (âge > `life`, cas réparé). Avec 0 année bonus, réparer et remplacer revendent donc à l'identique.
- La revente s'applique aux options « remplacer » et « réparer ». Elle ne s'applique pas au reconditionné (valeur résiduelle négligeable).
- `resale` est borné entre 0 et `price`.
- Pas de crédit carbone pour la revente (prudence, pas de double comptage) : la page le dit.

### Valeurs par défaut (tarifs grand compte, ordres de grandeur à valider)

| Équipement | refurb.price | refurb.fab (kgCO₂e) | refurb.life | resale |
|---|--:|--:|--:|--:|
| Écran 24″ | 70 | 10 | 4 | 20 |
| Ordinateur fixe | 330 | 42 | 4 | 50 |
| Ordinateur portable | 450 | 27 | 3 | 100 |
| Smartphone 6″ | 190 | 13 | 2 | 60 |

`refurb.fab` ≈ 15 % de l'empreinte de fabrication du neuf. Source à confirmer : étude ADEME/Arcep 2022 sur les produits reconditionnés (réduction d'impact de l'ordre de 77 à 91 % pour un smartphone).

## Affichage

- **Hypothèses :** un nouveau groupe « Reconditionné et revente » dans le panneau, avec 4 champs : prix reconditionné, fabrication reconditionné, durée d'amortissement reconditionné, valeur de revente.
- **Bloc « Trois options sur N ans » :** placé sous le bloc d'économies, il montre une barre par option, pour les euros et pour le carbone, triée du moins coûteux au plus coûteux. Chaque barre porte une étiquette directe, et l'option la moins coûteuse est signalée « la moins chère » ou « la plus sobre » selon la dimension.
- **Pont « D'où vient l'économie en euros » :** il gagne une ligne de revente quand une revente a lieu. Le pont carbone ne change pas.

## Hors périmètre

Reconditionné réparé, revente du reconditionné, crédit carbone de revente, et décote de la revente selon l'âge (au-delà de la règle « 0 si gardé au-delà de l'amortissement »).
