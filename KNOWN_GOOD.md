# Known Good

## 2026-08-16 — Dense navigation / resizable tree working

**Status:** KNOWN GOOD / WORKING

The current `dev` deployment has been verified working after a hard refresh (`Ctrl+Shift+R`).

Verified:
- Dense three-pane navigation layout is restored.
- Tree/content splitter is visible and functional.
- Tree width can be resized.
- Content panel receives the remaining available width.
- Shared eBliss Theme CSS correctly uses a four-column layout when an explicit `.eb-tree-splitter` is present.
- A normal browser refresh may retain cached theme CSS; use a hard refresh when validating shared theme CSS changes.

### Recovery guidance
If the UI regresses, restore/compare against the repository state associated with this checkpoint before making additional UI changes. Do not blindly patch forward.

### Important architecture note
The splitter layout depends on the shared eBliss Theme navigation CSS. The scoped rule is:

`.eb-navigation:has(.eb-tree-splitter) { grid-template-columns: 48px var(--tree-width, 220px) 6px minmax(0, 1fr); }`

This prevents the theme's normal three-column navigation rule from consuming the content area.
