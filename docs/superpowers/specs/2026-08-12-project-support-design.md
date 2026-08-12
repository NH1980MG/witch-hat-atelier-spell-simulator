# Project Support Design

## Goal

Add an optional project-support experience to the simulator and Circle Commons without loading advertisements before explicit consent.

## Shared experience

- A compact **Support the project / Soutenir le projet** capsule sits beside the account control.
- It opens an accessible modal explaining that support is optional and helps fund hosting, tools, and AI tokens used to generate, test, and improve the code.
- The modal provides a Ko-fi donation action and an advertising preference.
- Advertising is off by default and can be disabled again at any time.
- The preference is device-local and does not require an account.

## Advertising

- Only manual responsive AdSense units are supported; Auto ads are excluded.
- The simulator reserves a horizontal unit below the grimoire.
- Circle Commons reserves a quiet right rail on wide screens and moves it below content on smaller screens.
- No Google script or ad request is created until the visitor opts in and valid publisher and slot identifiers are configured.
- Production activation also requires the publisher to configure Google's certified CMP for relevant regions and block sensitive categories in AdSense Brand Safety.
- Category filtering reduces inappropriate advertising but cannot guarantee that every unsuitable creative is excluded. The user can disable the ad area immediately.

## Donations and configuration

- Ko-fi is the selected donation provider.
- Until a verified Ko-fi URL is configured, the donation action is visibly unavailable and never points to an invented account.
- AdSense identifiers remain empty until supplied from the owner's AdSense account.

## Accessibility and responsive behavior

- The modal uses native dialog semantics, labeled controls, keyboard closing, and visible focus states.
- Support controls remain usable on desktop, iPad, and phone layouts.
- Ad areas never overlap the drawing canvas, controls, posts, or navigation.

## Validation

- Tests assert opt-in defaults, absence of eager ad scripts, persistence, configurable donation state, responsive placement, and bilingual copy.
- Both applications must build and their existing test suites must remain green.
