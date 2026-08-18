# Rollbackable Development Skill

## Purpose

Make application changes in small, verifiable, reversible steps. Treat every deployment as a versioned release that can be tested before wider promotion and reverted without rewriting history.

This skill is intended for development of eB-Lists and similar layered applications, especially when GitHub branches feed Cloudflare deployments.

## Core principles

1. **Never make an irreversible change when a reversible change is available.**
2. **Separate source changes from deployment promotion.** A successful build does not by itself prove that the new version should receive normal traffic.
3. **Keep known-good versions identifiable.** Every testable release should have a commit SHA, deployment/version ID, and test URL recorded when available.
4. **Verify before promoting.** Test the smallest useful surface first, then broader application behavior.
5. **Rollback by selecting a known-good version/revision**, not by improvising a new corrective change under pressure.
6. **Preserve history.** Prefer new commits or revert commits over destructive history rewriting.
7. **One logical change per commit when practical.** This makes diagnosis and rollback precise.

## Standard change loop

### 1. Establish the baseline

Before editing:

- Identify the current branch.
- Identify the commit currently deployed/tested.
- Record the current deployment/version identifier if the platform provides one.
- Confirm the current behavior with a reproducible test.
- Check for unmerged commits before choosing the branch to modify.

### 2. Make one bounded change

- Change only the files required for the stated behavior.
- Do not combine unrelated cleanup with a bug fix.
- Preserve existing interfaces unless the change explicitly requires an interface change.
- Keep layer boundaries explicit: state ownership, UI consumers, persistence, deployment, and infrastructure should not silently acquire each other's responsibilities.

### 3. Commit the change

Use a descriptive commit message that states the behavioral intent, for example:

`Fix auth client ownership`

The commit itself is the source-level rollback point.

### 4. Build and deploy to an isolated target

Prefer a development/feature deployment or version-specific URL. Do not promote a change to production merely because the build succeeded.

A successful deployment should produce an identifiable version/revision. Record it.

### 5. Verify

Verification should proceed from narrow to broad:

1. Build/deployment succeeds.
2. Console/runtime has no new errors.
3. The changed behavior works.
4. Adjacent behavior still works.
5. Authentication/session state works if affected.
6. UI/layout remains intact if affected.

Do not declare success from a build log alone.

### 6. Promote only after verification

When the isolated version is verified, promote it to the next environment. Keep the prior known-good version available.

For production changes, prefer progressive/canary rollout where the platform supports it.

### 7. Roll back when verification fails

If a release is bad:

- Stop further promotion.
- Identify the last known-good version.
- Route traffic back to that version/revision using the platform's rollback mechanism.
- Verify the rollback.
- Only then investigate and create the corrective change.

Do not stack emergency fixes onto an unverified deployment if a known-good version can be restored first.

## Git rollback rules

### Preferred

- Revert a bad commit with a new commit.
- Reset deployment traffic to a known-good deployed version.
- Keep the faulty commit available for diagnosis.

### Avoid

- Force-pushing shared branches to erase evidence.
- Editing production directly without a corresponding source commit.
- Deleting the only known-good deployment/version.
- Treating a deployment failure as proof that the source change is wrong; first distinguish build, routing, runtime, and configuration failures.

## Deployment state model

Track these as separate concepts:

```text
Source commit
     |
     v
Build artifact/version
     |
     v
Deployed test version
     |
     v
Verified release
     |
     v
Promoted traffic
```

A failure at one layer does not automatically imply failure at another.

## Evidence-first debugging

For each failure, record:

- observed symptom
- exact error/message
- source file and line when available
- deployment/version identifier
- branch and commit
- reproduction steps
- evidence that rules out competing explanations

Do not treat speculation as equivalent to observed evidence.

## Rollback record

For every production promotion, maintain enough information to answer:

- What commit was deployed?
- What version/revision was created?
- What version was known-good immediately before it?
- Where can each version be tested?
- What test established that the new version was safe?
- What exact action restores the previous version?

## Branch policy

- Feature branches are for bounded changes and isolated verification.
- `dev` is an integration environment, not a dumping ground for unverified fixes.
- Production receives changes only after verification in the appropriate pre-production environment.
- If a newer branch contains unmerged work, do not patch an older branch merely because its deployment is currently visible. First determine branch ancestry and intended merge direction.

## Cloud deployment policy

When using Cloudflare Workers or another versioned deployment platform:

- Treat `versions upload` and traffic promotion as separate operations.
- Record the Worker Version ID and preview/test URL.
- Verify the version-specific deployment before promotion when possible.
- Do not assume an upload means the normal route is serving the uploaded version.
- If the platform provides a first-class rollback/version promotion mechanism, use it instead of reconstructing the previous state manually.

## Definition of done

A change is done only when:

- source is committed;
- the intended environment is deployed;
- the deployed version is identifiable;
- the changed behavior is verified;
- important adjacent behavior is verified;
- no unexpected runtime errors remain;
- the previous known-good release remains recoverable;
- and promotion/rollback steps are understood.

## Why this pattern

Google's deployment documentation recommends separating deployment from promotion, verifying deployments, and using progressive strategies where appropriate. Google also documents explicit rollback to prior successful revisions/releases. This skill applies those principles at the application/repository level so that Git commits, feature deployments, and production traffic remain independently recoverable.
