"""Content-addressed, local-only provenance. Never fetches a URL or reads a supplied file path."""
import argparse
import hashlib
import ipaddress
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

SCHEMA = "public-web-sources-v1"
FIELDS = {"url", "acquired_at", "game_version", "character", "ascension", "sample", "license", "limitations",
          "summary", "status", "native_call_id"}


def packed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def public_url(value):
    url = urlsplit(value)
    host = url.hostname or ""
    if (url.scheme != "https" or not host or url.username or url.password or url.fragment
            or url.port not in (None, 443) or "." not in host or host.endswith((".local", ".internal", ".localhost"))
            or re.search(r"(?:token|key|auth|password|secret|session|signature)=", url.query, re.I)):
        raise ValueError("source must be a credential-free public HTTPS URL")
    try:
        address = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise ValueError("private address is not a public source")
    return value


def validate(value):
    if not isinstance(value, dict) or set(value) != FIELDS:
        raise ValueError("source fields mismatch")
    if value["url"] is not None:
        public_url(value["url"])
    if value["status"] not in ("read", "cached", "failed", "empty") or (value["status"] in ("read", "cached") and not value["url"]):
        raise ValueError("invalid source status/URL")
    if value["status"] == "read" and not value["native_call_id"]:
        raise ValueError("read source requires a native call id; cached sources remain separate")
    if value["native_call_id"] is not None and not re.fullmatch(r"[A-Za-z0-9_:-]{1,160}", value["native_call_id"]):
        raise ValueError("invalid native call identity")
    if not isinstance(value["acquired_at"], str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)", value["acquired_at"]):
        raise ValueError("acquired_at must include timezone")
    from datetime import datetime
    datetime.fromisoformat(value["acquired_at"].replace("Z", "+00:00"))
    if value["character"] not in ("silent", "unknown") or (value["ascension"] is not None and (type(value["ascension"]) is not int or not 0 <= value["ascension"] <= 20)):
        raise ValueError("invalid character/ascension")
    sample = value["sample"]
    if not isinstance(sample, dict) or set(sample) != {"runs", "players"} or any(v is not None and (type(v) is not int or v < 0) for v in sample.values()):
        raise ValueError("sample counts must be observed integers or null")
    for key in ("game_version", "license", "limitations", "summary"):
        if not isinstance(value[key], str) or not value[key].strip() or len(value[key]) > 200_000:
            raise ValueError("missing/big source text: " + key)
    return value


def directory(scratch):
    path = Path(scratch)
    if not path.is_absolute() or path.is_symlink() or not path.is_dir() or path.resolve() != path:
        raise ValueError("scratch must be an existing canonical directory")
    return path


def checked_file(path, limit=8 * 1024 * 1024):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > limit:
        raise ValueError("invalid provenance file")
    return path.read_bytes()


def record(scratch, batch, value):
    value = validate(value)
    root = directory(scratch)
    if not re.fullmatch(r"[0-9]{8}-[0-9]{6}(?:-s2)?-strategy-proposal", batch):
        raise ValueError("invalid original batch")
    path = root / "public-web-sources.json"
    body = json.loads(checked_file(path)) if path.exists() else {"schema": SCHEMA, "batch": batch, "sources": []}
    verify_body(body, batch)
    # Date/call retries never multiply the same URL/content/status into independent evidence.
    identity = sha(packed({k: v for k, v in value.items() if k not in ("acquired_at", "native_call_id")}).encode())
    old = next((row for row in body["sources"] if row["id"] == identity), None)
    if old:
        return old["id"]
    row = {**value, "id": identity, "source": "external:public-web", "summary_sha256": sha(value["summary"].encode())}
    body["sources"].append(row)
    verify_body(body, batch)
    # Original single learner owns this scratch; exclusive snapshots retain every intermediate input.
    raw = packed(body).encode()
    snapshot = root / ("public-web-sources-" + sha(raw) + ".json")
    if not snapshot.exists():
        with snapshot.open("xb") as out:
            out.write(raw)
    if checked_file(snapshot) != raw:
        raise ValueError("source snapshot conflict")
    temporary = root / "public-web-sources.tmp"
    with temporary.open("x") as out:
        out.write(raw.decode())
    temporary.replace(path)
    return identity


def verify_body(body, batch):
    if not isinstance(body, dict) or set(body) != {"schema", "batch", "sources"} or body["schema"] != SCHEMA or body["batch"] != batch or not isinstance(body["sources"], list):
        raise ValueError("source manifest binding mismatch")
    seen = set()
    for row in body["sources"]:
        validate({key: row[key] for key in FIELDS})
        identity = sha(packed({k: row[k] for k in FIELDS if k not in ("acquired_at", "native_call_id")}).encode())
        if (set(row) != FIELDS | {"id", "source", "summary_sha256"} or row["source"] != "external:public-web"
                or row["id"] != identity or row["id"] in seen
                or row["summary_sha256"] != sha(row["summary"].encode())):
            raise ValueError("invalid source hash/identity")
        seen.add(row["id"])


def verify(scratch, batch):
    root = directory(scratch)
    raw = checked_file(root / "public-web-sources.json")
    body = json.loads(raw)
    verify_body(body, batch)
    if checked_file(root / ("public-web-sources-" + sha(raw) + ".json")) != raw:
        raise ValueError("missing immutable source snapshot")
    return {"sha256": sha(raw), "sources": len(body["sources"]), "usable": sum(row["status"] in ("read", "cached") for row in body["sources"])}


if __name__ == "__main__":
    import sys
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("record", "verify"))
    parser.add_argument("--scratch", required=True)
    parser.add_argument("--batch", required=True)
    args = parser.parse_args()
    try:
        if args.command == "record":
            print(record(args.scratch, args.batch, json.loads(sys.stdin.read(256 * 1024))))
        else:
            print(packed(verify(args.scratch, args.batch)), end="")
    except (OSError, ValueError, KeyError, TypeError):
        raise SystemExit("invalid public source provenance; original artifacts retained")
