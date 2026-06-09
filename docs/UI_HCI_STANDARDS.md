# YELO UI and HCI Standards

These rules apply to every new or modified YELO interface.

## Interaction Hierarchy

- Give each screen one obvious primary task.
- Every standalone or full-screen workflow must provide a visible back or close action.
- Back actions must preserve context and use client-side navigation.
- Keep destructive actions away from the primary action area.
- Use progressive disclosure for setup instructions and advanced settings.
- Show the most important status and next action before supporting details.

## Hick's Law

- Reduce simultaneous choices.
- Group related values into one scan-friendly section.
- Hide infrequent actions inside settings or expandable sections.
- Use labels that describe the result, such as `Connect camera`, not vague labels.

## Fitts's Law

- Interactive targets must be at least 44 by 44 CSS pixels.
- Primary mobile actions should use the available width.
- Keep related actions close to the information they affect.
- Do not place destructive and primary actions immediately beside each other.

## KLM and Task Efficiency

- Minimize navigation, typing, and confirmation steps for common tasks.
- Preserve typed values after recoverable errors.
- Give immediate success, loading, and error feedback.
- Require additional confirmation only for irreversible actions.

## Mobile First

- Design and verify at 360, 390, 430, 768, and desktop widths.
- Put the primary action before secondary information.
- Avoid horizontal scrolling and text smaller than 11px.
- Use single-column content where scanning or touch accuracy would suffer.
- Keep controls reachable, full-width where appropriate, and clear of bottom navigation.

## Accessibility and Consistency

- Maintain visible keyboard focus and semantic labels.
- Do not communicate state with color alone.
- Respect reduced-motion preferences.
- Reuse established YELO components, spacing, colors, and terminology.
- Verify loading, empty, error, success, and permission-denied states.
