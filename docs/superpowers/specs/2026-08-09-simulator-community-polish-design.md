# Simulator and Circle Commons Polish Design

Date: 2026-08-09
Status: approved

## Scope

Coordinate six related improvements across the static simulator and Circle
Commons without merging their responsibilities.

## Simulator Suggestions

The simulator owns suggestions about the simulator. Every public simulator page
links to a local bilingual `suggestions.html` page. The form validates a title,
category, language, and description, then opens a prefilled GitHub issue on the
canonical repository. No token, secret, or cross-origin write API is added to
the static site.

Circle Commons removes Suggestions from its primary navigation. Its old
`/suggestions` route performs a permanent user-facing redirect to the simulator
page. The existing database table remains untouched so previously stored
records are not destroyed.

## Reliable Navigation

Critical Circle Commons navigation uses native HTML anchors rather than
framework-prefetched links. Header links receive stable minimum dimensions,
remain above decorative layers, and expose visible focus states. Brand,
Community charter, Workshop, Library, Tutorial, and How it works must work with
JavaScript disabled.

## Private Viewer Registry

The public post view count remains public. A signed-in visitor creates at most
one identified view record per post. Anonymous visits still affect only the
aggregate counter.

Only the post author may request the named viewer list. The response exposes
display name and first-view timestamp, never email. The author is not recorded
as a viewer of their own post. Unauthorized and anonymous requests return 403
and 401 respectively.

The account page provides a compact, explicitly requested viewer list for each
owned post. It does not preload viewer identities for every post.

## Welcome Circle

Circle Commons replaces the generic CSS ornament with one original welcome
seal composed from canonical paths in the simulator's `symbol-catalog.mjs`.
The seal uses a complete outer ring, a central Wind motif, balanced directional
signs, and secondary structural marks. It is exported as a static asset so the
community site does not duplicate the entire simulator runtime.

## Flying Shoe Illustration

Generate one original raster illustration of a recognizable pair of flying
shoes with small parchment circles fixed under the soles. It uses detailed ink
and restrained watercolor, a front three-quarter view, and a clean removable
background. It must not copy a manga panel or include characters, text, logos,
or a large free-floating magic circle.

The simulator uses this image in the shoe support option. The no-support option
keeps its existing vector mark. The existing Three.js shoe model remains
separate and unchanged by this asset task.

## Accessibility and Responsive Behavior

- Every new form field has a visible label and bilingual text.
- Navigation targets are at least 44 pixels high.
- Text wraps without clipping at 320 pixels and desktop widths.
- Generated imagery has useful localized alternative text.
- Identity lists are keyboard reachable and announced when loaded.
- Motion and decorative marks do not intercept pointer events.

## Security

- The GitHub issue URL is constructed from fixed repository and label values.
- User text is encoded with `URLSearchParams`; it is never inserted as HTML.
- Viewer authorization is enforced server-side against post ownership.
- D1 queries use bound parameters.
- The viewer table has one unique row per `(post_id, viewer_id)`.
- Emails are never returned by the viewer endpoint.
- Existing CSP, upload validation, rate limiting, and ownership checks remain.

## Validation

Automated tests cover all simulator navigation links, form URL construction,
the generated shoe asset reference, native community anchors, the canonical
welcome asset, unique view recording, author-only viewer reads, anonymous
privacy, and schema migration safety.

The simulator suite, community unit suite, both production builds, responsive
screens, and deployed routes must pass before publication. The exact tested
sources are committed and then published to GitHub Pages and Sites.

