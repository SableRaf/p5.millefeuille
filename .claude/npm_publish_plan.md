# npm Publish Plan

1. **Audit package metadata**
   - Verify `package.json` fields: `name`, `version`, `description`, `keywords`, `repository`, `bugs`, `homepage`, `license`.
   - Ensure entry points (`main`, `module`, `types` if any) match built artifacts in `dist/`.
   - Confirm `files` whitelist and `.npmignore` prevent shipping examples/tests unintentionally.
   - Make sure README and LICENSE reflect current features.

2. **Verify build artifacts**
   - Run `npm run build` to regenerate `dist/` bundles.
   - Inspect bundle contents for version banner or timestamp if applicable.
   - Execute `npm pack --dry-run` to inspect the tarball; adjust `files`/`.npmignore` to keep it lean.

3. **Run QA suite**
   - `npm run lint` for static analysis.
   - `npm run test` for Jest coverage.
   - Optionally open `examples/` in local server to sanity-check UI interactions.

4. **Prepare release notes**
   - Summarize newly added blend modes, LayerUI fixes, deployment improvements.
   - Update CHANGELOG or README "What's new" section with version number and date.
   - Highlight known issues (e.g., SCREEN approximation, LayerUI keydown warning).

5. **Publish to npm**
   - `npm login` (ensure 2FA device handy).
   - Bump version via `npm version <patch|minor|major>`; push commits + tags.
   - `npm publish --access public`.
   - Verify release on npmjs.com, then update TODO entry and announce release if needed.
