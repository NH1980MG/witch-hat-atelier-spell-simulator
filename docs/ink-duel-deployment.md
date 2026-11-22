# Ink Duel public beta

The game lives under `duel/`; the simulator only adds a menu link. The local
development copy is independent and is not replaced by this release.

Supabase project `rcbnkssesgmxselipwyz` provides lobby RPCs and Realtime.
`duel/supabase-schema.sql` records the applied migration but is not deployed
to GitHub Pages. Existing shared canvases and account tables are untouched.

The browser hosting a match simulates combat and broadcasts compressed state.
The other browser submits ordered actions. Leaving the host tab ends the match;
there is no server authority or host migration. This is a casual beta, not a
cheat-resistant ranked mode.

Lobby membership uses random bearer tokens, stored only as hashes. Room channel
names are random capabilities disclosed to members by the RPC. Realtime channels
are not authenticated private channels: a leaked channel capability permits
access. Do not place personal data in game messages. The database tables deny
direct public access; only the scoped lobby RPC is executable anonymously.

Rooms expire after 20 minutes or missed heartbeats. Capacity is 32 active rooms.
These limits are not a replacement for rate limiting against deliberate abuse.

Validation: `node --test tests/duel-cloud.test.mjs` and live integration
`node scripts/test-duel-cloud-live.mjs` (private room), or with argument `quick`.
Live tests create temporary rooms and close them afterward.

Rollback: remove the Duel menu link and Pages copy steps, then remove `duel/`.
Disable only `public.ink_duel_lobby` if necessary. Do not drop shared canvas,
authentication, or other existing project objects.
