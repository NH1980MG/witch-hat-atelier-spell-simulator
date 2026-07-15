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
Convergence creent des comportements particuliers. La bibliotheque affiche
maintenant des cercles isoles et classes depuis les planches de reference
Telepedia fournies, sans inventer de nouveaux cercles magiques. Apres
activation, une vue 3D manipulable du cercle s'ouvre sur le parchemin.

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

## Ouvrir le site

Seule URL de travail:

```text
http://127.0.0.1:8000/index.html
```

L'ouverture directe des fichiers n'est pas une version maintenue. Les pages
redirigent vers le serveur local pour eviter les differences de securite et de
cache entre navigateurs.

Le site est statique: il peut etre publie tel quel sur GitHub
Pages, Netlify, Vercel ou n'importe quel hebergeur de fichiers statiques.
Avant une publication publique, consulte `SECURITY.md` et
`docs/release-checklist.md`: les captures de reference doivent rester privees
ou etre remplacees par des assets originaux.

## Lancer le serveur local

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Puis ouvre:

```text
http://127.0.0.1:8000/
```

## Demarrage automatique sur macOS

Des scripts sont fournis pour installer le serveur comme service utilisateur
macOS. Le service demarre a l'ouverture de session, y compris apres un
redemarrage du laptop.

Installer:

```bash
cd /Users/nathanh/Projets/witch-hat-atelier-simulator
scripts/install-launch-agent.sh
```

Desinstaller:

```bash
cd /Users/nathanh/Projets/witch-hat-atelier-simulator
scripts/uninstall-launch-agent.sh
```

Le service utilise `scripts/start-local-server.sh` et sert le site sur
`http://127.0.0.1:8000/`. Les journaux sont ecrits dans `logs/`.

## Documentation de travail

Les documents de cadrage sont dans `docs/`:

- `docs/00-overview.md` : carte des documents et principe de travail.
- `docs/review.md` : revue du depot, risques et recommandations.
- `docs/product-brief.md` : intention produit et objectifs.
- `docs/research-notes.md` : sources, references et politique d'utilisation.
- `docs/design-direction.md` : direction UX, visuelle et animation.
- `docs/architecture.md` : architecture actuelle et cible.
- `docs/spell-effect-catalog.md` : grammaire diagramme -> effet 3D.
- `docs/sign-reference.md` : signes documentes, niveau de confiance et
  correspondance avec le simulateur.
- `docs/reference-manifest.md` : suivi des sources et assets de reference.
- `docs/local-reference-audit.md` : inventaire et controle visuel des 42
  captures locales.
- `docs/qa-plan.md` : plan de verification manuelle et visuelle.
- `docs/release-checklist.md` : controles avant GitHub et publication web.
- `docs/progress-tracker.md` : jalons, backlog et decisions.

Objectif de la prochaine phase: utiliser les diagrammes comme moteur de
manifestations 3D. Par exemple, un sigil d'eau combine avec Orbe, Colonne ou
Levitation doit produire des animations d'eau distinctes, inspirees par la
logique de Witch Hat Atelier mais dessinees et animees comme assets originaux.

## Structure

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

## Verification rapide

```bash
node --check app.js
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node scripts/validate-spell-matrix.mjs
```

Le dernier controle doit annoncer 47 dessins, 6 669 recettes uniques, 6 144
plans executables et 19 regles logiques validees.
