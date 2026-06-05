# Saved Replies

These are suggested saved replies for AegisX maintainers. GitHub saved replies are personal account settings, so each maintainer can copy the snippets they use most often from <https://github.com/settings/replies>.

Customize each reply before posting. Add concrete file paths, commands, screenshots, logs, or reviewer names when they are relevant.

## Issue Responses

### Issue: Need More Information (v1)

```text
Thank you for the report. We need a little more information before we can investigate this.

Please add:

1. The affected AegisX area: Simple Mode, Advanced Mode, Shannon integration, frontend, backend/API, Docker/setup, CI/workflows, or documentation.
2. Exact steps to reproduce the issue.
3. Expected behavior and actual behavior.
4. Environment details, including OS, Docker version, deployment method, and enabled integrations.
5. Relevant logs, screenshots, or exported artifacts with sensitive data removed.

After you update the issue, we can triage it against `develop`.
```

### Issue: Cannot Reproduce (v1)

```text
Thank you for the report. I could not reproduce this with the current information.

Please update the issue with:

1. A minimal reproduction path from a clean checkout or deployment.
2. Exact configuration values that affect the behavior, with secrets removed.
3. Logs or screenshots showing the failure.
4. Whether the behavior occurs on `main`, `develop`, or a specific branch.

We can reopen active investigation once the reproduction is clear.
```

### Issue: Expected Behavior (v1)

```text
Thank you for checking this. Based on the current design, this appears to be expected behavior:

[explain the design decision]

If this behavior does not fit your use case, please open or update an enhancement request with the workflow you expected, why it matters, and any safety or license implications.
```

### Issue: Upstream PentAGI Scope (v1)

```text
Thank you for the report. This appears to be about upstream PentAGI behavior that AegisX has not modified.

For upstream-only behavior, please check the PentAGI project. For AegisX-specific behavior, please update this issue with the AegisX change, branch, or workflow that causes the problem.

We will keep this issue focused on AegisX-specific work.
```

### Issue: Security And Authorization Reminder (v1)

```text
Thanks for raising this. AegisX is intended only for authorized security testing.

Please confirm that:

1. You own the target or have written permission to test it.
2. The target is non-production unless a maintainer explicitly approved a production-safe reproduction.
3. Logs and screenshots do not expose secrets, credentials, tokens, private source code, or sensitive target data.

After that confirmation, we can continue triage.
```

### Issue: Duplicate (v1)

```text
Thank you for the report. This appears to duplicate #[issue-number].

Please follow the existing issue for updates. If your case has a different reproduction path or affects a different AegisX area, add those details there so we can keep the discussion together.
```

### Issue: PR Welcome (v1)

```text
Thank you for raising this. A focused PR would be welcome.

Please follow `CONTRIBUTING.md`:

1. Branch from `develop`.
2. Keep the PR to one coherent unit.
3. Include tests or verification evidence.
4. Include manual QA evidence for user-visible behavior.
5. Document security, safety, license, and third-party impacts.

Open the PR against `develop` when ready.
```

## PR Responses

### PR: Ready To Merge (v1)

```text
This PR has the required scope, review, and verification evidence. I am merging it into `develop`.

After merge, please delete the source branch unless follow-up work still depends on it.
```

### PR: Needs Work (v1)

```text
Thank you for the contribution. This needs updates before merge:

[list required changes]

Please update the PR and include the new verification evidence in the PR body.
```

### PR: Missing Template Details (v1)

```text
Thank you for the contribution. Please update the PR body using the repository PR template.

We need:

1. Problem and solution summary.
2. Target branch and scope confirmation.
3. Exact verification commands and results.
4. Manual QA evidence for user-visible behavior, when applicable.
5. Security/safety notes.
6. License and third-party impact notes.

This keeps review consistent with `CONTRIBUTING.md`.
```

### PR: Wrong Base Branch (v1)

```text
Thank you for the contribution. Please retarget this PR to `develop`.

AegisX uses this default flow:

`main <- develop <- docs/* | feature/* | fix/* | chore/*`

Changes reach `main` later through a reviewed `develop -> main` promotion PR.
```

### PR: Needs Issue Link (v1)

```text
Thank you for the contribution. Please link this PR to an issue or explain why an issue is not needed.

Linked issues help us keep design decisions, review history, and follow-up work traceable.
```

### PR: Inactive (v1)

```text
This PR has been inactive for a while.

Please let us know whether you plan to continue. If so, update the branch with the latest `develop` and respond to the open review comments. If not, we can close this PR and reopen the work later when someone is ready to continue.
```

### PR: License Or Third-Party Review Needed (v1)

```text
Thank you for the contribution. This PR changes dependencies, licensing, attribution, or third-party integration behavior, so it needs an explicit review before merge.

Please add:

1. Dependency names and versions.
2. License identifiers.
3. Whether source code was copied into this repository.
4. Whether `licenses/README.md`, `NOTICE`, or generated license reports need updates.
5. Any Shannon or upstream PentAGI attribution impact.
```
