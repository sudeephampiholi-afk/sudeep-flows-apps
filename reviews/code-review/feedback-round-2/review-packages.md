## Package audit: Asset 360 Investigation Workspace

Reviewed commit: `bcec39f13e685cad80dcae69e5354860547bf02c`

Commands run from the app root:

- `npm outdated --json`
- `npm audit --json`
- `npm view <flagged-package> deprecated` for the flagged production packages

### Dependencies

Packages absent from `npm outdated --json` are current. Flagged package deprecation checks returned no deprecation notices.

| Package | Used version | Latest | Deprecated | CVEs | Health |
| --- | --- | --- | --- | --- | --- |
| `@cognite/app-sdk` | 0.9.0 | 0.11.50368 | No | none | Warn — more than one pre-1.0 minor behind |
| `@cognite/aura` | 1.50526.0 | 1.50526.0 | No | low transitive KaTeX chain | Pass |
| `@cognite/sdk` | 10.20.0 | 10.20.0 | No | none | Pass |
| `@tabler/icons-react` | 3.52.0 | 3.52.0 | No | none | Pass |
| `@tanstack/react-query` | 5.108.3 | 5.108.3 | No | none | Pass |
| `@tanstack/react-table` | 8.21.3 | 9.3.1 | No | none | Warn — one major behind |
| `@tanstack/react-virtual` | 3.14.28 | 3.14.28 | No | none | Pass |
| `react` | 18.3.1 | 19.3.1 | No | none | Warn — one major behind |
| `react-dom` | 18.3.1 | 19.3.1 | No | none | Warn — one major behind |
| `recharts` | 3.11.0 | 3.11.0 | No | none | Pass |

### Security audit

This is the full dependency-tree audit, not a production-only subset.

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 8 |

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| --- | --- | --- | --- | --- |
| `katex` (transitive through Aura/streamdown and related math packages) | Low | Existing prototype pollution can bypass trust restrictions | `0.18.2` | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) |

The audit reports eight affected package entries because the same low advisory propagates through `@cognite/aura`, `@streamdown/math`, `@streamdown/mermaid`, `mermaid`, `micromark-extension-math`, `rehype-katex`, and `remark-math`. There are no high, moderate, or critical findings.

### Result

Package health is **Warn**: the blocking and moderate vulnerabilities are resolved, while several production dependencies have newer major versions and one low transitive advisory remains to track.
