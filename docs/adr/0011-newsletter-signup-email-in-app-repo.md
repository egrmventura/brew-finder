# ADR-0011 — Newsletter signup addresses live in the app repo, not the inbox-reading boundary

**Status:** Accepted
**Date:** 2026-09-30

## Context

ADR-0005 draws a boundary around newsletter *intake*: a single maintainer-
operated inbox, read only by a scheduled workflow in a separate public
dataset repository, using a mail credential that never touches the
application. The application "never touches the inbox and holds no mail
credential" and, beyond a `source_type` tag on the facts it consumes, "has no
knowledge that newsletters exist."

Separately, during the 2026-09-29 research-restructure session
(`docs/handoffs/2026-09-29-research-restructure.md`), a blank `email` column
was added to `docs/research/fact_newsletter_target.csv` — a table in *this*
app repo — at the user's request, intended to eventually hold the address
used to subscribe to each tracked brewery's newsletter. `docs/research/
README.md` notes that neither of the two source CSVs it was built from has
such a column, and that none may be added with guessed values; the column
was added empty and stays empty until real values are researched or
supplied. The handoff note flagged this as apparently conflicting with
ADR-0005 and as warranting its own ADR, which was not written at the time.

The apparent conflict: ADR-0005 says the app repo holds no email-related
credential and no newsletter knowledge beyond a source tag. A column
intended to hold newsletter email addresses, sitting in this repo, looks at
first glance like exactly the thing ADR-0005 says shouldn't be here.

Two things needed resolving before this could be written up, and neither is
answerable from the code or the existing ADRs:

1. Whether committing real subscription email addresses into this repo's
   public git history is acceptable at all.
2. Whether, if acceptable, this column belongs in the app repo or in the
   ADR-0005 dataset repo instead.

Both were put to the user directly rather than assumed, per CLAUDE.md
constraint 7. The answers: real addresses in this repo's public git history
are acceptable, and the column stays in the app repo.

## Decision

`fact_newsletter_target.email` is a **different concern from the ADR-0005
inbox-reading boundary**, and stays in this app repo.

- ADR-0005's boundary is about **reading mail**: the inbox, the credential
  to access it, and the workflow that turns received newsletters into
  release facts. All of that remains confined to the separate dataset repo,
  unchanged by this decision.
- `fact_newsletter_target.email` is the **address used to subscribe to** a
  brewery's public mailing list — the outbound signup address a human (or a
  future signup script) would give to the brewery, not a credential for
  reading anything back. It carries no read access to any inbox and is not
  the mail credential ADR-0005 keeps out of this repo. A brewery's mailing
  list is typically opt-in via a public signup form; the address recorded
  here is whatever address was or will be used for that signup, which is
  research/tracking metadata about *how we intend to receive* newsletters,
  not the intake mechanism itself.
- Real subscription addresses may be committed to this repo's git history in
  plain form. They are not treated as secrets: they identify a mailing-list
  subscription, not an inbox credential, and the repo's MIT license and
  public nature don't change that classification.
- The column stays in the app repo (`docs/research/fact_newsletter_target.csv`),
  not the ADR-0005 dataset repo, because it belongs to the *tracking-list*
  concern — which breweries we intend to subscribe to and under what address
  — not to the *extraction pipeline* concern the dataset repo owns. The two
  repos can reference the same brewery without sharing this table.

## Consequences

### What this enables

- The research/tracking tables in this repo can record a complete signup
  plan (which breweries, which address, which status) without waiting on or
  coordinating with the separate dataset repo's schema or release cycle.
- ADR-0005's boundary stays exactly as narrow as originally scoped: no
  inbox credential, no inbox access, no read-side newsletter logic enters
  this repo. This ADR doesn't loosen that boundary; it clarifies that this
  column was never inside it.

### What this costs

- **Real email addresses become permanent, public git history** the moment
  they're committed — git history is not truly deletable in a forked,
  public repo. If a subscription address later needs to be rotated or
  withdrawn for a reason not anticipated here (e.g., a brewery objects, or
  an address was mistakenly personal rather than list-specific), the old
  value remains visible in history indefinitely; only the current file
  content can be corrected going forward.
- **The two repos now both carry newsletter-adjacent data with no shared
  schema or cross-reference**, since this table intentionally does not move
  to the dataset repo. Someone auditing "everything related to newsletter
  X" has to check both repos, and nothing enforces that a brewery tracked
  here for subscription also has (or lacks) a corresponding source
  registration in the other repo.
- This decision does not, by itself, make it safe to fill the column with
  guessed or scraped addresses — `docs/research/README.md`'s rule that no
  email may be added without a real, sourced value still applies. This ADR
  answers *where addresses may live and how they're classified*, not
  *where they come from*.

## Alternatives considered

### Treat any newsletter-related email field as covered by ADR-0005's boundary

Rejected because it conflates two distinct capabilities — the ability to
*receive and read* mail (what ADR-0005 restricts) and the address used to
*request* being added to a public mailing list (what this column records).
Applying ADR-0005's restriction here would mean the app repo could never
record which address to use when subscribing to a brewery's list, blocking
the tracking table's actual purpose without protecting anything ADR-0005
was written to protect.

### Move `fact_newsletter_target.csv` (or just its `email` column) to the ADR-0005 dataset repo

Considered and rejected by the user: the dataset repo's purpose is the
release-extraction pipeline against the maintainer's inbox, not brewery
tracking-list management. Moving this table there would tie the tracking
list's cadence and access to that repo's release-focused workflow, for a
table that has nothing to do with reading mail.

### Do not store real addresses in git history; keep the column but leave it always blank or externalize it

Considered and rejected by the user: the addresses are subscription-signup
addresses, not credentials, so the plain-text public-history risk profile
here is treated the same as any other public contact address already
tracked in these tables (e.g. `website`).

