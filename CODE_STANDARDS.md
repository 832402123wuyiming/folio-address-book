# Code Standards

- Write interface text, documentation, variable names, and commit messages in English.
- Use JavaScript modules and descriptive names. Use two-space indentation and single quotes for JavaScript strings when practical.
- Keep browser rendering and events in `app.mjs`, storage and contact operations in `data.mjs`, and workbook conversion in `excel.mjs`.
- Render contact values as text. Give interactive controls accessible names and retain keyboard focus after changes.
- Validate Excel inputs before writing to browser storage. Make changes visible only after storage succeeds.
- Keep third-party licenses next to the vendored scripts.
- Use a branch for feature work and actionable commit messages starting with `feat:`, `fix:`, `test:`, or `docs:`. Run the workbook tests before opening a pull request.

