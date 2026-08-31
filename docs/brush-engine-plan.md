# Plan d'ajout des brushes

## Objectif

Ajouter des brushes de dessin expressifs sans modifier la logique des cercles, la reconnaissance des symboles ni la compatibilite des sorts existants.

## Etape 1 : contrat de brush

- Definir un profil versionne : nom, apercu, epaisseur, opacite, espacement, pression et texture.
- Garder le profil actuel comme `basic-ink` par defaut pour que les anciens dessins restent identiques.
- Reutiliser `stroke-smoothing.mjs` pour le lissage commun a tous les brushes.
- Ajouter des limites strictes sur le nombre de points et la taille des donnees sauvegardees.

## Etape 2 : moteur de rendu

- Centraliser la generation des traces dans un module pur testable.
- Implementer progressivement : plume, crayon, marqueur, encre variable et gomme.
- Produire les memes points de geometrie pour l'export, la selection et la sauvegarde ; seule l'apparence varie.
- Ne jamais appliquer un brush aux objets parametriques deja places, sauf action explicite de l'utilisateur.

## Etape 3 : interface

- Ajouter un bouton `Brushes` dans la barre d'outils Canva.
- Ouvrir un sous-menu avec apercu visuel, epaisseur, opacite et espacement.
- Afficher un indicateur du brush actif sans agrandir la toile.
- Conserver le bouton de reduction et le dock lateral avec le meme sous-menu.

## Etape 4 : compatibilite des documents

- Ajouter uniquement `brushId` et les parametres necessaires aux actions de type `free` et aux commentaires dessin.
- Conserver la valeur par defaut lors du chargement des anciens JSON, exemples, guides et sorts.
- Mettre a jour les sanitizers de `guide-storage.mjs`, `spell-library.mjs` et `circle-share.mjs` avec des bornes identiques.

## Etape 5 : verification

- Tester chaque brush avec une trace courte, longue, rapide, lente et annulee.
- Verifier selection, deplacement, rotation, groupe, copie-colle, undo/redo et export PNG.
- Comparer un ancien document `basic-ink` avant/apres pour garantir l'absence de regression visuelle.
- Tester la performance sur une toile dense et refuser proprement les traces hors limites.

## Livraison par lots

1. Contrat versionne et `basic-ink` compatible.
2. Plume et crayon avec tests de rendu.
3. Marqueur, opacite et pression.
4. Gomme non destructive et historique.
5. Textures avancees apres validation de la performance.
