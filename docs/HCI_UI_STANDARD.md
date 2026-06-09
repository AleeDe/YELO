# YELO HCI and UI Standard

## Purpose

YELO is a monitoring and incident-review system. Its interface must help an
administrator notice system state, understand an alert, and make a correct
decision quickly without implying that an AI prediction is a proven offense.

This document converts established HCI principles into implementation rules and
acceptance criteria for the web and Capacitor applications.

## Research Basis

### Fitts's Law

Fitts's Law models target-selection time as a function of target distance and
target width. Larger targets that are closer to the user's current pointer or
thumb position are generally faster to acquire.

YELO application:

- Primary controls have a minimum interactive area of 44 by 44 CSS pixels.
- Mobile primary actions are positioned within comfortable thumb reach.
- Frequently used incident actions are adjacent to the evidence and status.
- Icon-only controls are not used for critical or unfamiliar actions.
- Destructive actions are separated from high-frequency safe actions.
- Small status badges are informational and are never the only clickable area.

### Hick-Hyman Law

Choice reaction time increases with the information carried by the available
choices. This is not a command to remove every option. It means choices should
be grouped, prioritized, and disclosed at the point where they become relevant.

YELO application:

- Each page has one visually dominant primary action.
- Main navigation contains no more than seven top-level destinations per role.
- Secondary actions move into a clearly labelled overflow menu.
- Filters begin with common presets and reveal advanced controls on request.
- Incident status choices use plain language and are grouped by outcome.
- Role-based navigation hides unavailable destinations instead of disabling
  many irrelevant choices.

### Keystroke-Level Model

The Keystroke-Level Model estimates an expert user's task time by summing
primitive operators such as keystrokes, pointing, mental preparation, and
system response. YELO uses KLM comparatively: proposed flows should require
fewer operations and fewer context switches than their alternatives.

Primary review task:

```text
Open newest alert -> inspect evidence -> choose outcome -> submit review
```

Target desktop interaction:

```text
P + K/P + M + P + K
```

Target mobile interaction:

```text
Tap alert + inspect + tap outcome + tap confirm
```

Design requirements:

- New alerts link directly to the relevant incident.
- Evidence, camera, time, zone, and confidence appear in one review context.
- Review does not require navigating to a separate edit page.
- Common outcomes are visible without opening a menu.
- Keyboard shortcuts may supplement controls but never replace visible actions.
- A completed review gives immediate status feedback and preserves context.

### Nielsen's Usability Heuristics

The following heuristics are especially important for YELO:

- Visibility of system status: show camera health, last contact, processing
  state, active filters, upload progress, and review completion.
- Match with the real world: use society, camera, zone, incident, confirmed,
  false alert, and resolved rather than model-centric terminology.
- User control and freedom: allow cancellation, reversible status changes where
  appropriate, and clear exits from dialogs.
- Consistency and standards: use stable labels, locations, icons, and status
  colors throughout the product.
- Error prevention: validate camera setup before activation, confirm destructive
  actions, and prevent cross-society selection mistakes.
- Recognition rather than recall: show camera and society context instead of
  expecting IDs or remembered settings.
- Flexibility and efficiency: provide search, saved filters, direct alert links,
  and keyboard-friendly review for experienced operators.
- Minimalist design: prioritize active cameras and unresolved incidents; place
  configuration detail on dedicated pages.
- Error recovery: explain what failed, what was preserved, and how to retry.
- Help and documentation: place contextual help beside camera connection and
  restricted-zone setup.

## Accessibility Baseline

YELO targets WCAG 2.2 Level AA.

### Interaction

- Minimum target size is 44 by 44 CSS pixels for application controls.
- Every pointer action has a keyboard equivalent.
- Dragging a restricted-zone point will have a non-drag alternative.
- Focus order follows the visual and task order.
- Focus is never hidden under sticky headers or mobile action bars.
- Modal focus is trapped correctly, `Escape` closes when safe, and focus returns
  to the invoking control.

### Visual

- Normal text contrast is at least 4.5:1.
- Large text contrast is at least 3:1.
- UI component and state contrast is at least 3:1.
- Focus uses a visible 2 CSS pixel minimum indicator with strong contrast.
- Status is communicated with text and shape/icon, never color alone.
- Body text defaults to at least 16 CSS pixels.
- Content remains usable at 200 percent zoom and narrow mobile widths.
- Motion respects `prefers-reduced-motion`.

### Structure and Announcements

- Use native semantic HTML before ARIA.
- Each page has one `main` landmark and a visible `h1`.
- Navigation landmarks receive distinct accessible labels.
- Background status updates use `role="status"` or polite live regions.
- Urgent, non-interrupting incident messages use `role="alert"` sparingly.
- Confirmation dialogs use accessible dialog semantics.
- Tables have headers and a responsive non-table presentation when needed.

## Information Architecture

### Society Administrator

Top-level navigation:

1. Overview
2. Incidents
3. Cameras
4. Analytics
5. Members
6. Settings

### Super Administrator

Top-level navigation:

1. Overview
2. Societies
3. Incidents
4. Cameras
5. Users
6. Audit
7. Settings

### Operator

Top-level navigation:

1. Overview
2. Incidents
3. Cameras

## Responsive Navigation

- Desktop uses a persistent left navigation area.
- Mobile uses a bottom navigation bar for the three most frequent destinations.
- Less frequent mobile destinations live behind a labelled `More` action.
- The current location is indicated visually and with `aria-current="page"`.
- Page titles and primary actions remain visible without duplicating navigation.

## Dashboard Hierarchy

The overview page follows this order:

1. Page identity and society context
2. Primary action
3. Urgent unresolved incident summary
4. Camera health summary
5. Recent incidents
6. Secondary analytics

Urgency does not mean constant interruption. New incidents appear in a persistent
queue and live region. Modal interruption is reserved for a critical system
condition that requires immediate acknowledgement.

## Status Language

Use:

- `Possible littering`
- `Needs review`
- `Confirmed`
- `False alert`
- `Resolved`
- `Camera online`
- `Camera offline`
- `Processing unavailable`

Do not use:

- `Offender detected`
- `Guilty`
- `Crime confirmed by AI`
- Confidence alone as proof

## UI Tokens

### Spacing

Use a 4-pixel base scale:

```text
4, 8, 12, 16, 24, 32, 48, 64
```

### Radius

- Controls: 10 to 12 pixels
- Cards: 16 pixels
- Pills and status labels: full radius

### Color Roles

- Neutral surfaces form most of the interface.
- Blue/teal represents primary navigation and neutral system action.
- Amber represents an event requiring review.
- Red represents destructive actions or genuine system failure.
- Green represents confirmed healthy state, not AI certainty.

### Typography

- Page title: 28 to 36 pixels
- Section title: 18 to 24 pixels
- Body: 16 pixels
- Supporting text: 14 pixels minimum
- Numeric dashboard values use tabular numerals.
- Line length is normally limited to 45 to 75 characters.

## Required Interaction Measurements

Before considering a workflow complete, record:

- Number of taps/clicks for the primary task
- Number of separate pages or dialogs
- Time to visible feedback
- Keyboard-only completion
- Screen-reader announcement of dynamic result
- Error recovery path

Initial targets:

| Task | Target |
|---|---:|
| Open newest incident | 1 action |
| Start camera registration | 1 action from Cameras |
| Review an incident | 3 actions after opening |
| Reach any top-level page | 1 action |
| See camera health | No interaction from Overview |
| Acknowledge a normal alert | No forced modal |

## Acceptance Checklist

- [ ] One clear primary action per page
- [ ] No more than seven role-relevant top-level destinations
- [ ] Controls meet the 44 by 44 pixel project target
- [ ] Full visible keyboard focus
- [ ] No color-only statuses
- [ ] Loading, empty, success, and error states are designed
- [ ] Mobile layout works at 320 CSS pixels
- [ ] Content works at 200 percent zoom
- [ ] Primary flows are measured with KLM-style operation counts
- [ ] Destructive actions require deliberate confirmation
- [ ] AI language indicates uncertainty and human review
- [ ] Dynamic alerts are accessible without stealing focus

## Sources

- Fitts, P. M. (1954), *The information capacity of the human motor system in
  controlling the amplitude of movement*.
- Hick, W. E. (1952), *On the rate of gain of information*.
- Hyman, R. (1953), *Stimulus information as a determinant of reaction time*.
- Card, Moran, and Newell (1980), *The Keystroke-Level Model for User
  Performance Time with Interactive Systems*:
  https://doi.org/10.1145/358886.358895
- Nielsen Norman Group, *10 Usability Heuristics for User Interface Design*:
  https://www.nngroup.com/articles/ten-usability-heuristics/
- W3C, *Web Content Accessibility Guidelines 2.2*:
  https://www.w3.org/TR/WCAG22/
- W3C, *ARIA Authoring Practices Guide*:
  https://www.w3.org/WAI/ARIA/apg/
- W3C, *Alert Pattern*:
  https://www.w3.org/WAI/ARIA/apg/patterns/alert/
- W3C, *Modal Dialog Pattern*:
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
