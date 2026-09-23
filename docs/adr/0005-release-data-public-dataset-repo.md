# ADR-0005 — Brewery release data in a separate public dataset repository

**Status:** Accepted
**Date:** 2026-09-22

## Context

ADR-0001 makes brewery newsletters one of only two observation sources. They are also the earliest signal of new releases and seasonal windows, which feed the seasonality term (w₃). Newsletters arrive by email, so receiving them means an inbox subscribed to each brewery's list and a credential to read it.

**The tension: an inbox is centralized, and self-hosting is not.** Newsletter intake is inherently one mailbox, subscribed once and read with one credential. The application is open source and runs as many independent deployments. Putting newsletter intake inside the app breaks one side or the other:

- **Each deployment runs its own inbox.** Every self-hoster must subscribe to every brewery list themselves. In practice, deployments end up with no release data.
- **Every deployment reads the maintainer's inbox.** That means distributing the mail credential, which is unacceptable, and every deployment reading one person's mail.

## Decision

Release data is produced once and published as public data.

- A **separate public repository**, not the application repo, holds the release dataset as versioned files.
- A **scheduled GitHub Actions workflow** in that repository reads the maintainer-operated inbox and extracts release facts: brewery, beer, announced date, package, and any outlets the newsletter names. It validates those facts and commits them.
- Only extracted facts are published. Each fact references its source newsletter by brewery and send date. Newsletter prose and images are never republished.
- The application consumes the repository's published files as a **Tier 1 source**, registered in `docs/data-sources.md` like any other. The app never touches the inbox and holds no mail credential. Beyond the `source_type` on the observations it loads, it has no knowledge that newsletters exist.

The dataset repository's name, URL, file schema, and data license are not yet chosen. They go into the source register when they exist, not before.

## Consequences

### What this enables

- Every self-hosted deployment gets release data by reading public files, with no account and no mail credential.
- Centralization is confined to the one step that can't be distributed, receiving email. Everything downstream is a public file history that anyone can fork and audit.
- Every release fact has a commit, a date, and a source reference.

### What this costs

- **A central dependency remains.** If the maintainer stops running the inbox, release data goes stale in every deployment at once. Forking the dataset repo doesn't help without an inbox and the subscriptions behind it. Staleness won't announce itself, so the app's source freshness tests (`pnpm dbt:test`) must catch it.
- **The project's most sensitive secret lives in a public repository.** The mail credential sits in that repo's Actions secrets. Workflow changes there need credential-level review, and the workflow must never run with secrets available on pull requests from forks.
- **We become a data publisher.** Tier 1 means documented and stable (`source-registration` criteria), so the dataset schema becomes a public contract across a repository boundary. A breaking change breaks ingest in every deployment, which forces schema versioning we would otherwise not need.
- **Latency stacks across two schedules.** A release reaches a user only after the dataset workflow's next scheduled run *and* the deployment's own pipeline run.
- **Each newsletter is a source.** Terms review happens when we subscribe to a brewery's list. The dataset repo needs its own register of subscribed newsletters, kept with the same discipline as `docs/data-sources.md`. That is a second register to maintain.
- **Extraction errors are published everywhere.** A mis-parsed release lands in every deployment. Extraction resolves beer and outlet names, which falls inside the identity-resolution risk area CLAUDE.md names, so it needs fixtures with known-correct outputs before it is trusted.

## Alternatives considered

### Newsletter intake inside the app, one inbox per deployment

Every self-hoster would have to reproduce every brewery subscription. Almost none would, so the feature would exist only in the maintainer's deployment.

### A maintainer-hosted API serving release data

This is the same centralization plus a server to keep running, a hosting cost, rate limiting to build, and an uptime that self-hosters would silently depend on. Static files in a public repository have no server to fail, and anyone can mirror them.

### Commit release data into the application repository

Scheduled data commits would churn the code history and tie the data's cadence to code review. Self-hosters would have to pull application changes to get new data. The inbox credential would also sit in the same repository as the application code.
