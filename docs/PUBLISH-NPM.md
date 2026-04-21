# Publishing graphqlai on npm

The package is configured for publishing (`private: false`, **`files`** whitelist). Maintenance steps:

1. **Accounts:** npm user with publish rights and **2FA** enabled (recommended “auth and writes” or stricter).

2. **Dry run locally:**

```bash
npm ci
npm test
npm publish --dry-run
```

Inspect the tarball list — it should contain `bin/`, `src/`, `LICENSE`, `SECURITY.md`, and packaged docs only.

3. **Version bump:** edit **`package.json`** `version` per semver (e.g. patch after bugfix-only, minor after CLI flags like `-H` / Retry-After).

4. **Publish:**

```bash
npm publish --access public
```

5. **Verify:** install in a temp directory (`npm install graphqlai@latest`) and run `npx graphqlai --version`.

CI does **not** publish automatically — releases are deliberate.
