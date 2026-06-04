# Contributing Guide

This guide defines the Git workflow, branch strategy, pull request rules, and license checks for AegisX.

AegisX is a fork of PentAGI with project-specific changes for beginner-friendly AI-assisted penetration testing and optional Shannon white-box scan integration. Preserve upstream PentAGI attribution and legal notices when changing documentation or code.

## Branch Strategy

Use this branch flow by default:

```text
main <- develop <- docs/* | feature/* | fix/* | chore/*
```

| Branch | Purpose | Rule |
| --- | --- | --- |
| `main` | Stable/default branch | Protected; merge by PR only |
| `develop` | Integration branch for active work | Protected; merge by PR only |
| `feature/*` | New feature work | Branch from `develop` |
| `fix/*` | Bug fixes | Branch from `develop` |
| `docs/*` | Documentation and GitHub community files | Branch from `develop` |
| `chore/*` | Build, CI, dependency, and configuration work | Branch from `develop` |

Branch names must use lowercase English letters, numbers, hyphens, and slashes.

Examples:

```text
feature/simple-mode-risk-cards
fix/shannon-scan-validation
docs/github-community-templates
chore/ci-workflow-hygiene
```

## Standard Workflow

Clone the repository:

```bash
git clone https://github.com/2026OpenSourceSW/AegisX.git
cd AegisX
```

Create work from the latest `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b docs/github-community-templates
```

If `develop` changes while your branch is open, update your branch before review:

```bash
git checkout develop
git pull origin develop
git checkout docs/github-community-templates
git merge develop
```

Commit focused changes:

```bash
git add .
git commit -m "docs: align github community templates"
```

Push and open a pull request:

```bash
git push origin docs/github-community-templates
```

Pull request defaults:

- Base: `develop`
- Compare: your work branch
- One coherent unit per PR
- At least one reviewer approval before merge
- Delete the work branch after merge when it is no longer needed

Promote to `main` only through a separate `develop -> main` PR after the relevant work is verified.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/).

```text
<type>(<scope>): <subject>
```

Common types:

| Type | Use for |
| --- | --- |
| `feat` | New user-visible behavior |
| `fix` | Bug fixes |
| `docs` | Documentation-only changes |
| `style` | Formatting-only changes |
| `refactor` | Behavior-preserving code cleanup |
| `test` | Test changes |
| `chore` | Build, tooling, dependency, or configuration work |

Examples:

```text
feat(frontend): add simple mode risk cards
fix(shannon): require non-production confirmation
docs: align github community templates
chore(ci): separate docker publish target
```

## Pull Request Requirements

Every PR must include:

- Clear problem and solution summary
- Target branch confirmation
- Verification evidence with exact commands or manual QA steps
- Documentation impact
- License and third-party dependency impact
- Security/safety impact for scanning, target handling, authentication, authorization, or external tools

Reviewer checklist:

- The PR targets `develop` unless it is an explicit promotion/release PR.
- The PR is one coherent unit.
- The PR body records verification evidence.
- User-visible behavior has manual QA evidence, not only automated test output.
- Legal attribution for PentAGI, Shannon, and third-party dependencies is preserved.
- Scanning features require authorized targets and non-production confirmation where applicable.

## Branch Protection

`main`:

- Direct push is not allowed.
- Pull request review is required.
- Force push is not allowed.
- Branch deletion is not allowed.

`develop`:

- Direct push is not allowed.
- Pull request review is required.
- Force push is not allowed.
- Branch deletion is not allowed.

Work branches:

- Keep changes focused and reviewable.
- Rebase or merge `develop` before review when needed.
- Delete after merge unless there is an active reason to keep the branch.

## License And Third-Party Checks

AegisX currently inherits upstream PentAGI licensing and attribution. Do not remove or rewrite upstream legal notices casually.

Before adding or changing dependencies, verify license compatibility and update third-party notices when needed.

Generally acceptable licenses:

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- MPL-2.0 when used without modifying MPL-covered source
- 0BSD

Licenses requiring explicit maintainer review:

- GPL
- LGPL
- AGPL
- CC-BY-SA
- Proprietary or commercial licenses

Shannon-related boundary:

- Shannon is AGPL-family software.
- Do not copy Shannon source into this repository without explicit license review.
- Treat Shannon integration as external CLI/Docker-worker execution unless a later legal decision changes that boundary.
- Keep `THIRD_PARTY_NOTICES.md` updated when Shannon integration details change.

Useful checks:

```bash
./scripts/generate-licenses.sh
osv-scanner scan --experimental-licenses="MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,MPL-2.0" backend
osv-scanner scan --experimental-licenses="MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,MPL-2.0" frontend
```

Docker builds currently use upstream PentAGI paths and license output locations in some places. Do not rename those paths or image names in documentation unless the implementation and CI have also changed.

## Questions And Issues

Use GitHub Issues for project discussion and bug reports:

https://github.com/2026OpenSourceSW/AegisX/issues
