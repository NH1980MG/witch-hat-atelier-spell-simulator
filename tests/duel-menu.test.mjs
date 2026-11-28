import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../duel/ink-duel.html', import.meta.url), 'utf8');
const lobby = html.match(/<dialog id="lobbyDialog"[\s\S]*?<\/dialog>/)?.[0] || '';

test('duel lobby groups solo, matchmaking and private rooms without losing controls', () => {
  assert.match(lobby, /aria-labelledby="lobbyTitle"/);
  for (const heading of ['Solo', 'Partie en ligne', 'Salon prive']) {
    assert.ok(lobby.includes(`<h3>${heading}</h3>`));
  }
  for (const id of ['playBot', 'createRoom', 'quickMatch', 'roomCode', 'joinRoom', 'lobbyStatus', 'copyRoom', 'cancelSearch']) {
    assert.equal(lobby.split(`id="${id}"`).length - 1, 1, id);
  }
  assert.match(lobby, /for="roomCode"/);
  assert.match(lobby, /id="lobbyStatus" role="status"/);
});

test('public navigation exposes the duel from the home hub and every workshop menu', () => {
  for (const page of ['index', 'bibliotheque', 'tutoriel', 'partage', 'suggestions', 'fonctionnement', 'parametres']) {
    const source = readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
    const menu = source.match(/<nav class="workshop-menu-links"[\s\S]*?<\/nav>/)?.[0] || '';
    assert.match(menu, /href="duel\/ink-duel.html"/, page);
    if (page === 'index') {
      const home = source.match(/<nav class="app-hub-shortcuts"[\s\S]*?<\/nav>/)?.[0] || '';
      assert.match(home, /href="duel\/ink-duel.html"/);
    }
  }
});

test('duel loads its simulator theme after its layout styles', () => {
  assert.match(html, /href="ink-duel-local.css"[\s\S]*href="ink-duel-theme.css"/);
  const theme = readFileSync(new URL('../duel/ink-duel-theme.css', import.meta.url), 'utf8');
  const simulator = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  for (const token of ['ink', 'gold', 'paper', 'line', 'edge']) {
    const value = simulator.match(new RegExp(`--${token}:\\s*([^;]+);`))[1];
    assert.ok(theme.includes(`--${token}: ${value};`), token);
  }
});
