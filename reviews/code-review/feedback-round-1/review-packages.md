## Package audit: Asset 360 Investigation Workspace

Reviewed commit: `2e4bb7b2ab7230c68d541888285f5c2c999528d8`

Commands run from the repository root:

- `npm outdated --json`
- `npm audit --json`
- `npm audit --omit=dev --json` (scope clarification; it does not replace the required full audit)

Lockfile: `package-lock.json` is present.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| --- | --- | --- | --- | --- | --- |
| `@cognite/app-sdk` | 0.9.0 | 0.11.50368 | No | 0 | Pass |
| `@cognite/aura` | ^1.50526.0 | Current | No | 8 low transitive package findings in production audit | Pass |
| `@cognite/sdk` | ^10.10.0 | Current | No flagged reason to query | 0 | Pass |
| `@tabler/icons-react` | ^3.35.0 | Current | No flagged reason to query | 0 | Pass |
| `@tanstack/react-query` | ^5.108.3 | Current | No flagged reason to query | 0 | Pass |
| `@tanstack/react-table` | 8.21.3 | 9.3.1 | No | 0 | Warn |
| `@tanstack/react-virtual` | ^3.14.28 | Current | No flagged reason to query | 0 | Pass |
| `react` | 18.3.1 | 19.3.1 | No | 0 | Warn |
| `react-dom` | 18.3.1 | 19.3.1 | No | 0 | Warn |
| `recharts` | ^3.11.0 | Current | No flagged reason to query | 0 | Pass |

`npm outdated` also reported development major updates for ESLint 10, TypeScript 7, Vite 8, Vitest 5, and related tooling. No queried flagged package returned a deprecation message.

### Security audit — full dependency tree

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 1 |
| Moderate | 4 |
| Low | 8 |

The counts are affected-package entries from npm's audit metadata (13 total), not a count of unique advisory IDs.

#### Vulnerabilities

| Package | Scope | Severity | Title | Patched in | Advisory |
| --- | --- | --- | --- | --- | --- |
| `happy-dom` | Development | High | Incomplete fix: unsanitized import alias can lead to host code execution | `>21.0.3` | [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) |
| `happy-dom` | Development | High | SSRF through iframe and link stylesheet parsing | `>20.14.6` | [GHSA-c8p4-j97h-3vg8](https://github.com/advisories/GHSA-c8p4-j97h-3vg8) |
| `@vitest/mocker` / `vitest` | Development | Moderate | Path traversal / arbitrary file read through redirect mock | `>=4.1.11` | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) |
| `@vitest/mocker` | Development | Moderate | Code injection through unauthenticated manual mock registration | `>=4.1.12` | [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) |
| `katex` through Aura/streamdown/mermaid | Production transitive | Low | Existing prototype pollution can bypass trust restrictions | `>=0.18.2` | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) |

Affected wrapper packages in npm's full report are `@vitest/coverage-v8`, `@vitest/ui`, `vitest`, `@cognite/aura`, `@streamdown/math`, `@streamdown/mermaid`, `mermaid`, `micromark-extension-math`, `rehype-katex`, and `remark-math`.

### Security audit — production-only clarification

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 8 |

The production-only result confirms that the high and moderate findings are in development tooling. The current `flows-review-checks` bar nevertheless says a high or critical CVE from the required `npm audit --json` run is Must Fix and does not define a development-only exemption, so package health is **Fail** for this round.
