## Package audit: Asset 360 Investigation Workspace

Reviewed commit: `d05202b62fa5946f02c1a8b5904c23b13b38df14`. Lockfile: `package-lock.json` (present, committed). Commands run: `npm outdated --json`, `npm audit --json`, and `npm view <pkg> deprecated` for flagged packages (`react`, `react-dom`, `@cognite/app-sdk`, `@cognite/aura`).

Change since round 2: `@tanstack/react-table` (previously one major behind) and `@tanstack/react-virtual` were removed from `dependencies` and the lockfile; neither is referenced anywhere in the repo.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| `@cognite/app-sdk` | 0.9.0 | 0.11.50644 | No | 0 | Warn (pre-1.0, two minors behind) |
| `@cognite/aura` | 1.50526.0 | 1.50644.0 | No | 8 low (transitive KaTeX chain) | Pass (one patch-level release behind; low advisory only) |
| `@cognite/sdk` | 10.10.x | current | — | 0 | Pass |
| `@tabler/icons-react` | 3.35.x | current | — | 0 | Pass |
| `@tanstack/react-query` | 5.108.x | current | — | 0 | Pass |
| `react` | 18.3.1 | 19.3.1 | No | 0 | Warn (one major behind) |
| `react-dom` | 18.3.1 | 19.3.1 | No | 0 | Warn (one major behind) |
| `recharts` | 3.11.x | current | — | 0 | Pass |

Dev dependencies behind (not production, informational): `@eslint/js` 9→10, `eslint` 9→10, `@testing-library/jest-dom` 6→8, `@types/react` and `@types/react-dom` 18→19, `@vitejs/plugin-react` 5→6, `@vitest/coverage-v8`, `@vitest/ui`, `vitest` 4→5, `typescript` 5.9→7.0, `vite` 7→8. None is in `dependencies`, none deprecated, none flagged by audit.

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 8 |

#### Vulnerabilities

All 8 low entries share one root cause (KaTeX) reached transitively through `@cognite/aura` → `@streamdown/math` / `@streamdown/mermaid`.

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| `katex` | low | KaTeX: Existing prototype pollution can bypass trust restrictions (`>=0.11.0 <0.18.2`) | `katex` ≥ 0.18.2 (via upstream Aura/streamdown update) | https://github.com/advisories/GHSA-238p-pmpm-9mq7 |
| `@streamdown/math`, `@streamdown/mermaid`, `mermaid`, `rehype-katex`, `remark-math`, `micromark-extension-math`, `@cognite/aura` | low | Affected via `katex` | npm suggests `@cognite/aura@0.3.5` (a downgrade; not applicable) | — |

### Package health: **Warn**

No high/critical CVE, no deprecated package, lockfile present, and no production dependency is two or more majors behind. React/React DOM (one major) and `@cognite/app-sdk` (pre-1.0 minors) keep the rating at Warn. The build emits a 1,036 kB main chunk (309 kB gzip).
