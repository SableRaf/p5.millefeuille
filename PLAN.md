# Plan: Publishing p5.millefeuille to npm

## ✅ COMPLETED - Ready for Publishing

All preparation steps have been completed. The package is ready to be published to npm.

## Current State Analysis

### Package Configuration
- **Package name**: `p5.millefeuille`
- **Current version**: `0.1.0`
- **License**: LGPL-2.1 ✓
- **Repository**: `https://github.com/SableRaf/p5.millefeuille.git` ✓
- **npm user**: `sableraph` (logged in) ✓

### Build System
- Build tool: Rollup
- Output files in `dist/`:
  - `p5.millefeuille.js` (UMD build)
  - `p5.millefeuille.min.js` (minified UMD)
  - `p5.millefeuille.esm.js` (ES module)
- Build outputs are tracked in git (removed from .gitignore)
- Entry points configured in package.json ✓

### Files Configuration
The `files` field in package.json specifies:
```json
"files": ["dist", "src", "README.md", "LICENSE"]
```

### Issues to Address

1. **Package.json Issues**:
   - Repository URL placeholder: `"url": "https://github.com/yourusername/p5.millefeuille.git"`
     - Should be: `"url": "https://github.com/SableRaf/p5.millefeuille.git"`
   - Missing author field (currently empty string)
   - Banner in rollup.config.js references placeholder URL

2. **Missing Type Definitions**:
   - No TypeScript definitions (`.d.ts` files)
   - Would improve developer experience for TypeScript users

3. **No .npmignore File**:
   - Relying on package.json `files` field (acceptable, but could be explicit)
   - May want to exclude examples, tests, config files from npm package

4. **No Source Maps**:
   - Build doesn't generate .map files
   - Would help with debugging

5. **Documentation**:
   - README has placeholder "TBD" for CDN installation
   - Should update with jsdelivr CDN links after publishing

## Implementation Plan

### Phase 1: Package Metadata Updates (Required)
1. Update repository URL in package.json
2. Add author information to package.json
3. Update rollup.config.js banner with correct GitHub URL
4. Add homepage field to package.json
5. Add bugs field to package.json

### Phase 2: Build Enhancements (Recommended)
6. Add source map generation to rollup config
7. Consider adding TypeScript definitions for better DX
8. Create .npmignore to be explicit about what to exclude

### Phase 3: Pre-Publish Verification (Required)
9. Run `npm run build` to ensure clean build
10. Run `npm pack` to preview package contents
11. Verify package size and contents
12. Test package locally with `npm link`

### Phase 4: Publishing (Required)
13. Ensure version number is appropriate (0.1.0 for initial release is good)
14. Run `npm publish` (with --dry-run first)
15. Publish to npm registry

### Phase 5: Post-Publish Updates (Recommended)
16. Update README with jsdelivr CDN links
17. Create GitHub release matching the npm version
18. Add installation badge to README

## CDN Access via jsdelivr

Once published to npm, the library will be automatically available via jsdelivr:

### Latest version:
```html
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.min.js"></script>
```

### Specific version:
```html
<script src="https://cdn.jsdelivr.net/npm/p5.millefeuille@0.1.0/dist/p5.millefeuille.min.js"></script>
```

### ES Module:
```javascript
import millefeuilleAddon from 'https://cdn.jsdelivr.net/npm/p5.millefeuille@latest/dist/p5.millefeuille.esm.js';
```

## Questions for User

Before proceeding, I need to clarify:

1. **Author information**: What should go in the "author" field? (name, email, URL)
2. **Version number**: Is 0.1.0 appropriate for the first npm release, or should it be 1.0.0?
3. **TypeScript definitions**: Do you want me to generate basic TypeScript definitions (.d.ts files)?
4. **Source maps**: Should I add source map generation to the build?
5. **Package scope**: Would you prefer a scoped package like `@sableraf/p5.millefeuille` or keep it as `p5.millefeuille`?

## Minimal Required Steps

If you want to publish immediately with minimal changes:

1. Update repository URL in package.json
2. Add author field
3. Run build
4. npm publish

This would make the package functional and available via jsdelivr, with optional enhancements to follow later.
