## Package audit: Asset 360 Investigation Workspace

Reviewed commit: `bbb38ae94412c3cd677c5b6c385076d71f0e829c`. Commands run from the app root (outside the sandbox / with network for registry access): `npm outdated --json`, `npm audit --json`, plus `npm view @cognite/aura dist-tags` and `peerDependencies`. Lockfile `package-lock.json` is present and tracked. Installed versions were confirmed from `node_modules`.

Changes since round 4: none to `package.json` or the lockfile (`git diff ee9d602 HEAD --stat` shows no dependency file). The new `LoadingSkeleton` uses `@cognite/aura/components/skeleton` and `IconChevronRight` from the existing `@tabler/icons-react`.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| `@cognite/app-sdk` | 0.11.50644 | 0.11.50644 (current; not listed by `npm outdated`) | No | 0 | Pass |
| `@cognite/aura` | 1.50644.0 | 1.50667.0 per `npm outdated`; registry `latest` tag now 1.50814.0 | No | 8 low (transitive KaTeX advisory chain) | Pass (patch-level builds behind, same peer range) |
| `@cognite/sdk` | 10.20.0 | 10.20.0 | No | 0 | Pass |
| `@tabler/icons-react` | ^3.35.0 | current | No | 0 | Pass |
| `@tanstack/react-query` | 5.108.3 | current | No | 0 | Pass |
| `react` | 18.3.1 | 19.3.1 | No | 0 | **Justified exception** (peer-pinned, see below) |
| `react-dom` | 18.3.1 | 19.3.1 | No | 0 | **Justified exception** (peer-pinned, see below) |
| `recharts` | 3.11.0 | current | No | 0 | Pass |

### Justified exception: React 18

`npm outdated` reports `react`, `react-dom`, `@types/react`, and `@types/react-dom` one major behind (18 → 19). This is **intentional and not a defect**: both `@cognite/app-sdk` (0.11.50644) and `@cognite/aura` (1.50644.0, and the current registry `latest`) declare `react: ^18.3.1` as their peer dependency, so React 19 would leave the supported range of the host SDK and design system the app must use. `@types/react*` 18 correctly track the runtime. Revisit when those packages publish React 19 peer ranges. This is not counted against criterion 1.3.

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

`npm audit --json`: 8 low, 0 info; all chain back to one transitive advisory.

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| `katex` (via `@streamdown/math`, `@streamdown/mermaid`, `mermaid`, `rehype-katex`, `remark-math`, `micromark-extension-math`, `@cognite/aura`) | low | KaTeX: Existing prototype pollution can bypass trust restrictions | `katex` ≥ 0.18.2 (npm's suggested "fix" is an `@cognite/aura` 0.3.5 downgrade, not applicable) | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) |

The advisory is transitive through Aura's markdown/diagram dependencies; the app does not render user math. No high or critical CVEs; nothing deprecated (spot checks unnecessary — no flagged package beyond the above).

### Bundle health

`npm run build` emits `index` 310.80 kB (96.01 kB gzip), `react-vendor` 139.82 kB, `cognite-sdk` 132.11 kB, and a lazy `NumericChart` chunk 426.33 kB (120.49 kB gzip); no chunk exceeds 500 kB and Vite prints no large-chunk warning. Essentially unchanged from round 4 (main chunk +0.13 kB for the skeleton component).

### Health

**Pass** — 0 critical/high/moderate CVEs, no deprecated packages, current app-sdk/sdk/vite plugin versions, React 18 held by documented peer constraints. Small updates (Aura builds, Vite 8.3.8, dev-tool majors) and the low transitive KaTeX advisory are Nice Fix items.
