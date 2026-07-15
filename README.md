# Witch Hat Atelier Simulator

Simulateur web de creation de cercles magiques, pense comme une petite planche
d'atelier: encre noire, glyphes, sceaux et lecture du rituel.

L'application utilise un ilot d'outils flottant sur le parchemin. Elle permet de
tracer un sceau, d'ajouter un double anneau, des traits directeurs, des glyphes
et des spires. Le rituel peut etre active avec le bouton `Activer`, ou
automatiquement quand l'option `activation auto` est cochee et qu'un sceau
complet est trace.

L'encre du trait est une encre noire normale. L'element du rituel vient du
sigil central choisi ou reconnu dans le dictionnaire; les signes autour du cercle
restent des modificateurs separes. Le panneau `Etat du sort` affiche l'element
dominant, la qualite, la stabilite, la force, le support choisi et le diametre
estime. Le menu `Support` garde seulement deux choix pour l'instant: aucun lien
ou chaussure volante. Le cercle reste toujours pose sur un papier; en mode
chaussure, ce papier est sous la semelle et reste limite aux petits cercles
jusqu'a 35 cm pour garder une echelle realiste. Les effets du support changent
selon l'element et les signes: feu brule ou propulse, eau mouille ou fait jet,
vent porte, terre souleve, et certaines combinaisons avec Levitation ou
Convergence creent des comportements particuliers. Apres activation, une vue
3D manipulable du cercle s'ouvre sur le parchemin.

Les 47 dessins de sigils et signes viennent d'un catalogue vectoriel unique:
le menu, la grille et l'encre 3D montrent donc la meme forme. La lecture compose
les signes par roles (matiere, collecte, etat, forme, mouvement, cible, zone,
liaison et puissance). Les signes semi-directionnels peuvent tourner autour du
cercle sans etre confondus avec une direction de mouvement. Une verification
automatique couvre actuellement 6 669 variantes a deux signes; les effets mal
documentes restent marques comme interpretations prudentes.

Le reglage d'echelle commence a x1 et peut reduire ou agrandir l'affichage du
cercle. La taille physique du cercle ne change pas; l'epaisseur du trait augmente
en compensation pour garder le cercle visible. Le cadrillage sert d'echelle:
1 carreau represente 5 cm. Le diametre physique estime affiche la vraie valeur;
sous 5 cm ou au-dessus de 5 m, il passe en rouge et l'activation est refusee. Le
compteur peut etre affiche pres du cercle ou masque depuis les reglages. Le
parchemin peut etre deplace avec deux doigts sur trackpad ou ecran tactile. La
zone de dessin a une limite large et visible afin de garder le cadrillage utile
sans bloquer la creation de grands cercles. Lors d'un changement entre une
fenetre ordinateur et mobile, le cadrillage et le cercle restent centres sur le
meme point au lieu de partir hors champ.

Raccourcis: `Cmd/Ctrl + Z` defait, `Cmd/Ctrl + Shift + Z` refait,
`Cmd/Ctrl + S` archive, `A` active, `L` lit le cercle et `Echap` efface.

Le bouton `Symboles a placer` ouvre la palette complete des 47 dessins. Prends
une carte et fais-la glisser comme un bloc Scratch jusqu'au parchemin: un
apercu en pointilles confirme la position avant le depot. Un depot hors de la
zone de dessin est annule.

Pour modifier la taille d'un symbole deja pose, selectionne-le avec un clic
droit, ou avec un appui long sur ecran tactile, puis utilise les boutons `-` et
`+` de la barre d'outils. Le redimensionnement fonctionne avec `Defaire` et
`Refaire`.

- `index.html` : page principale du site.
- `bibliotheque.html` : bibliotheque de planches de reference de cercles.
- `parametres.html` : page des parametres.
- `tutoriel.html` : page tutoriel du simulateur.
- `styles.css` : design de l'atelier.
- `app.js` : logique du simulateur web.
- `symbol-catalog.mjs` : 47 dessins vectoriels partages par toute l'application.
- `spell-grammar.mjs` : profils et moteur deterministe de combinaison.
- `scripts/validate-spell-matrix.mjs` : controle des 6 669 variantes.
- `.gitignore` : fichiers locaux a ignorer.
- `vendor/three/` : copie locale de Three.js 0.165.0 et de sa licence MIT.

## Verification rapide

```bash
node --check app.js
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node scripts/validate-spell-matrix.mjs
```

