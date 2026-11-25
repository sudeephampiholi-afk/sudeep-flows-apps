## Package audit: Asset 360 Investigation Workspace

Reviewed commit: `ee9d602a2ee54f51f80a179e32fffd93269b0321`. Commands run from the app root (outside the sandbox for registry access): `npm outdated --json`, `npm audit --json`. Lockfile `package-lock.json` is present and tracked. Installed versions were confirmed from `node_modules`.

Changes since round 3: `@cognite/app-sdk` 0.9 → 0.11 (installed 0.11.50644), `@cognite/aura` 1.50526 → 1.50644, `@cognite/sdk` → 10.20.0, `vite` → 8.2.4 (pinned), `@vitejs/plugin-react` → 6 (installed 6.3.0). `@tanstack/react-table` and `@tanstack/react-virtual` stay removed.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| `@cognite/app-sdk` | 0.11.50644 | 0.11.50644 (current; not listed by `npm outdated`) | No | 0 | Pass |
| `@cognite/aura` | 1.50644.0 | 1.50667.0 | No | 8 low (transitive KaTeX advisory chain) | Pass (one release behind) |
| `@cognite/sdk` | 10.20.0 | 10.20.0 | No | 0 | Pass |
| `@tabler/icons-react` | ^3.35.0 | current | No | 0 | Pass |
| `@tanstack/react-query` | 5.108.3 | current | No | 0 | Pass |
| `react` | 18.3.1 | 19.3.1 | No | 0 | **Justified exception** (peer-pinned, see below) |
| `react-dom` | 18.3.1 | 19.3.1 | No | 0 | **Justified exception** (peer-pinned, see below) |
| `recharts` | 3.11.0 | current | No | 0 | Pass |

### Justified exception: React 18

`npm outdated` reports `react`, `react-dom`, `@types/react`, and `@types/react-dom` one major behind (18 → 19). This is **intentional and not a defect**: both `@cognite/app-sdk` (0.11.50644) and `@cognite/aura` (1.50644.0) declare `react: ^18.3.1` as their peer dependency, so React 19 would leave the supported range of the host SDK and design system the app must use. `@types/react*` 18 correctly track the runtime. Revisit when those packages publish React 19 peer ranges. This is not counted against criterion 1.3.

### Dev dependencies (informational; rule applies to `dependencies` only)

| Package | Used | Latest | Note |
| ------- | ---- | ------ | ---- |
| `vite` | 8.2.4 (exact pin) | 8.3.8 | Minor behind, same major |
| `eslint` / `@eslint/js` | 9.39.4 | 10.15.0 / 10.0.1 | One major behind (dev only) |
| `vitest`, `@vitest/coverage-v8`, `@vitest/ui` | 4.1.12 | 5.1.1 | One major behind (dev only) |
| `typescript` | 5.9.3 | 7.0.2 | Two majors behind (dev only, `^5.4.0` range) |
| `@testing-library/jest-dom` | 6.9.1 | 8.0.0 | Two majors behind (dev only) |
| `@vitejs/plugin-react` | 6.3.0 | current | Pass |

No production `dependencies` entry is ≥ 1 major behind other than the React exception above.

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 8 |

Totals from `npm audit`: 8 low of 783 dependencies (471 prod, 278 dev, 52 optional, 9 peer).

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| `katex` (via `@streamdown/math`, `@streamdown/mermaid`, `mermaid`, `rehype-katex`, `remark-math`, `micromark-extension-math`, `@cognite/aura`) | low | KaTeX: Existing prototype pollution can bypass trust restrictions | `katex` ≥ 0.18.2 (npm's suggested "fix" is an `@cognite/aura` 0.3.5 downgrade, not applicable) | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) |

The advisory is transitive through Aura's markdown/diagram dependencies; the app does not render user math. No high or critical CVEs; nothing deprecated (spot checks unnecessary — no flagged package beyond the above).

### Bundle health

Round 3 flagged a 1,036 kB main chunk. `npm run build` now emits `index` 310.67 kB (95.86 kB gzip), `react-vendor` 139.82 kB, `cognite-sdk` 132.11 kB, and a lazy `NumericChart` chunk 426.33 kB (120.49 kB gzip); no chunk exceeds 500 kB and Vite prints no large-chunk warning. This round-3 concern is resolved.

### Health

**Pass** — 0 critical/high/moderate CVEs, no deprecated packages, current app-sdk/aura/sdk/vite plugin versions, React 18 held by documented peer constraints. Small updates (Aura +23 builds, Vite 8.3.8, dev-tool majors) and the low transitive KaTeX advisory are Nice Fix items.
