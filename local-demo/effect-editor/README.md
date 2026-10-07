# Atelier des effets

La page est accessible depuis l'accueil du simulateur. Les creations restent
dans le navigateur et peuvent etre exportees en JSON. Elles ne sont pas encore
chargees automatiquement dans le combat ou le moteur de sorts de l'atelier.

## Modèles Blender et animations

### Timeline et trajectoires à deux vues

Dans **Modèle & animation**, chaque volume modelable possède une piste. Cliquez
sur une piste ou saisissez un instant précis, réglez la pose et enregistrez-la.
Les repères se déplacent à la souris ou avec les flèches du clavier (0,05 s).
Un repère déplacé sur un autre remplace celui-ci. Les boutons d'apparition et
de disparition enregistrent la visibilité ; une première apparition après 0 s
crée automatiquement une pose masquée à 0 s. Les particules restent décoratives.

Les transformations interpolent position, rotation et échelle. La forme
(sphère, bloc, cône, cylindre, anneau, cristal) change instantanément : il ne
s'agit pas d'un morphing entre maillages. Choisissez **Instantanée** pour ne pas
interpoler les transformations non plus. **Modifier cette pose dans l’aperçu**
permet de manipuler un volume sans modifier sa forme de base, puis d'enregistrer
la pose. Changer d'instant annule les manipulations non enregistrées.

Dans **Mouvement**, les vues de face et de dessus partagent les mêmes points.
Le mode Déplacer conserve la coordonnée invisible : ajuster la profondeur
dans la vue de dessus ne change pas la hauteur. Ajouter des points dans l'une
des vues les ajoute également dans l'autre. La trajectoire est commune au sort ;
les poses des volumes s'y ajoutent. Les sauvegardes JSON conservent les pistes.

Le nouvel onglet **Modèle & animation** accepte les fichiers **GLB autonomes**
(50 Mo maximum). Le modèle est cadré automatiquement, ses matériaux sont
conservés et le fichier est stocké dans IndexedDB sur cet appareil. Les fichiers
compressés Draco, Meshopt ou KTX2 doivent être réexportés sans compression.

Dans Blender : importez/exportez avec **glTF 2.0**, format binaire `.glb`, en
incluant matériaux et animations. L'atelier affiche les clips disponibles avec
leur vitesse et boucle. Préférez des clips sur place pour les combiner aux
trajectoires. L'export d'un modèle importé rend le GLB original avec ses clips ;
l'export des volumes rend leur géométrie actuelle. Les poses de l'atelier ne sont
pas encore converties en clips GLB et restent dans la sauvegarde JSON.

Pour animer simplement : choisissez l'objet entier ou un volume, placez le
curseur temporel, réglez position/rotation/échelle, puis **Enregistrer la pose**.
Changez le temps et enregistrez une deuxième pose. **Animer** joue le résultat.
Le curseur suspend la lecture ; **Rejouer** revient au début. Une pose au même
instant remplace la précédente ; une pose peut être copiée à un autre instant
en la sélectionnant puis en changeant le temps avant d'enregistrer.

Enregistrez le symbole ou la composition avant de fermer la page : le brouillon
non enregistré n'est pas conservé. **Sauvegarde complète avec modèles** inclut
les GLB des créations enregistrées (150 Mo maximum). Le JSON léger ne contient
que leurs références ; sur un autre appareil il faut rattacher les GLB ou
importer la sauvegarde complète. L'import ajoute les créations sans remplacer
la collection existante.

Cette version ne lance pas Blender automatiquement, ne permet pas de sculpter
un maillage ni d'éditer ses os. Les estimations de dégâts sont indépendantes de
la vitesse des clips et du nombre de polygones.

Cette page permet de dessiner des signes ou des sigils personnels, puis de composer une séquence avec les vecteurs du catalogue officiel. Son interpreteur d'effets reste experimental.

Depuis la racine du dépôt, démarrez le serveur statique :

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Ouvrez ensuite [http://127.0.0.1:8000/local-demo/effect-editor/](http://127.0.0.1:8000/local-demo/effect-editor/).

Les créations sont sauvegardées dans le `localStorage` de ce navigateur et de cet appareil. Elles ne sont ni synchronisées ni envoyées à un serveur. Le bouton de réinitialisation supprime les symboles et compositions locaux après confirmation.

## Créer et essayer

1. Choisissez un exemple ou réglez matière, forme, mouvement et couleur dans l’aperçu 3D.
2. Dans « Créer un symbole », dessinez et nommez votre signe ou sigil. « Garder ce symbole » enregistre aussi sa définition d’effet. « Modifier » permet de la rouvrir.
3. Dans « Composer un effet », ajoutez les symboles dans l’ordre. Les exemples créent de nouvelles compositions sans écraser les anciennes. Les flèches modifient l’ordre des étapes.
4. Les glisseurs de composition remplacent les paramètres correspondants sur toutes les étapes. « Rétablir » retire ces remplacements.
5. Nommez votre composition pour la retrouver. Exportez un fichier JSON pour sauvegarder ou transférer toute la collection ; l’import ajoute les créations sans écraser les existantes.

L’aperçu Three.js utilise les dépendances locales, sans IA ni service externe. Glissez sur la scène pour tourner et utilisez la molette pour zoomer. Pause et Rejouer contrôlent l’animation. Les préférences de réduction des animations sont respectées au lancement.

Les formes proposées comprennent une véritable géométrie de fleur à huit pétales, une orbe, une colonne, un anneau et des éclats. Les mouvements incluent projection, pluie, rotation, élévation et éclatement. La séquence Eau → Fleur → Agrandissement → Solidification → Crush joue ces étapes successivement.

Un symbole personnel contribue les champs correspondant au rôle choisi dans la composition : matière/couleur, forme/taille/particules, direction/mouvement/vitesse, transformation/matière/forme/mouvement/couleur, modificateur/taille/particules/vitesse/dispersion, déclencheur/durée. Les règles du catalogue sont explicites dans `effect-runtime-model.mjs` ; les autres symboles sont signalés comme non pris en charge.

## Modeler, animer et équilibrer

### Manipulation dans la scène

Activez **Manipuler les volumes** sous l’aperçu. L’exemple courant est converti en volumes si nécessaire et l’animation est suspendue. Cliquez puis glissez un volume pour le sélectionner et le transformer. Le cadre doré indique la sélection ; le panneau numérique suit cette sélection.

Choisissez **Déplacer**, **Tourner** ou **Redimensionner**, puis un axe X/Y/Z ou Libre. Le déplacement libre suit le plan de la caméra ; la rotation libre utilise deux axes et l’échelle libre conserve les proportions jusqu’aux limites autorisées. Le fond vide reste disponible pour tourner la caméra. Échap ou l’annulation du pointeur annule le geste courant. À la fin du glissement, les réglages numériques et la composition sont mis à jour. **Terminer la manipulation** rend l’aperçu à l’animation.

- **Modeler** : convertissez un exemple en volumes indépendants, ou partez de zéro. Ajoutez, dupliquez et retirez des volumes. Position, échelle et rotation se règlent par glisseurs ou valeurs précises, relativement au centre de l’effet. Maximum : 32 volumes.
- **Silhouette en relief** : posez les sommets d’un contour sans intersections puis créez un volume extrudé. Son échelle Z règle l’épaisseur. C’est un assemblage de volumes, pas encore un outil de sculpture de maillage.
- **Mouvement** : tracez un chemin, déplacez les points et ajustez leur profondeur Z. Les segments sont parcourus à vitesse constante selon leur longueur. Jusqu’à 64 points, arrêt à l’arrivée, demi-tour ou retour au départ. La durée du sort limite le parcours et la séquence partage cette durée entre ses étapes.
- **Plein écran** : agrandit l’atelier ; « Masquer les outils » réserve toute la vue à la scène. Échap permet de sortir. Une vue agrandie intégrée sert de repli si le navigateur refuse le plein écran natif.
- **Dégâts** : proportions des six éléments, puissance, multiplicateur de dégâts et coefficients élémentaires modifiables. Les estimations indiquent les PV par impact, la vitesse de transport et l’énergie par lancer. La formule est consultable. Les particules décoratives ne multiplient pas les dégâts.

Les interactions eau/feu, feu/vent, eau/terre et eau/cristal utilisent des coefficients de démonstration explicites, non des lois physiques ou des règles officielles. Le matériau et la couleur d’apparence restent indépendants des proportions du mélange. Les formes, trajets et coefficients sont conservés avec les symboles et les compositions, y compris dans les exports JSON.

Cette démo ne valide pas les règles du simulateur public ni son moteur 3D. Les dégâts sont **estimés, pas appliqués au combat**. Pas encore de collisions, scripts arbitraires, publication communautaire ou simulation physique des mélanges.
