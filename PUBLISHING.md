# Publishing p5.millefeuille to npm

Publishing is automated via GitHub Actions using **npm Trusted Publishing (OIDC)** — no long-lived tokens or secrets required. A workflow runs automatically when a `v*` tag is pushed.

## One-time setup: configure Trusted Publishing on npmjs.com

> Skip this if it's already configured.

1. Go to `https://www.npmjs.com/package/p5.millefeuille/access`
2. Under **Trusted Publishers**, add a GitHub Actions publisher:
   - **Repository owner:** `SableRaf`
   - **Repository name:** `p5.millefeuille`
   - **Workflow filename:** `publish.yml` *(case-sensitive, exact match)*
   - **Environment name:** *(leave blank)*

## One-time setup: untrack dist/ from git

`dist/` is no longer committed. Run this once after updating `.gitignore`:

```bash
git rm -r --cached dist/
git commit -m "Stop tracking built output"
```

Past history still contains old build artifacts — this does not rewrite history.

## Release checklist

For each release:

1. Bump `"version"` in `package.json`
2. Add the new version to the `"publishedVersions"` array in `package.json` — **CI will reject the publish if this is missing**
3. Commit both changes
4. Push the tag:
   ```bash
   git tag v<version>
   git push origin v<version>
   ```

The workflow will then: verify the version/tag match → verify `publishedVersions` → lint → test → build → dry-run pack → publish.

## What the workflow does

See [`.github/workflows/publish.yml`](.github/workflows/publish.yml) for the full workflow.

Key points:
- Uses Node.js 22.14.0 (minimum required for npm Trusted Publishing)
- `--ignore-scripts` on `npm publish` skips `prepack` — the explicit Build step already produced `dist/`
- Version check: tag `v0.2.2-alpha` → expects `package.json` version `0.2.2-alpha`

## Local development

After a fresh clone, `dist/` is not present. Run either:

```bash
npm run build      # build dist/ only
npm run examples   # builds if dist/ is absent (aborts on failure), then serves examples
```

## Optional: add an approval gate

To require manual approval before publishing, create a GitHub Environment named `npm-publish` with required reviewers, then add `environment: npm-publish` to the publish job in the workflow file.

## Optional: lock down npm to OIDC only

After a first successful CI publish: npmjs.com → package **Settings** → **Publishing access** → "Require two-factor authentication and disallow tokens". This makes OIDC the only publish path.

## Verification

After pushing a tag:

1. Check the **Actions** tab on GitHub — the workflow should show all steps green.
2. Confirm the version appears at `https://www.npmjs.com/package/p5.millefeuille`.
3. Verify the CDN link: `https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.min.js`

## jsdelivr CDN links

```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.min.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@0.2.1-alpha/dist/p5.millefeuille.min.js"></script>
```

```javascript
// ES Module
import millefeuilleAddon from 'https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.esm.js';
```
