#!/usr/bin/env python3
"""B3 acceptance table from tools/boss-sim/build-replay.ts output: per question the boss, entry HP and its source,
options simulated / not, samples, time, the current deck's calibrated win rate and the options' differences.

Usage: python3 tools/boss-sim/build-replay-report.py experiments/boss-sim-build/raw/replay.jsonl > experiments/boss-sim-build/replay-table.md
"""
import json
import statistics
import sys

rows = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
out = ["| 题 | 类型 | 层 | boss | 进场血量 | 模拟 / 不模拟的选项 | 每选项样本 | 用时 | 当前牌组胜率（校准） | 选项的差（校准，百分点）：最低 / 最高 | 2 个标准误以外的选项 |",
       "|---|---|---|---|---|---|---|---|---|---|---|"]
times = []
for r in rows:
    rec = r.get("record") or {}
    if not rec or "options" not in rec:
        out.append(f"| {r['id']} | {r.get('label', r.get('logged_label'))} | {r.get('floor', '')} | — | — | 不在 B3 范围（附魔） | — | — | — | — | — |")
        continue
    times.append(r["ms"])
    opts = rec["options"]
    diffs = [v for v in opts.values() if v["se_cal"] > 0 or v["diff_cal"] != 0]
    sig = [k for k, v in opts.items() if abs(v["diff_raw"]) > 2 * v["se_raw"] and v["se_raw"] > 0]
    lo = min((v["diff_cal"] for v in diffs), default=0) * 100
    hi = max((v["diff_cal"] for v in diffs), default=0) * 100
    low = " ⚑" if rec["boss"] in ("KAISER_CRAB", "TEST_SUBJECT", "QUEEN", "KNOWLEDGE_DEMON", "AEONGLASS", "THE_INSATIABLE") else ""
    out.append(f"| {r['id']} | {r['label']} | F{r['floor']} | {rec['boss']} A{rec['asc']}{low} | {rec['entry_hp']}（{'路线' if rec['entry_source'] == 'route' else '当前'}） | {len(opts)} / {len(rec.get('not_simulated', {}))} | {rec['samples']}{'（到时）' if rec['timed_out'] else ''} | {r['ms'] / 1000:.1f} s | {rec['base']['win_cal'] * 100:.0f}%（原始 {rec['base']['win'] * 100:.0f}%） | {lo:+.1f} / {hi:+.1f} | {len(sig)} |")
out.append("")
out.append(f"用时（{len(times)} 题）：中位 {statistics.median(times) / 1000:.1f} s，最慢 {max(times) / 1000:.1f} s；到截止时间的 {sum(1 for r in rows if (r.get('record') or {}).get('timed_out'))} 题。⚑ = 低可信 boss。")
print("\n".join(out))
