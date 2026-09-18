# Application menu acceptance

- Implementation commit: `a1832e5`
- `pnpm --dir desktop run build`: passed (`tsc -b` and Vite production build).
- `node desktop/tests/app-menus-ui.cjs`: passed.
- `node desktop/tests/app-shortcuts-ui.cjs`: passed.
- Verified File/Edit/View/Help menus, direction/Home/End navigation, Escape and outside-click dismissal, narrow-window bounds, menu action reuse, terminal open/close, settings navigation, and draft isolation.
- Verified application shortcuts remain guarded while menus/popovers are open and IME handling remains unchanged.
- No correction was required after acceptance.
