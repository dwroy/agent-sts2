"""Project reviewed #24 aggregate Git blobs into a read-only tool dataset.

No downloads, database access, run identifiers, player identifiers or own records.
The pinned ref makes regeneration independent of sparse-checkout materialization.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess

BASE_REF = "04340d95fcad838801d11750e1982c960f8b0d16"
STATS = "paper/materials/2026-10-21-sts2fun-stats/"
COMBAT = "paper/materials/2026-10-21-sts2fun-combat-diagnostic/"
ROOT = Path(__file__).resolve().parents[2]


def build(ref=BASE_REF):
    inputs = {}

    def blob(path):
        raw = subprocess.check_output(["git", "show", f"{ref}:{path}"], cwd=ROOT)
        inputs[path] = hashlib.sha256(raw).hexdigest()
        return raw

    def document(path):
        return json.loads(blob(path))

    def value(text):
        if text == "":
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text

    def rows(path):
        return [{k: value(v) for k, v in r.items()}
                for r in csv.DictReader(io.StringIO(blob(path).decode()))]

    provenance = document(STATS + "provenance.json")
    summary = document(STATS + "summary.json")
    tables = {
        "card": rows(STATS + "card_choices.csv"),
        "skip": rows(STATS + "skip_rates.csv"),
        "deck_size": rows(STATS + "deck_sizes.csv"),
        "clusters": [dict(version="v0.111", **r) for r in rows(STATS + "clusters.csv")],
        "cooccurrence": [dict(version="v0.111", **r) for r in rows(STATS + "cooccurrence.csv")],
    }
    # Keep only external encounter rows and their external metric columns.
    combat_fields = ["version", "act", "kind", "encounter_id", "fights",
                     "independent_runs", "independent_players", "sl_policy"]
    for metric in ["gross_damage", "turns", "death"]:
        combat_fields += [metric + "_" + suffix for suffix in [
            "n", "unknown", "independent_runs", "independent_units", "mean",
            "p25", "median", "p75", "p90"]]
    combat_fields += ["turns_cluster_ci", "death_events", "death_cluster_ci"]
    tables["encounter"] = [{key: r[key] for key in combat_fields}
                           for r in rows(COMBAT + "combat_distribution.csv")
                           if r["source"] == "external" and r["scope"] == "encounter"]
    cohorts = {r["version"]: dict(runs=r["n"], players=r["players"], wins=r["wins"],
                                      builds=summary["builds"][r["version"]])
               for r in summary["cohorts"] if r["version"] in summary["builds"]}
    result = dict(schema_version=1, source="external:sts2fun", character="silent", ascension=10,
                  provenance={k: provenance[k] for k in [
                      "url", "faq", "downloaded_at", "compressed_sha256", "database_sha256",
                      "compressed_hash_basis", "license", "filter"]},
                  cohorts=cohorts, input_sha256=inputs,
                  tables={key: dict(columns=list(records[0]),
                                    rows=[list(r.values()) for r in records])
                          for key, records in tables.items()})
    return (json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default=BASE_REF)
    parser.add_argument("--out", type=Path, default=ROOT / "knowledge/external/sts2fun/silent-a10.json")
    parser.add_argument("--check", action="store_true", help="Verify byte-identical regeneration without writing")
    args = parser.parse_args()
    output = build(args.ref)
    if args.check:
        if args.out.read_bytes() != output:
            raise SystemExit("Aggregate projection differs from pinned Git inputs")
    else:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_bytes(output)
    print(json.dumps(dict(bytes=len(output), sha256=hashlib.sha256(output).hexdigest())))
