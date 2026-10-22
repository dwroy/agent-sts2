"""External aggregate contract shared by ledger validation and fixed contract fixtures.

Keep fields aligned with agent/src/knowledge/strategy-entries.ts. No game knowledge.
"""
import datetime as dt
import math
import re

EXTERNAL_ONLY_CONFIDENCE_MAX = 0.49
FIELDS = {"type", "source", "url", "version", "dataset_sha256", "downloaded_at", "filters",
          "statistic", "denominator", "interval", "design", "limitations", "license", "ref", "role"}
UNITS = {"runs", "players", "offers", "fights", "rooms", "rewards", "cards"}


def text(value):
    return isinstance(value, str) and bool(value.strip())


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def external(ev):
    return isinstance(ev, dict) and ev.get("type") == "external_aggregate"


def check_external(ev, character):
    problems = []
    required = FIELDS - {"interval", "ref", "role"}
    if set(ev) - FIELDS or required - set(ev):
        problems.append("external_aggregate: missing or unknown fields (run/floor forbidden)")
    if not text(ev.get("source")) or not re.fullmatch(r"external:\S+", ev["source"]):
        problems.append("external_aggregate.source: external:<name>")
    if not text(ev.get("url")) or not re.match(r"https?://[^\s/]+", ev["url"]):
        problems.append("external_aggregate.url: public HTTP(S) URL")
    for key in ("version", "license"):
        if not text(ev.get(key)):
            problems.append(f"external_aggregate.{key}: required text")
    if not isinstance(ev.get("dataset_sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", ev["dataset_sha256"]):
        problems.append("external_aggregate.dataset_sha256: lowercase SHA256")
    try:
        date = ev.get("downloaded_at")
        if not isinstance(date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise ValueError()
        dt.date.fromisoformat(date)
    except ValueError:
        problems.append("external_aggregate.downloaded_at: YYYY-MM-DD")
    f = ev.get("filters")
    if (not isinstance(f, dict) or set(f) != {"character", "ascension", "criteria"}
            or f.get("character") != character or type(f.get("ascension")) is not int
            or not 0 <= f["ascension"] <= 20 or not text(f.get("criteria"))):
        problems.append("external_aggregate.filters: character, ascension 0-20, criteria required")
    s = ev.get("statistic")
    if (not isinstance(s, dict) or set(s) != {"name", "value", "unit"}
            or not text(s.get("name")) or not number(s.get("value")) or not text(s.get("unit"))):
        problems.append("external_aggregate.statistic: name, finite value, unit required")
    d = ev.get("denominator")
    if (not isinstance(d, dict) or set(d) != {"unit", "n"} or not isinstance(d.get("unit"), str) or d["unit"] not in UNITS
            or type(d.get("n")) is not int or not 0 < d["n"] <= 9007199254740991):
        problems.append("external_aggregate.denominator: positive safe integer n and unit required")
    ci = ev.get("interval")
    if "interval" in ev and (not isinstance(ci, dict) or set(ci) != {"low", "high", "method"}
                            or not number(ci.get("low")) or not number(ci.get("high"))
                            or ci["low"] > ci["high"] or not text(ci.get("method"))):
        problems.append("external_aggregate.interval: ordered finite low/high, method required")
    if ev.get("design") != "observational":
        problems.append("external_aggregate.design: observational")
    limits = ev.get("limitations")
    if not isinstance(limits, list) or not limits or not all(text(v) for v in limits):
        problems.append("external_aggregate.limitations: non-empty text list")
    if "ref" in ev and not text(ev["ref"]):
        problems.append("external_aggregate.ref: non-empty text")
    if "role" in ev and ev["role"] not in ("support", "contradict"):
        problems.append("external_aggregate.role: support or contradict (never own repeat)")
    return problems


def check_accounting(evidence, confidence, status):
    """Validate the folded evidence, including previously appended contradictions."""
    if not isinstance(evidence, list):
        return []
    ext = [e for e in evidence if external(e)]
    own = [e for e in evidence if isinstance(e, dict) and not external(e)]
    sources = {e.get("source") for e in ext if isinstance(e.get("source"), str)} | ({"own"} if own else set())
    problems = []
    if status is not None and status not in ("aligned", "conflict", "unassessed"):
        problems.append("evidence_status: aligned, conflict or unassessed")
    if len(sources) > 1 and status is None:
        problems.append("mixed evidence needs evidence_status")
    if confidence is not None and (not number(confidence) or not 0 <= confidence <= 1):
        problems.append("confidence: finite number 0-1")
    if ext:
        if not number(confidence) or not 0 <= confidence <= 1:
            problems.append("external evidence needs confidence 0-1")
        elif not any(e.get("role") != "contradict" for e in own) and confidence > EXTERNAL_ONLY_CONFIDENCE_MAX:
            problems.append("external-only confidence exceeds 0.49")
        if any(e.get("role") == "contradict" for e in evidence if isinstance(e, dict)) and status != "conflict":
            problems.append("contradictory evidence needs conflict status")
    return problems


def summary(evidence):
    own = [e for e in evidence if not external(e) and isinstance(e.get("run"), str)]
    return {"own_runs": len({e["run"] for e in own}),
            "own_support_runs": len({e["run"] for e in own if e.get("role") != "contradict"}),
            "external": [{k: e[k] for k in ("source", "version", "dataset_sha256", "denominator")}
                         for e in evidence if external(e)]}
