# Page routing acceptance

- Commit under test: `4b27ff7`
- `pnpm run build`: passed (`tsc -b` and Vite production build).
- `FELIX_TEST_URL=http://127.0.0.1:5329 node tests/page-routing-ui.cjs`: passed.
- Verified navigation to 已安排、插件、设置 renders each real surface and never renders the removed demo fallback text.
- Verified 返回应用 restores the chat composer.
- No product correction was required after acceptance.
