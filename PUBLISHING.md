# Publishing p5.millefeuille to npm

## ✅ Completed Pre-Publishing Tasks

1. **Package metadata updated**:
   - ✅ Repository URL: `https://github.com/SableRaf/p5.millefeuille.git`
   - ✅ Author: `Raphaël de Courville <raphael.de.courville@gmail.com>`
   - ✅ Homepage: `https://sableraf.github.io/p5.millefeuille/`
   - ✅ Bugs URL added
   - ✅ License: LGPL-2.1

2. **Build configuration enhanced**:
   - ✅ Source maps enabled for all builds
   - ✅ Banner updated with correct GitHub URL
   - ✅ Three build outputs: UMD, minified UMD, and ES module

3. **Package content controlled**:
   - ✅ `.npmignore` created to exclude dev files
   - ✅ Package includes: dist/, src/, README.md, LICENSE
   - ✅ Package excludes: examples/, tests/, config files

4. **Documentation updated**:
   - ✅ README updated with jsdelivr CDN links
   - ✅ Installation instructions complete

5. **Build verified**:
   - ✅ Clean build successful
   - ✅ Source maps generated (.map files)
   - ✅ Package size: 226.4 kB (unpacked: 806.4 kB)
   - ✅ 20 files included in package

## Next Steps: Publishing to npm

### Step 1: Verify npm login
```bash
npm whoami
```
Expected output: `sableraph` ✅ (already verified)

### Step 2: Dry run publish (optional but recommended)
```bash
npm publish --dry-run
```
This will show you exactly what will be published without actually publishing.

### Step 3: Publish to npm
```bash
npm publish
```

### Step 4: Verify publication
After publishing, verify on npm:
- Visit: https://www.npmjs.com/package/p5.millefeuille
- Check version 0.1.0 is live

### Step 5: Test jsdelivr CDN
After npm publication, jsdelivr will automatically pick up the package within a few minutes:
```html
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@0.1.0/dist/p5.millefeuille.min.js"></script>
```

## Post-Publishing Recommendations

### 1. Create GitHub Release
```bash
git tag v0.1.0
git push origin v0.1.0
```

Then create a release on GitHub:
- Go to: https://github.com/SableRaf/p5.millefeuille/releases/new
- Tag version: v0.1.0
- Release title: v0.1.0
- Description: First public release of p5.millefeuille

### 2. Update documentation
- Add npm badge to README
- Add jsdelivr badge to README
- Consider adding download stats

### 3. Announce
- Share on p5.js Discord/Forum
- Share on social media
- Consider adding to p5.js libraries list

## jsdelivr CDN Access

Once published, your library will be available via jsdelivr at:

### Latest version (auto-updates):
```html
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.min.js"></script>
```

### Specific version (recommended for production):
```html
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@0.1.0/dist/p5.millefeuille.min.js"></script>
```

### ES Module:
```javascript
import millefeuilleAddon from 'https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.esm.js';
```

### With version range:
```html
<!-- Any 0.x.x version -->
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@0/dist/p5.millefeuille.min.js"></script>
```

## Important Notes

- **Version**: Publishing as `0.1.0` (initial release)
- **Scope**: Publishing as unscoped package `p5.millefeuille`
- **License**: LGPL-2.1 (allows commercial use with attribution)
- **Package size**: ~226 KB (reasonable for a graphics library)
- **Source maps**: Included for debugging

## Troubleshooting

If publish fails:
1. Check npm login: `npm whoami`
2. Check package name availability: `npm view p5.millefeuille`
3. Verify package.json syntax: `npm pack --dry-run`
4. Check npm registry status: https://status.npmjs.org/

If you need to unpublish (within 72 hours):
```bash
npm unpublish p5.millefeuille@0.1.0
```
⚠️ Only use this if you made a critical error!

## Ready to Publish?

You're all set! When you're ready, run:
```bash
npm publish
```

The package will be live on npm and accessible via jsdelivr within minutes.
