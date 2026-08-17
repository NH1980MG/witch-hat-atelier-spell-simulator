# Éditeur de composition sigillaire par sceau

## Objectif

Permettre de créer un nouveau sceau depuis l’onglet « Sigils et signes » et de modifier un cercle existant depuis le menu d’action du clic droit, avec une planche de composition proche de WHA Spell Maker.

## Règles utilisateur

- L’onglet « Composition sigillaire » reste accessible sans sélection.
- Sans sceau sélectionné, il ouvre un brouillon « Nouveau sceau » placé au centre de la zone de dessin visible.
- Le brouillon contient un cercle par défaut et permet de modifier sa taille avant inscription.
- Le brouillon n’ajoute aucune action à la toile tant que l’utilisateur n’a pas validé.
- Avec un cercle sélectionné, le panneau ouvre le sceau correspondant et détecte ses éléments existants.
- Le menu d’action du clic droit affiche « Composition sigillaire » uniquement lorsqu’une sélection contient un cercle complet ou un élément appartenant à un cercle complet.
- L’éditeur conserve les sigils, signes, anneaux et lignes existants ; il ne remplace pas silencieusement le sort par une composition vide.
- La taille du cercle est éditable comme diamètre visible ; le moteur conserve le rayon interne et recalcule les positions polaires des éléments ajoutés.
- Une validation applique toutes les modifications comme une seule entrée d’historique. Une annulation ferme le brouillon sans modifier la toile.

## Modèle

Le moteur conserve la représentation actuelle plate des actions pour préserver les anciens fichiers. Un module dédié expose une vue normalisée :

```js
{
  id: "seal-1",
  mode: "existing" | "new",
  center: { x, y },
  radius,
  rotation,
  scale,
  rings: [{ actionIndex, radius, width, visible }],
  sigils: [{ actionIndex, name, x, y, size, rotation, visible }],
  signs: [{ actionIndex, name, radialDistance, angle, size, rotation, visible }],
  lines: [{ actionIndex, visible }],
}
```

Les sceaux existants sont détectés avec l’action cercle/anneau comme ancre. Les symboles sont d’abord associés par un futur `sealId` quand il existe, puis par géométrie pour les anciens sorts : centre dans le rayon du cercle, tolérance proportionnelle à la taille du glyphe, et exclusion des actions ancrées à un autre cercle. Les actions libres qui ne peuvent pas être attribuées restent hors de la composition.

Le nouveau cercle utilise un identifiant de sceau et les glyphes inscrits avec lui reçoivent le même identifiant. Le champ reste facultatif pour ne pas invalider les actions historiques.

## Interface

Le panneau comporte un état « Nouveau sceau » ou « Sceau sélectionné », une commande de taille globale, une prévisualisation et les familles de contenu : options, anneaux, sigils, signes et lignes. La planche centrale affiche le cercle à sa position relative et tous les symboles détectés.

Les contrôles de taille acceptent une valeur numérique bornée par les limites de dessin. Pour un sceau existant, la valeur initiale vient de son rayon ; pour un nouveau sceau, elle vient du rayon par défaut. Le diamètre affiché et le rayon interne utilisés pour le placement restent cohérents.

La planche permet de sélectionner un élément, de le remplacer, de le vider, de l’ajouter, puis de modifier sa taille, son angle et son placement relatif. Les signes conservent leur placement radial et les sigils leur placement central. Les outils génériques de déplacement, rotation et redimensionnement de la toile restent disponibles après inscription.

## Compatibilité et erreurs

- Une composition vide ne peut pas être inscrite : le panneau conserve le brouillon et indique l’action attendue.
- Un cercle nouveau sans sigil peut être inscrit seulement si l’application autorise explicitement un cercle structurel ; par défaut, l’inscription demande au moins un sigil.
- Une taille trop grande est ramenée dans les limites de dessin et signalée dans le statut.
- La lecture du sort continue d’utiliser `composeSpellRecipe` et les profils existants ; cette fonctionnalité ne crée aucune nouvelle règle magique.
- Les traductions anglaises et françaises doivent couvrir les états nouveau/existant, la taille, les actions appliquer/annuler et l’entrée du clic droit.

## Vérification

Les tests unitaires couvriront la détection, le filtrage entre plusieurs cercles, les valeurs par défaut, la conversion diamètre/rayon et le calcul des placements. Les tests d’interface vérifieront l’option conditionnelle du menu, les contrôles de taille, les états bilingues et la conservation de la planche existante. Un smoke test navigateur couvrira la création sans sélection, la sélection d’un cercle, la détection de symboles, la modification de taille, l’inscription et l’annulation.
