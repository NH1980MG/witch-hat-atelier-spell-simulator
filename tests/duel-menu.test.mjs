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
