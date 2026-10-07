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
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import brain_source

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
    # Request traces split paid input from free output. Run totals alone cannot determine input cost.
    jev_recorded = collections.defaultdict(lambda: {"tokens": 0, "calls": 0})
    for r in sources.rows(root / "logs/jev-prompts.jsonl"):
        identity = ("jev", r.get("request_id") or (r.get("decision_id"), r.get("ts"), r.get("call")))
        if identity in seen:
            continue
        recorded = all(isinstance(r.get(k), (int, float)) and not isinstance(r[k], bool) and r[k] >= 0
                       for k in ("input_tokens", "output_tokens"))
        usage = tokens(r) if recorded else tokens({})
        price = config["api"]["jev"]
        paid = None if not recorded or price.get("input_per_million") is None or price.get("output_per_million") is None else (
            usage["input_tokens"] * price["input_per_million"] + usage["output_tokens"] * price["output_per_million"]) / 1e6
        add("combat:jev", "jev", r.get("ts"), usage, rid=r.get("run_id"), cost=paid, known=recorded, identity=identity)
        if recorded:
            jev_recorded[r.get("run_id")]["tokens"] += usage["total_tokens"]
            jev_recorded[r.get("run_id")]["calls"] += 1
    for rid, r in runs.items():
        traced = jev_recorded[rid]
        total = max(0, num(r.get("tokens")) - traced["tokens"])
        calls = max(0, num(r.get("jev_calls")) - traced["calls"])
        if traced["calls"] and not total and not calls:
            continue
        add("combat:jev", "jev", r.get("ended"), {"total_tokens": total}, rid=rid, calls=calls,
            cost=None, known=False)

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
    brain_path = root / "logs/brain.jsonl"
    brain_source.annotate(runs.values(), brain_source.load_sources(root / "logs", runs.keys(), sources.cuts.get(str(brain_path), 0)))
    return events, runs, sources, periods


def jev_reconciliation(events, runs, config):
    page = config.get("jev_usage_page")
    if not page:
        return None
    start, end = time(page["start_inclusive"]), time(page["end_exclusive"])
    selected = [e for e in events if e["provider"] == "jev" and e["ts"] and start <= e["ts"] < end]
    completed = [r for r in runs.values() if time(r.get("ended")) and start <= time(r["ended"]) < end]
    recorded = [e for e in selected if e["usage_recorded"]]
    totals = {k: sum(e[k] for e in selected) for k in ("calls", *FIELDS)}
    totals["known_api_usd"] = sum(e["api_usd"] or 0 for e in recorded)
    totals["unknown_split_tokens"] = sum(e["total_tokens"] for e in selected if not e["usage_recorded"])
    return {"page": page, "logs": totals,
            "finished_runs": {"calls": sum(num(r.get("jev_calls")) for r in completed), "total_tokens": sum(num(r.get("tokens")) for r in completed)},
            "log_minus_page": {"requests": totals["calls"] - page["requests"], "tokens": totals["total_tokens"] - page["tokens"],
                               "known_usd": totals["known_api_usd"] - page["usd"]},
            "unknown_usage_calls": sum(e["calls"] for e in selected if not e["usage_recorded"])}


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
            selected = [r for r in rr if brain_source.eligible(r)]
            wins = sum(r.get("victory") is True for r in selected)
            curve.append({"ascension": asc, "runs": len(rr), "wins": wins, "raw_wins": sum(r.get("victory") is True for r in rr),
                          "performance_runs": len(selected), "performance_policy": brain_source.POLICY,
                          "cost_scope": "all_engines_all_runs", "raw_cohorts": brain_source.cohorts(rr), "total_tokens": total,
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
                writer.writerows([{**r, "component_token_share": json.dumps(r["component_token_share"], sort_keys=True), "raw_cohorts": json.dumps(r["raw_cohorts"], sort_keys=True)} for r in curve])
        report = out / f"paper/materials/{character}/cost.md"
        report.parent.mkdir(parents=True, exist_ok=True)
        def money(v):
            return "未知" if v is None else f"${v:.4f}"
        lines = [f"# {character}：token 与成本", "", "按组件、进阶、局与批次归集；CSV 保留未归属部分。缓存是输入子集，推理是输出子集，不重复计入总 token。",
                 "学习批次服务多局时等分，不代表逐局实测；未记录服务局号的批次保持未归属。运维和观察按对局时间窗归属，窗外单列 unattributed。",
                 "订阅为共享账户周额度估算，按月费 × 12 / 52 折周、按同一重置窗口内已记录 token 分摊；未观测到的账户外部用量无法单独扣除。",
                 "未知价格、失败/过期/未校验窗口不补零。金额只汇总已知部分，不能当作完整账单；每胜费用在零胜时未知。",
                 "Jev 优先取 jev-prompts 的逐请求输入/输出（按 request_id 去重，缓存不另加），仅输入收费；runs 未覆盖余额只有总 token，拆分与费用未知。失败请求用量未知，未结束局有请求日志也计入。大脑仅归集 brain/codex-calls 留存请求，早期调用仍缺失。", "",
                 f"战绩口径：{brain_source.POLICY}。局数、费用、token 和每局费用覆盖全部引擎；胜数仅 Codex，raw_wins/各引擎原始成绩在 CSV 中保留；每胜费用为全部实验费用除以 Codex 胜数。", "",
                 "| 进阶 | 原始局 | Codex 胜 | token（全部） | 已知估算 | 每原始局 | 每 Codex 胜 | 累计已知 | 覆盖 |", "|---|---:|---:|---:|---:|---:|---:|---:|---|"]
        for r in curve:
            lines.append(f"| A{r['ascension']} | {r['runs']} | {r['wins']} | {r['total_tokens']:.0f} | {money(r['known_estimated_usd'])} | {money(r['usd_per_run'])} | {money(r['usd_per_win'])} | {money(r['cumulative_known_usd'])} | {r['cost_coverage']} |")
        jev_price = config["api"]["jev"]
        lines.extend(["", f"价格配置：Claude $200/月、ChatGPT $500/月（Roy 2026-10-05 20:41）；DeepSeek 按现有论文峰时价格假设；TypeSafe/Jev 输入 ${jev_price.get('input_per_million', '未知')}/百万 token、输出 ${jev_price.get('output_per_million', '未知')}/百万 token（{jev_price['source']}）。",
                      f"本次有效订阅重置窗口：{len(periods)}；数据字节切点、缺失源及坏行数见 paper/data/cost-sources.json。"])
        reconciliation = jev_reconciliation(events, runs, config)
        if character == "silent" and reconciliation:
            p, log, delta = reconciliation["page"], reconciliation["logs"], reconciliation["log_minus_page"]
            lines.extend(["", "## TypeSafe 用量页交叉核对（全部角色，非静默独占）", "",
                          f"来源：{p['source']}。页面 ${p['usd']:.4f}、{p['tokens']:,} token、{p['requests']:,} 请求。",
                          f"日志范围：{p['start_inclusive']} ≤ 时间 < {p['end_exclusive']}；逐请求按请求时间，未拆分余额按局结束时间。页面截图精确截止时间、时区及 Last 30 days 起点未知；9/28 是已知开始有数的日期，此区间只用于近似核对。",
                          f"日志计入 {log['calls']:,.0f} 请求、{log['total_tokens']:,.0f} 总 token，其中实录输入 {log['input_tokens']:,.0f}、输出 {log['output_tokens']:,.0f}，未拆分 {log['unknown_split_tokens']:,.0f}；已知输入费 ${log['known_api_usd']:.4f}。",
                          f"日志减页面：请求 {delta['requests']:+,.0f}、总 token {delta['tokens']:+,.0f}、已知费用 ${delta['known_usd']:+.4f}（含未记录余额，不能视作完整账单金额差）。",
                          f"已完成局汇总另核：{reconciliation['finished_runs']['calls']:,.0f} 成功请求、{reconciliation['finished_runs']['total_tokens']:,.0f} 总 token；逐请求来源含重试失败及在跑局，未知用量请求 {reconciliation['unknown_usage_calls']:,.0f}。",
                          "各角色仅按 run_id 归属费用，交叉核对允许全部角色合计；不读取或混用角色知识。未留存请求、失败用量、页面是否只统计输入/如何计缓存及账户外调用均未知，不能补齐为相等。",
                          f"若把页面 token 全视作输入，按给定单价得 ${p['tokens'] * jev_price.get('input_per_million', 0) / 1e6:.4f}，与页面金额不完全相符；页面 token 口径未知，不能据此反推输入数。"])
        report.write_text("\n".join(lines) + "\n")
    manifest = {"cuts": sources.cuts, "bad_lines": dict(sources.bad_lines), "config": config, "jev_reconciliation": jev_reconciliation(events, runs, config),
                "quota_periods": [{k: v.isoformat() if isinstance(v, dt.datetime) else v for k, v in p.items()} for p in periods], "ascensions": summaries}
    (data / "cost-sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return summaries


def build(root, out=None, config_path=None, claude_dir=None):
    config = json.loads((pathlib.Path(config_path) if config_path else pathlib.Path(__file__).with_name("cost-config.json")).read_text())
    events, runs, sources, periods = collect(root, config, claude_dir)
    output = pathlib.Path(out or root)
    import shutil
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    prior = list((output / "paper/data").glob("cost*")) + list((output / "paper/materials").glob("*/cost.md"))
    for path in prior:
        if path.is_file():
            saved = output / "paper/data/history" / stamp / path.relative_to(output)
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, saved)
    return write_outputs(events, runs, sources, periods, config, output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(pathlib.Path(__file__).resolve().parents[1]))
    parser.add_argument("--out")
    parser.add_argument("--config")
    parser.add_argument("--claude-dir")
    args = parser.parse_args()
    build(args.root, args.out, args.config, args.claude_dir)
