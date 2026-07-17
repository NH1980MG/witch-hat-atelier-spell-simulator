#!/bin/sh
set -eu

source_dir=${1:?"usage: $0 /path/to/archived-captures"}
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir="$project_dir/assets/library-schematics"

crop() {
  id=$1
  timestamp=$2
  offset_y=$3
  offset_x=$4
  source=$(find "$source_dir" -maxdepth 1 -type f -name "*_${timestamp}_witchhatatelier.telepedia.net.png" -print -quit)
  test -n "$source"
  sips -c 220 220 --cropOffset "$offset_y" "$offset_x" "$source" --out "$output_dir/$id.png" >/dev/null
}

# Vision and mixed spell gallery (130434).
crop gathering-shadows 130434 296 38
crop light-reducing-spell 130434 296 286
crop makeover-mask-spell 130434 296 534
crop beast-repellent 130434 957 58
crop cloak-spell 130434 957 326
crop floating-drops 130434 957 574
crop warmth-retention-seal 130434 1365 58
crop frozen-path 130434 1365 326

# Niche spell gallery (130504 and continuation 130520).
crop billow-cluster 130504 295 42
crop cookpot-lid 130504 295 290
crop fish-guidance 130504 295 541
crop floating-expansion 130504 295 798
crop lockwax 130504 691 42
crop mirror-spell 130504 691 541
crop sand-bridge 130504 691 1067
crop tracking-spell 130504 1137 290
crop smokesculpting-seal 130504 1137 541
crop windowway-spell 130504 1137 798
crop enchanted-doorknob-seal 130504 1137 1067
crop smoke-cloud 130520 558 54
crop beldaruits-illusion-cloak 130520 558 302
crop advanced-beastwarding 130520 558 553
crop amplification-scroll 130520 558 810
crop garment-glimpse-glasses 130520 558 1079
crop handheld-windowway 130520 954 54
crop owlcat-projection 130520 954 302
crop rain-guard 130520 954 553
crop pouch-guidance 130520 954 810

# Ancient spell galleries (130603 and 130639).
crop illusory-labyrinth 130603 487 395
crop petrification 130603 487 643
crop scalewolf-curse 130603 487 891
crop twinned-bottles-spell 130639 301 34
crop ancient-light-beacon 130639 301 288
