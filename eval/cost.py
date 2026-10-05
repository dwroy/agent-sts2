#!/usr/bin/env python3
"""Stream component token/cost records at fixed byte cuts, without reading auth or .env.

Codex input includes cache, output includes reasoning; SummaryTracker input excludes cache.
Missing prices/quota stay null. Subscription allocation is an estimate for a shared account.
"""
import argparse
import collections
import csv
import datetime as dt
import json
import itertools
import pathlib

FIELDS = ("input_tokens", "cache_hit_tokens", "cache_write_tokens", "output_tokens", "reasoning_tokens", "total_tokens")


def time(value):
    try:
        t = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return t.replace(tzinfo=dt.timezone.utc) if t.tzinfo is None else t.astimezone(dt.timezone.utc)
    except (ValueError, TypeError):
        return None


def num(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value < float("inf") else 0


def tokens(raw, exclusive=False, creation_extra=False):
    raw = raw or {}
    def pick(*names):
        return next((num(raw[n]) for n in names if n in raw), 0)
    inp = pick("input", "input_tokens", "inputTokens")
    cached = pick("cacheRead", "cached_input_tokens", "cache_hit_tokens", "cacheHitTokens", "cache_read_input_tokens")
    create = pick("cacheCreation", "cache_write_input_tokens", "cacheWriteTokens", "cache_creation_input_tokens")
    out = pick("output", "output_tokens", "outputTokens")
    reasoning = pick("reasoning", "reasoning_output_tokens", "reasoning_tokens", "reasoningTokens")
    if exclusive:
        inp += cached
    # Claude reports cache creation as a disjoint input bucket; Codex already includes it in input.
    if creation_extra:
        inp += create
    return dict(zip(FIELDS, (inp, min(cached, inp), create, out, min(reasoning, out), inp + out)))


class Sources:
    def __init__(self):
        self.cuts = {}
        self.bad_lines = collections.Counter()

    def rows(self, path):
        path = pathlib.Path(path)
        if not path.is_file():
            self.cuts[str(path)] = None
            return
        limit = self.cuts.setdefault(str(path), path.stat().st_size)
        with path.open("rb") as handle:
            read = 0
            for line in handle:
                read += len(line)
                if read > limit or not line.endswith(b"\n"):
                    break
                try:
                    row = json.loads(line)
                    if isinstance(row, dict):
                        yield row
                except (ValueError, UnicodeError):
                    self.bad_lines[str(path)] += 1


def cumulative_events(rows):
    """Session-wide counters: repeated/older snapshots cannot move the watermark backwards."""
    previous = dict.fromkeys(FIELDS, 0)
    for row in rows:
        payload = row.get("payload") or {}
        raw = (payload.get("info") or {}).get("total_token_usage")
        if payload.get("type") != "token_count" or not isinstance(raw, dict):
            continue
        current = tokens(raw)
        delta = {k: max(0, current[k] - previous[k]) for k in FIELDS}
        previous = {k: max(previous[k], current[k]) for k in FIELDS}
        delta["total_tokens"] = delta["input_tokens"] + delta["output_tokens"]
        if delta["total_tokens"]:
            yield row.get("timestamp") or row.get("ts"), delta


def quota_periods(rows, config):
    periods = {}
    for row in rows:
        provider = row.get("provider")
        observed, captured = time(row.get("sample_observed_at")), time(row.get("captured_at"))
        if provider not in config["subscriptions"] or row.get("freshness") != "fresh" or not observed or not captured:
            continue
        if not 0 <= (captured - observed).total_seconds() <= 600:
            continue
        windows = [w for w in row.get("windows", []) if w.get("window_minutes") == 10080 and not w.get("stale")]
        # Overlapping account constraints are not additive costs; prefer the shared provider bucket.
        windows.sort(key=lambda w: (not str(w.get("bucket", "")).startswith(provider + "/"), str(w.get("bucket", ""))))
        if not windows:
            continue
        w = windows[0]
        reset, percent = time(w.get("resets_at")), w.get("used_percent")
        if not reset or reset <= observed or not isinstance(percent, (int, float)) or not 0 <= percent <= 100:
            continue
        key = (provider, reset.isoformat())
        if key not in periods or observed >= periods[key]["observed"]:
            periods[key] = {"provider": provider, "start": reset - dt.timedelta(days=7), "reset": reset,
                            "observed": observed, "used_percent": percent,
                            "usd": percent / 100 * config["subscriptions"][provider]["monthly_usd"] * 12 / 52}
    return list(periods.values())


def collect(root, config, claude_dir=None, codex_home=None):
    root, sources = pathlib.Path(root), Sources()
    runs = {r["run_id"]: r for r in sources.rows(root / "logs/runs.jsonl") if r.get("run_id")}
    starts = {}
    for r in sources.rows(root / "logs/run-config.jsonl"):
        rid, t = r.get("run_id"), time(r.get("ts"))
        if rid and t and (rid not in starts or t < starts[rid]):
            starts[rid] = t
    intervals = sorted((start, time(runs[rid].get("ended")), rid) for rid, start in starts.items() if rid in runs)
    events, seen = [], set()

    def add(component, provider, when, usage, rid=None, targets=None, character=None, batch="", calls=1, ms=0, cost=None, known=True, identity=None):
        if identity is not None:
            if identity in seen:
                return
            seen.add(identity)
        when = time(when)
        if not targets:
            if not rid and when and not component.startswith("learner:"):
                rid = next((r for start, end, r in reversed(intervals) if start <= when and end and when <= end), None)
            targets = [rid] if rid else [None]
        targets = list(dict.fromkeys(targets))
        for target in targets:
            run = runs.get(target, {})
            events.append({"component": component, "provider": provider, "run": target or "unattributed", "batch": batch,
                           "character": str(run.get("character") or character or "unattributed").lower(), "ascension": run.get("ascension"),
                           "ts": when, "calls": calls / len(targets), "latency_ms": num(ms) / len(targets),
                           **{k: usage.get(k, 0) / len(targets) for k in FIELDS}, "api_usd": None if cost is None else cost / len(targets),
                           "subscription_usd": None, "usage_recorded": known})

    traced = set()
    for r in sources.rows(root / "logs/codex-calls.jsonl"):
        qid = r.get("question_id")
        recorded = isinstance(r.get("usage"), dict)
        if recorded:
            traced.add((r.get("run_id"), qid))
        # Failed attempts still consumed wall time; their absent token usage is unknown, not an absent call.
        add("brain:codex", "codex", r.get("ts"), tokens(r.get("usage")), rid=r.get("run_id"), ms=r.get("call_ms", r.get("ms")),
            known=recorded, identity=("codex-call", r.get("ts"), qid, r.get("attempt"), r.get("thread_id")))
    for r in sources.rows(root / "logs/brain.jsonl"):
        engine = str(r.get("engine", "unknown")).lower()
        if engine == "codex" and (r.get("run_id"), r.get("question_id")) in traced:
            continue
        provider = "codex" if engine == "codex" else "deepseek" if "deepseek" in engine else "unknown"
        usage, cost = tokens(r.get("usage")), None
        price = config["api"].get(provider)
        if price and r.get("usage"):
            cost = ((usage["input_tokens"] - usage["cache_hit_tokens"]) * price["input_miss_per_million"] +
                    usage["cache_hit_tokens"] * price["input_hit_per_million"] + usage["output_tokens"] * price["output_per_million"]) / 1e6
        add("brain:" + provider, provider, r.get("ts"), usage, rid=r.get("run_id"), ms=r.get("latency_ms"), cost=cost,
            known=bool(r.get("usage")), identity=("brain", r.get("ts"), r.get("question_id"), engine))
    for rid, r in runs.items():
        total, price = num(r.get("tokens")), config["api"]["jev"]["total_per_million"]
        add("combat:jev", "jev", r.get("ended"), {"total_tokens": total}, rid=rid, calls=num(r.get("jev_calls")),
            cost=None if price is None else total * price / 1e6, known="tokens" in r)

    home = pathlib.Path(codex_home) if codex_home else pathlib.Path.home() / ".codex"
    rollouts = list((home / "sessions").glob("*/*/*/rollout-*.jsonl"))
    archives = list((root / "paper/materials/session/codex").glob("**/*.jsonl"))
    def session_file(session):
        return next((p for p in rollouts + archives if p.name.endswith(session + ".jsonl")), None)
    counted = set()
    for path in sorted((root / "learner/runs").glob("*.jsonl")):
        launch = summary = None
        for r in sources.rows(path):
            if r.get("type") == "learner_launch":
                launch = r
            elif r.get("type") == "learner_summary":
                summary = r
        if not launch or not summary:
            continue
        s, params = summary.get("summary") or {}, launch.get("params") or {}
        session = s.get("sessionId") or path.name
        if session in counted:
            continue
        counted.add(session)
        targets = [rid for rid in str(params.get("runs", params.get("run", ""))).split(",") if rid in runs]
        provider = s.get("engine", launch.get("engine", "codex"))
        path_for_session = session_file(session) if provider == "codex" else None
        increments = list(cumulative_events(sources.rows(path_for_session))) if path_for_session else []
        common = {"targets": targets, "character": params.get("character"), "batch": path.stem}
        component = "learner:" + str(launch.get("task", "unknown"))
        if increments:
            for when, usage in increments:
                add(component, provider, when, usage, calls=1, **common)
            add(component, provider, summary.get("ts"), {}, calls=0, ms=summary.get("wall_ms"), **common)
        else:
            add(component, provider, summary.get("ts"), tokens(s.get("tokens"), exclusive=True, creation_extra=provider == "claude"),
                calls=num(s.get("turns")), ms=summary.get("wall_ms"), known=bool(s.get("tokens")), **common)

    wakes = collections.defaultdict(list)
    wake_seen = set()
    wake_paths = sorted((root / "ops/codex-ops").glob("wakes*.jsonl"))
    if not wake_paths:
        sources.cuts[str(root / "ops/codex-ops/wakes*.jsonl")] = None
    for wake_path in wake_paths:
        for r in sources.rows(wake_path):
            identity = (r.get("session"), r.get("ts"), r.get("wall_ms"))
            if r.get("session") and identity not in wake_seen:
                wake_seen.add(identity)
                wakes[r["session"]].append(r)
    for session, rows in wakes.items():
        rows.sort(key=lambda r: time(r.get("ts")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc))
        path = session_file(session)
        if path:
            for when, usage in cumulative_events(sources.rows(path)):
                add("ops:codex", "codex", when, usage, calls=1)
            for wake in rows:
                add("ops:codex", "codex", wake.get("ts"), {}, calls=0, ms=wake.get("wall_ms"))
        else:
            last = rows[-1]
            add("ops:codex", "codex", last.get("ts"), tokens(last.get("tokens"), exclusive=True), calls=len(rows),
                ms=sum(num(w.get("wall_ms")) for w in rows), known=False)

    observer = pathlib.Path(claude_dir) if claude_dir else pathlib.Path.home() / ".claude/projects/-home-dw-Projects-agent-sts2"
    messages = {}
    observer_files = sorted(observer.glob("*.jsonl"))
    if not observer_files:
        sources.cuts[str(observer / "*.jsonl")] = None
    for path in observer_files:
        for r in sources.rows(path):
            m = r.get("message") or {}
            if r.get("type") == "assistant" and isinstance(m.get("usage"), dict):
                identity = (r.get("requestId"), m.get("id") or r.get("uuid"))
                if any(identity):
                    messages[identity] = r
    for r in messages.values():
        add("observer:claude", "claude", r.get("timestamp"), tokens(r["message"]["usage"], exclusive=True, creation_extra=True))
    # Preserve the earlier append-only history while the scheduler writes the canonical log.
    periods = quota_periods(itertools.chain(sources.rows(root / "logs/subscription-usage-snapshots.jsonl"),
                                          sources.rows(root / "logs/codex-usage.jsonl")), config)
    for p in periods:
        matching = [e for e in events if e["provider"] == p["provider"] and e["ts"] and p["start"] <= e["ts"] <= p["observed"]]
        total = sum(e["total_tokens"] for e in matching)
        if total:
            for e in matching:
                e["subscription_usd"] = (e["subscription_usd"] or 0) + p["usd"] * e["total_tokens"] / total
    return events, runs, sources, periods


def write_outputs(events, runs, sources, periods, config, out):
    out = pathlib.Path(out)
    data = out / "paper/data"
    data.mkdir(parents=True, exist_ok=True)
    groups = {}
    for e in events:
        key = tuple(e[k] for k in ("character", "ascension", "run", "component", "batch"))
        if key not in groups:
            groups[key] = dict(zip(("character", "ascension", "run", "component", "batch"), key))
            groups[key].update({k: 0 for k in ("calls", "latency_ms", *FIELDS)})
            groups[key].update(usage_recorded=True, api_usd=None, subscription_usd=None, cost_complete=True)
        row = groups[key]
        for k in ("calls", "latency_ms", *FIELDS):
            row[k] += e[k]
        row["usage_recorded"] &= e["usage_recorded"]
        row["cost_complete"] &= e["usage_recorded"] and (e["api_usd"] is not None or e["subscription_usd"] is not None)
        for k in ("api_usd", "subscription_usd"):
            if e[k] is not None:
                row[k] = (row[k] or 0) + e[k]
    for row in groups.values():
        values = [row[k] for k in ("api_usd", "subscription_usd") if row[k] is not None]
        row["estimated_usd"] = sum(values) if values else None
    characters = sorted({e["character"] for e in events} | {str(r.get("character", "unknown")).lower() for r in runs.values()})
    summaries = {}
    for character in characters:
        rows = [r for r in groups.values() if r["character"] == character]
        header = ["character", "ascension", "run", "component", "batch", "calls", "latency_ms", *FIELDS,
                  "usage_recorded", "api_usd", "subscription_usd", "cost_complete", "estimated_usd"]
        with (data / f"cost-{character}.csv").open("w", newline="") as handle:
            writer = csv.DictWriter(handle, header, lineterminator="\n")
            writer.writeheader()
            writer.writerows(sorted(rows, key=lambda r: (str(r["ascension"]), r["run"], r["component"], r["batch"])))
        ascensions = sorted({r.get("ascension") for r in runs.values() if str(r.get("character", "")).lower() == character and isinstance(r.get("ascension"), int)})
        curve, cumulative, cumulative_tokens = [], 0, 0
        have_cost = False
        for asc in ascensions:
            rr = [r for r in runs.values() if str(r.get("character", "")).lower() == character and r.get("ascension") == asc]
            entries = [r for r in rows if r["ascension"] == asc]
            total = sum(r["total_tokens"] for r in entries)
            known = [r["estimated_usd"] for r in entries if r["estimated_usd"] is not None]
            cost = sum(known) if known else None
            have_cost |= bool(known)
            cumulative += cost or 0
            cumulative_tokens += total
            wins = sum(r.get("victory") is True for r in rr)
            curve.append({"ascension": asc, "runs": len(rr), "wins": wins, "total_tokens": total,
                          "known_estimated_usd": cost, "cost_coverage": "partial" if any(not r["cost_complete"] for r in entries) else "recorded",
                          "usd_per_run": None if cost is None or not rr else cost / len(rr),
                          "usd_per_win": None if cost is None or not wins else cost / wins,
                          "cumulative_tokens": cumulative_tokens, "cumulative_known_usd": cumulative if have_cost else None,
                          "component_token_share": {c: sum(r["total_tokens"] for r in entries if r["component"] == c) / total if total else None for c in sorted({r["component"] for r in entries})}})
        summaries[character] = curve
        if curve:
            with (data / f"cost-curve-{character}.csv").open("w", newline="") as handle:
                writer = csv.DictWriter(handle, list(curve[0]), lineterminator="\n")
                writer.writeheader()
                writer.writerows([{**r, "component_token_share": json.dumps(r["component_token_share"], sort_keys=True)} for r in curve])
        report = out / f"paper/materials/{character}/cost.md"
        report.parent.mkdir(parents=True, exist_ok=True)
        def money(v):
            return "未知" if v is None else f"${v:.4f}"
        lines = [f"# {character}：token 与成本", "", "按组件、进阶、局与批次归集；CSV 保留未归属部分。缓存是输入子集，推理是输出子集，不重复计入总 token。",
                 "学习批次服务多局时等分，不代表逐局实测；未记录服务局号的批次保持未归属。运维和观察按对局时间窗归属，窗外单列 unattributed。",
                 "订阅为共享账户周额度估算，按月费 × 12 / 52 折周、按同一重置窗口内已记录 token 分摊；未观测到的账户外部用量无法单独扣除。",
                 "未知价格、失败/过期/未校验窗口不补零。金额只汇总已知部分，不能当作完整账单；每胜费用在零胜时未知。",
                 "Jev 历史总 token 取 runs，未记录输入/输出拆分；大脑仅归集 brain/codex-calls 留存的请求，早期没有这些日志的调用仍缺失。", "",
                 "| 进阶 | 局 | 胜 | token | 已知估算 | 每局 | 每胜 | 累计已知 | 覆盖 |", "|---|---:|---:|---:|---:|---:|---:|---:|---|"]
        for r in curve:
            lines.append(f"| A{r['ascension']} | {r['runs']} | {r['wins']} | {r['total_tokens']:.0f} | {money(r['known_estimated_usd'])} | {money(r['usd_per_run'])} | {money(r['usd_per_win'])} | {money(r['cumulative_known_usd'])} | {r['cost_coverage']} |")
        lines.extend(["", "价格配置：Claude $200/月、ChatGPT $500/月（Roy 2026-10-05 20:41）；DeepSeek 按现有论文峰时价格假设；TypeSafe/Jev 单价尚缺。",
                      f"本次有效订阅重置窗口：{len(periods)}；数据字节切点、缺失源及坏行数见 paper/data/cost-sources.json。"])
        report.write_text("\n".join(lines) + "\n")
    manifest = {"cuts": sources.cuts, "bad_lines": dict(sources.bad_lines), "config": config,
                "quota_periods": [{k: v.isoformat() if isinstance(v, dt.datetime) else v for k, v in p.items()} for p in periods], "ascensions": summaries}
    (data / "cost-sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return summaries


def build(root, out=None, config_path=None, claude_dir=None):
    config = json.loads((pathlib.Path(config_path) if config_path else pathlib.Path(__file__).with_name("cost-config.json")).read_text())
    events, runs, sources, periods = collect(root, config, claude_dir)
    return write_outputs(events, runs, sources, periods, config, out or root)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(pathlib.Path(__file__).resolve().parents[1]))
    parser.add_argument("--out")
    parser.add_argument("--config")
    parser.add_argument("--claude-dir")
    args = parser.parse_args()
    build(args.root, args.out, args.config, args.claude_dir)
