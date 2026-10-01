#!/usr/bin/env python3
"""Derive stable surrogate keys for the four interim research tables in docs/research/.

Usage:
    python3 scripts/research/build_tables.py              # rewrite docs/research/ in place
    python3 scripts/research/build_tables.py --check      # exit 1 if any file would change
    python3 scripts/research/build_tables.py --dir PATH   # operate on a copy elsewhere

What it does
    Reads dim_brewer.csv, dim_location.csv, bridge_brewer_location.csv and
    fact_newsletter_target.csv. Recomputes every surrogate key from the row's own
    natural key, rewrites every reference to it, validates each table's grain,
    and writes the four files back in the quoting style of docs/research/README.md
    rule 3. Data columns are never changed and rows are never reordered.

        brewer_sk   = md5(brewer_natural_key || '-' || effective_from)
        location_sk = md5(location_natural_key)

    This is exactly dbt_utils.generate_surrogate_key(['brewer_natural_key',
    'effective_from']) and generate_surrogate_key(['location_natural_key']) as
    compiled for Postgres. A key depends on nothing but its own row, so adding,
    removing or reordering other rows never changes it. The keys that were here
    before 2026-09-30 were sequence numbers, and adding one row renumbered 237 of
    253 of them.

    Changing a key column (for example replacing a PLACEHOLDER: effective_from
    with a researched date) changes that row's sk. The script rewrites every
    bridge and fact reference to it in the same run, so fact rows and anything
    entered on them stay attached.

Adding a row
    Put any temporary token in the new dimension row's _sk column. It must not
    already be used in that table. Use the same token wherever a bridge or fact
    row references it, then run this script. The token is replaced with the
    derived key everywhere.

What it does not do
    It does not rebuild the tables from newsletter-targets.csv and
    expired-targets.csv. The researched effective_from dates and the
    identity-matching decisions exist only in these four tables. The generator and
    research results from 2026-09-29 were lost with that session's scratchpad. So
    these four tables are this script's input as well as its output.

Stdlib only.
"""

import argparse
import csv
import hashlib
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_DIR = Path(__file__).resolve().parents[2] / "docs" / "research"

BREWER = "dim_brewer.csv"
LOCATION = "dim_location.csv"
BRIDGE = "bridge_brewer_location.csv"
FACT = "fact_newsletter_target.csv"
TABLES = (BREWER, LOCATION, BRIDGE, FACT)

# dbt_utils.generate_surrogate_key: each field becomes
# coalesce(cast(field as text), '_dbt_utils_surrogate_key_null_'), the fields are
# joined with '-', and the result is md5-hashed to lowercase hex.
DBT_UTILS_NULL = "_dbt_utils_surrogate_key_null_"
DBT_UTILS_DELIMITER = "-"

# docs/research/README.md rule 3: quote any field containing a character outside
# [A-Za-z0-9-], except key values made only of letters, digits, hyphens and underscores.
KEY_COLUMNS = frozenset({"brewer_sk", "location_sk", "brewer_natural_key", "location_natural_key"})
BARE_VALUE = re.compile(r"[A-Za-z0-9-]*")
BARE_KEY_VALUE = re.compile(r"[A-Za-z0-9_-]+")

DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
OPEN_END = "9999-12-31"
UNKNOWN_END = "unknown"
OPERATING_STATUSES = frozenset({"operating", "closed", "moved_out_of_state"})


class BuildError(Exception):
    pass


def surrogate_key(*values):
    """Mirror dbt_utils.generate_surrogate_key. None stands for SQL NULL."""
    text = DBT_UTILS_DELIMITER.join(DBT_UTILS_NULL if v is None else v for v in values)
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def read_table(path):
    with path.open(newline="", encoding="utf-8") as f:
        records = list(csv.reader(f))
    if not records:
        raise BuildError(f"{path.name}: empty file")
    header, body = records[0], records[1:]
    for n, record in enumerate(body, start=1):
        if len(record) != len(header):
            raise BuildError(f"{path.name} data row {n}: {len(record)} fields, header has {len(header)}")
    return header, [dict(zip(header, record)) for record in body]


def format_field(value, column=None):
    if column in KEY_COLUMNS and BARE_KEY_VALUE.fullmatch(value):
        return value
    if BARE_VALUE.fullmatch(value):
        return value
    return '"' + value.replace('"', '""') + '"'


def render(header, rows):
    lines = [",".join(format_field(name) for name in header)]
    for row in rows:
        lines.append(",".join(format_field(row[c], c) for c in header))
    return "\n".join(lines) + "\n"


def require_columns(name, header, columns):
    missing = [c for c in columns if c not in header]
    if missing:
        raise BuildError(f"{name}: missing column(s) {', '.join(missing)}")


def duplicates(values):
    return sorted(k for k, n in Counter(values).items() if n > 1)


def derive(tables):
    """Return (rewritten tables, warnings). Raise BuildError listing every integrity failure."""
    errors, warnings = [], []
    (brewer_h, brewers), (location_h, locations) = tables[BREWER], tables[LOCATION]
    (bridge_h, bridges), (fact_h, facts) = tables[BRIDGE], tables[FACT]
    require_columns(BREWER, brewer_h, ["brewer_sk", "brewer_natural_key", "effective_from", "effective_to", "is_current", "operating_status"])
    require_columns(LOCATION, location_h, ["location_sk", "location_natural_key"])
    require_columns(BRIDGE, bridge_h, ["brewer_sk", "location_sk", "effective_from", "effective_to"])
    require_columns(FACT, fact_h, ["brewer_sk", "brewer_natural_key"])

    # Old sk values are only reference tokens. Map each to the derived key.
    def build_map(name, rows, sk_col, derive_sk, describe):
        mapping = {}
        for n, row in enumerate(rows, start=1):
            token = row[sk_col]
            if not token:
                errors.append(f"{name} data row {n} ({describe(row)}): {sk_col} is blank; give a new row a temporary token")
                continue
            if token in mapping:
                errors.append(f"{name}: {sk_col} token {token!r} used by more than one row")
                continue
            mapping[token] = derive_sk(n, row)
        return mapping

    def brewer_key(n, row):
        nk, start = row["brewer_natural_key"], row["effective_from"]
        if not nk:
            errors.append(f"{BREWER} data row {n}: brewer_natural_key is blank")
        if not DATE.fullmatch(start):
            errors.append(f"{BREWER} data row {n} ({nk}): effective_from {start!r} is not yyyy-mm-dd")
        return surrogate_key(nk, start)

    def location_key(n, row):
        nk = row["location_natural_key"]
        if not nk:
            errors.append(f"{LOCATION} data row {n}: location_natural_key is blank")
        return surrogate_key(nk)

    brewer_map = build_map(BREWER, brewers, "brewer_sk", brewer_key, lambda r: r["brewer_natural_key"])
    location_map = build_map(LOCATION, locations, "location_sk", location_key, lambda r: r["location_natural_key"])

    # Grain uniqueness for the two dimensions.
    for key in duplicates((r["brewer_natural_key"], r["effective_from"]) for r in brewers):
        errors.append(f"{BREWER}: grain violated, (brewer_natural_key, effective_from) {key} repeats")
    for key in duplicates(r["location_natural_key"] for r in locations):
        errors.append(f"{LOCATION}: grain violated, location_natural_key {key!r} repeats")

    def resolve(name, n, column, token, mapping):
        if token not in mapping:
            errors.append(f"{name} data row {n}: {column} {token!r} matches no dimension row")
            return token
        return mapping[token]

    new_brewers = [dict(r, brewer_sk=brewer_map.get(r["brewer_sk"], r["brewer_sk"])) for r in brewers]
    new_locations = [dict(r, location_sk=location_map.get(r["location_sk"], r["location_sk"])) for r in locations]
    new_bridges = [
        dict(
            r,
            brewer_sk=resolve(BRIDGE, n, "brewer_sk", r["brewer_sk"], brewer_map),
            location_sk=resolve(BRIDGE, n, "location_sk", r["location_sk"], location_map),
        )
        for n, r in enumerate(bridges, start=1)
    ]
    new_facts = [
        dict(r, brewer_sk=resolve(FACT, n, "brewer_sk", r["brewer_sk"], brewer_map))
        for n, r in enumerate(facts, start=1)
    ]
    brewer_by_sk = {r["brewer_sk"]: r for r in new_brewers}

    # Bridge: grain uniqueness, date rules, and dim_brewer.effective_from derivation (README rule 4).
    for n, r in enumerate(new_bridges, start=1):
        if not DATE.fullmatch(r["effective_from"]):
            errors.append(f"{BRIDGE} data row {n}: effective_from {r['effective_from']!r} is not yyyy-mm-dd")
        elif DATE.fullmatch(r["effective_to"]) and not r["effective_from"] < r["effective_to"]:
            errors.append(f"{BRIDGE} data row {n}: effective_from {r['effective_from']} is not before effective_to {r['effective_to']}")
    for key in duplicates((r["brewer_sk"], r["location_sk"], r["effective_from"]) for r in new_bridges):
        errors.append(f"{BRIDGE}: grain violated, (brewer_sk, location_sk, effective_from) {key} repeats")
    earliest = defaultdict(list)
    for r in new_bridges:
        earliest[r["brewer_sk"]].append(r["effective_from"])
    for r in new_brewers:
        if r["brewer_sk"] not in earliest:
            errors.append(f"{BREWER}: {r['brewer_natural_key']} {r['effective_from']} has no bridge row")
        elif r["effective_from"] != min(earliest[r["brewer_sk"]]):
            errors.append(
                f"{BREWER}: {r['brewer_natural_key']} effective_from {r['effective_from']} is not the earliest "
                f"bridge effective_from {min(earliest[r['brewer_sk']])} (README rule 4)"
            )
        if DATE.fullmatch(r["effective_to"]) and not r["effective_from"] < r["effective_to"]:
            errors.append(f"{BREWER}: {r['brewer_natural_key']} effective_from {r['effective_from']} is not before effective_to {r['effective_to']}")

    # Fact: brewer_sk resolves, the carried natural key agrees with the dimension, one row per brewer.
    for n, r in enumerate(new_facts, start=1):
        dim = brewer_by_sk.get(r["brewer_sk"])
        if dim and dim["brewer_natural_key"] != r["brewer_natural_key"]:
            errors.append(
                f"{FACT} data row {n}: brewer_natural_key {r['brewer_natural_key']!r} but brewer_sk points at "
                f"{dim['brewer_natural_key']!r}"
            )
    fact_brewers = [brewer_by_sk[r["brewer_sk"]]["brewer_natural_key"] for r in new_facts if r["brewer_sk"] in brewer_by_sk]
    for key in duplicates(fact_brewers):
        errors.append(f"{FACT}: grain violated, brewer {key!r} has more than one row")

    if errors:
        raise BuildError("\n".join(errors))

    # SCD2 rules. Reported, never auto-corrected.
    versions = defaultdict(list)
    for r in new_brewers:
        versions[r["brewer_natural_key"]].append(r)
    # Closed-brewer protocol (ADR-0010): exactly one is_current = true row per brewer, and it
    # is the latest version, whatever its operating_status.
    for nk, rows in sorted(versions.items()):
        latest = max(rows, key=lambda r: r["effective_from"])
        current = [r for r in rows if r["is_current"] == "true"]
        if len(current) != 1:
            errors.append(f"{BREWER}: {nk} has {len(current)} is_current = true rows, expected exactly 1")
        elif current[0] is not latest:
            errors.append(f"{BREWER}: {nk} is_current row is not its latest version")
        for r in rows:
            status = r["operating_status"]
            if status not in OPERATING_STATUSES:
                errors.append(f"{BREWER}: {nk} from {r['effective_from']} has operating_status {status!r}, expected one of {sorted(OPERATING_STATUSES)}")
            elif r is latest and status == "operating" and r["effective_to"] != OPEN_END:
                errors.append(f"{BREWER}: {nk} is operating and current but effective_to is {r['effective_to']!r}, expected {OPEN_END}")
            elif status != "operating" and r["effective_to"] == OPEN_END:
                errors.append(f"{BREWER}: {nk} has operating_status {status!r} but effective_to {OPEN_END}; a closed version needs its closure date or {UNKNOWN_END}")
            elif r is not latest and r["is_current"] == "true":
                errors.append(f"{BREWER}: {nk} version from {r['effective_from']} is is_current but not the latest")
    # SCD2 tests the CSVs cannot carry in a schema.yml (dimensional-grain § Required tests).
    for nk, rows in sorted(versions.items()):
        rows = sorted(rows, key=lambda r: r["effective_from"])
        for r in rows:
            if r["effective_to"] != UNKNOWN_END and not r["effective_from"] < r["effective_to"]:
                errors.append(f"{BREWER}: {nk} version from {r['effective_from']} has effective_to {r['effective_to']} not after it")
        for a, b in zip(rows, rows[1:]):
            if a["effective_to"] == UNKNOWN_END:
                warnings.append(f"{BREWER}: {nk} boundary before {b['effective_from']} unverifiable (effective_to unknown)")
            elif a["effective_to"] == OPEN_END or a["effective_to"] > b["effective_from"]:
                errors.append(f"{BREWER}: {nk} versions overlap at {b['effective_from']}")
            elif a["effective_to"] < b["effective_from"] and a["operating_status"] == "operating":
                errors.append(f"{BREWER}: {nk} gap between {a['effective_to']} and {b['effective_from']} after an operating version; only a closed version may precede a gap")
    # Fact-to-version rule (README rule 7): the fact's brewer_sk is the version valid at its own
    # date. A fact with no added_date can only point at a brewer with a single version, where
    # no date could change the answer.
    for r in new_facts:
        nk = brewer_by_sk[r["brewer_sk"]]["brewer_natural_key"] if r["brewer_sk"] in brewer_by_sk else None
        if nk is None:
            continue
        rows = sorted(versions[nk], key=lambda v: v["effective_from"])
        if not r["added_date"]:
            if len(rows) != 1:
                errors.append(f"{FACT}: {nk} has no added_date but {len(rows)} brewer versions, so its brewer_sk is a guess")
            continue
        valid = [v for v in rows if v["effective_from"] <= r["added_date"] < (OPEN_END if v["effective_to"] == UNKNOWN_END else v["effective_to"])]
        valid = [v for v in valid if v["effective_to"] != UNKNOWN_END] or valid[-1:]
        if not valid or valid[-1]["brewer_sk"] != r["brewer_sk"]:
            errors.append(f"{FACT}: {nk} added {r['added_date']} points at a brewer_sk that is not the version valid on that date")
    if errors:
        raise BuildError("\n".join(errors))
    occupancy = defaultdict(list)
    for r in new_bridges:
        occupancy[(r["brewer_sk"], r["location_sk"])].append(r)
    for rows in occupancy.values():
        rows = sorted(rows, key=lambda r: r["effective_from"])
        for a, b in zip(rows, rows[1:]):
            if a["effective_to"] in (OPEN_END, UNKNOWN_END) or a["effective_to"] > b["effective_from"]:
                warnings.append(f"{BRIDGE}: occupancy intervals may overlap at {b['effective_from']} for {a['brewer_sk']} x {a['location_sk']}")

    rebuilt = {
        BREWER: (brewer_h, new_brewers),
        LOCATION: (location_h, new_locations),
        BRIDGE: (bridge_h, new_bridges),
        FACT: (fact_h, new_facts),
    }
    return rebuilt, warnings


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIR, help="directory holding the four tables")
    parser.add_argument("--check", action="store_true", help="write nothing; exit 1 if any file would change")
    args = parser.parse_args(argv)

    try:
        tables = {name: read_table(args.dir / name) for name in TABLES}
        rebuilt, warnings = derive(tables)
    except (BuildError, OSError) as exc:
        print(f"build_tables: failed\n{exc}", file=sys.stderr)
        return 2

    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)

    changed = []
    for name in TABLES:
        path = args.dir / name
        data = render(*rebuilt[name]).encode("utf-8")
        if path.read_bytes() != data:
            changed.append(name)
            if not args.check:
                path.write_bytes(data)
        print(f"{name}: {len(rebuilt[name][1])} rows, {'changed' if name in changed else 'unchanged'}")

    if args.check and changed:
        print(f"build_tables --check: {len(changed)} file(s) out of date", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
