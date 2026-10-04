#!/usr/bin/env python3
"""Post-mortem for one jev-sts2 run: outcome, where HP went, who decided what (code / Jev / DeepSeek).

Usage: report.py [run_id]   (default: the last run in logs/decisions.jsonl)
Prints Markdown. Appends a one-line summary to logs/runs.jsonl (idempotent per run id).
"""
import collections
import json
import os
import re
import sys

ROOT = os.path.expanduser("~/Projects/sts2-jev/jev-sts2")
DEC = os.path.join(ROOT, "logs/decisions.jsonl")
STATES = os.path.join(ROOT, "logs/states.jsonl")
RUNS = os.path.join(ROOT, "logs/runs.jsonl")
PRICE_PER_M = 0.042  # $ per million tokens (in + out), handoff estimate


# A model's own decision: the brain engine that answered (deepseek, codex, claude; "deepseek (for codex)" when the router's
# fallback did), or a v3 escalator. Before 2026-10-03 every brain answer was logged as "deepseek" (jev-sts2 loop.ts).
BRAIN_DECIDER = re.compile(r"^(deepseek|claude|codex|dsh)( \(for (deepseek|claude|codex|dsh)\))?$")


def is_brain(decider):
    return bool(BRAIN_DECIDER.match(decider or ""))


def brain_direct(r):
    """The brain decided this screen itself (its tokens are the row's usage): any brain decider but a v3 Claude escalation."""
    d = r.get("decider") or ""
    return is_brain(d) and (d != "claude" or not r.get("escalation"))


def brain_engine(r):
    """The engine behind a row's brain call: its note (deepseek.brain / escalation.brain), else the decider's, else deepseek."""
    for key in ("deepseek", "escalation"):
        rec = r.get(key) if isinstance(r.get(key), dict) else {}
        note = rec.get("brain") if isinstance(rec.get("brain"), dict) else {}
        if note.get("engine"):
            return note["engine"]
    d = r.get("decider") or ""
    return d.split(" (for ")[0] if is_brain(d) else "deepseek"


def load(path):
    if not os.path.exists(path):
        return []
    out = []
    for line in open(path, encoding="utf8"):
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def run_of(record):
    try:
        return json.loads(record["fingerprint"]).get("run") or None
    except Exception:
        return None


def in_combat(record, states):
    """Whether a decision was taken inside a fight: its state's in_combat, else its fingerprint's combat flag."""
    state = states.get(record["ts"])
    if state is not None and "in_combat" in state:
        return bool(state["in_combat"])
    try:
        return bool(json.loads(record["fingerprint"]).get("combat"))
    except Exception:
        return False


# Heals that land between a fight's last turn and the next screen (the reward): taken back off that screen's HP
# to get the HP the fight ended at. Burning Blood 6 (relic-values.ts: 841 of 914 fights ending below max HP).
POST_COMBAT_HEAL = {"BURNING_BLOOD": 6}


def hp_of(record, states):
    """The player's HP at a decision: its state's run.current_hp, else its fingerprint's hp."""
    st = states.get(record["ts"]) or {}
    hp = (st.get("run") or {}).get("current_hp")
    if hp is None:
        try:
            hp = json.loads(record["fingerprint"]).get("hp")
        except Exception:
            hp = None
    return hp


def fights_of(recs, states, died=False):
    """Fights: consecutive COMBAT records on one floor. A fight's end HP is the next non-combat frame's (the reward
    screen) less the post-combat heals (POST_COMBAT_HEAL), so the damage after the last combat decision counts: the
    enemy turn that ended it, an explosion (DHGT6Z3Q7VAP F17: the Waterfall Giant's -28 after its death; the last
    decision read 61, the fight ended at 33, the reward showed 39 after Burning Blood). A reward frame at max HP may
    hide a partial heal: then the last combat frame's HP is kept when it is within the heal of max. A fight with no
    frame after it that the run died in ends at 0 (the killing blow)."""
    fights = []
    current = None

    def close(after):
        if after is not None:
            hp = hp_of(after, states)
            if hp is not None:
                st = states.get(after["ts"]) or {}
                run = st.get("run") or {}
                relics = [r.get("relic_id") for r in run.get("relics") or []]
                heal = sum(v for k, v in POST_COMBAT_HEAL.items() if k in relics) if hp > 0 else 0
                end = max(0, hp - heal)
                # The heal is capped at max HP: a reward frame at max says only that the fight ended at max - heal or
                # above, so the last combat frame's HP (an upper bound) stands when it is in that range.
                last = current["hp_end"]
                max_hp = run.get("max_hp")
                if heal and max_hp is not None and hp >= max_hp and last is not None and end <= last <= hp:
                    end = last
                current["healed_after"] = hp - end if heal else 0
                current["hp_end"] = end
        fights.append(current)

    for r in recs:
        if r["screen"] != "COMBAT":
            # A card pick inside the fight (Toasty Mittens' exhaust each turn, a potion's or Choices Paradox's
            # card, Headbutt) is part of it: a CARD_SELECTION row on the fight's floor, in combat, does not end
            # it (2XWM from F19, 7XK6 F42/F48: every turn became its own "-0" fight).
            if current and r["screen"] == "CARD_SELECTION" and r.get("floor") == current["floor"] and in_combat(r, states):
                current["records"].append(r)
                continue
            if current:
                close(r)
                current = None
            continue
        st = states.get(r["ts"]) or {}
        combat = st.get("combat") or {}
        enemies = [e.get("name") or e.get("enemy_id") for e in combat.get("enemies", []) if e.get("is_alive", True)]
        hp = (combat.get("player") or {}).get("current_hp")
        if current is None or current["floor"] != r["floor"]:
            # Straight into another fight (no frame between): the last combat frame's HP stands.
            if current:
                close(None)
            current = {"floor": r["floor"], "enemies": set(), "hp_start": hp, "hp_end": hp, "records": []}
        current["enemies"].update(enemies)
        if hp is not None:
            current["hp_end"] = hp
        current["records"].append(r)
    if current:
        # The run's last fight with nothing after it: the run died in it (0 HP), or it is still going.
        if died:
            current["hp_end"] = 0
        fights.append(current)
    return fights


def selftest():
    """report.py --selftest: the DHGT6Z3Q7VAP F17 Waterfall Giant fight from its log lines (decisions.jsonl and
    states.jsonl, trimmed to the fields read): 86 -> 33, not 86 -> 61; and a death fight ends at 0."""
    relics = [{"relic_id": r} for r in ["BURNING_BLOOD", "GOLDEN_PEARL", "EMBER_TEA", "BAG_OF_PREPARATION", "WAR_PAINT"]]
    def rec(ts, screen, turn, label, hp, in_fight):
        fp = {"combat": in_fight, "hp": hp, "maxHp": 86, "run": "DHGT6Z3Q7VAP", "screen": screen}
        return {"ts": ts, "mode": "play", "screen": screen, "floor": 17, "turn": turn, "label": label, "fingerprint": json.dumps(fp)}
    def state(hp, in_fight):
        return {"in_combat": in_fight, "run": {"current_hp": hp, "max_hp": 86, "relics": relics},
                "combat": {"player": {"current_hp": hp}, "enemies": [{"name": "瀑布巨兽", "is_alive": True}]} if in_fight else None}
    recs = [
        rec("2026-09-29T12:57:14.651Z", "COMBAT", 1, "combat/plan-choice+potion", 86, True),
        rec("2026-09-29T12:58:33.092Z", "COMBAT", 10, "combat/plan", 61, True),
        rec("2026-09-29T12:58:36.136Z", "REWARD", 10, "reward/claim", 39, False),
    ]
    states = {"2026-09-29T12:57:14.651Z": state(86, True), "2026-09-29T12:58:33.092Z": state(61, True), "2026-09-29T12:58:36.136Z": state(39, False)}
    fights = fights_of(recs, states)
    assert len(fights) == 1, fights
    assert (fights[0]["hp_start"], fights[0]["hp_end"]) == (86, 33), (fights[0]["hp_start"], fights[0]["hp_end"])
    # Without Burning Blood the reward frame's HP is the end HP.
    relics[:] = [{"relic_id": "GOLDEN_PEARL"}]
    assert fights_of(recs, states)[0]["hp_end"] == 39
    # A fight that ends at max HP with Burning Blood: no loss made up (86 -> 86), not "-6".
    relics[:] = [{"relic_id": "BURNING_BLOOD"}]
    full = {ts: state(86, st["in_combat"]) for ts, st in states.items()}
    assert fights_of(recs, full)[0]["hp_end"] == 86
    # The run died in its last fight (no frame after it): 0, not the last decision's 61.
    assert fights_of(recs[:2], states, died=True)[0]["hp_end"] == 0
    assert fights_of(recs[:2], states)[0]["hp_end"] == 61
    # The decider names the brain engine that answered (jev-sts2 2026-10-03): every one counts as a brain decision.
    for d in ("deepseek", "codex", "deepseek (for codex)", "claude (for codex)"):
        assert is_brain(d), d
    for d in ("code", "jev", "code-fallback", "deepseek-plan", "jev-plan", ""):
        assert not is_brain(d), d
    assert brain_direct({"decider": "codex"}) and brain_direct({"decider": "claude"}) and not brain_direct({"decider": "claude", "escalation": {"by": "claude"}})
    assert brain_engine({"decider": "deepseek", "deepseek": {"brain": {"engine": "codex"}}}) == "codex"  # logged before the fix
    assert brain_engine({"decider": "deepseek (for codex)", "deepseek": {"reused": True}}) == "deepseek"
    assert brain_engine({"decider": "codex", "deepseek": {"reused": True}}) == "codex" and brain_engine({"decider": "jev"}) == "deepseek"
    print("report.py selftest ok: DHGT F17 86->33 (reward 39 less Burning Blood 6); death fight ends at 0; brain deciders")


def decider(record):
    rationale = record.get("rationale", "")
    if record.get("label") == "combat/plan-continue":
        if "Jev-chosen" in rationale:
            return "jev-plan"
        if "DeepSeek-chosen" in rationale:
            return "deepseek-plan"
        if "Claude-chosen" in rationale:
            return "claude-plan"
    if record.get("decider"):
        return record["decider"]
    # Older records: infer.
    if record.get("questions"):
        return "code-fallback" if record.get("fallback") else "jev"
    return "code"


def main():
    decisions = [r for r in load(DEC) if r.get("mode") == "play"]
    runs = [run_of(r) for r in decisions]
    run_id = sys.argv[1] if len(sys.argv) > 1 else next((r for r in reversed(runs) if r), None)
    if not run_id:
        print("no run found")
        return
    recs = [r for r in decisions if run_of(r) == run_id]
    # The GAME_OVER record has no run in its fingerprint: attach the one right after the last record.
    # V4 (2026-09-30) logs it with the run id; then the next GAME_OVER is a later run's, not this one's.
    last_ts = recs[-1]["ts"] if recs else ""
    own_end = any(r.get("screen") == "GAME_OVER" for r in recs)
    tail = [] if own_end else [r for r in decisions if r["ts"] > last_ts and r.get("screen") == "GAME_OVER"][:1]
    # Stream: states.jsonl is hundreds of MB. Every line starts with {"ts":"<24-char ISO ts>", so only
    # the lines this report looks up are parsed.
    wanted = {r["ts"] for r in tail + recs}
    states = {}
    with open(STATES, encoding="utf8") as handle:
        for line in handle:
            if line[7:31] not in wanted:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            states[entry["ts"]] = entry["state"]

    floors = [r["floor"] for r in recs if r.get("floor") is not None]
    top_floor = max(floors) if floors else None
    game_over = None
    for r in tail + recs:
        st = states.get(r["ts"])
        if st and st.get("game_over"):
            game_over = st["game_over"]
    victory = bool(game_over and game_over.get("is_victory"))
    ended = bool(tail) or any(r.get("screen") == "GAME_OVER" for r in recs)
    if not ended and recs:
        # A win can end on the post-boss event with no GAME_OVER record (CRRPX9MWJZGM): the play
        # loop's console log still says "run 1 ended (victory)".
        import glob
        import datetime as _dt
        last = _dt.datetime.fromisoformat(recs[-1]["ts"].replace("Z", "+00:00")).timestamp()
        for path in glob.glob(os.path.join(ROOT, "logs/console/*.log")):
            if 0 <= os.path.getmtime(path) - last < 300:
                if "ended (victory)" in open(path, encoding="utf8", errors="replace").read():
                    victory = ended = True
                    break

    by_decider = collections.Counter(decider(r) for r in recs)
    by_label_decider = collections.Counter((r["label"], decider(r)) for r in recs)
    # usage holds Jev's tokens; since 2026-09-28 19:00 it also adds DeepSeek's (the row's `deepseek` field
    # has DeepSeek's own), so split them: Jev = usage minus DeepSeek when usage carries cache_hit_tokens.
    def _ds(r, k, calls_only=False):
        d = r.get("deepseek") if isinstance(r.get("deepseek"), dict) else {}
        # A memo-reused answer made no call: skip it in DeepSeek totals (as stats.py does; BXAZ was
        # overstated by 17k input tokens), but keep it for the Jev split below.
        if calls_only and d.get("reused"):
            return 0
        return d.get(k) or 0
    def _jev(r, k):
        u = r.get("usage") or {}
        return max(0, (u.get(k) or 0) - (_ds(r, k) if "cache_hit_tokens" in u else 0))
    tokens_in = sum(_jev(r, "input_tokens") for r in recs)
    tokens_out = sum(_jev(r, "output_tokens") for r in recs)
    ds_in = sum(_ds(r, "input_tokens", True) for r in recs)
    ds_out = sum(_ds(r, "output_tokens", True) for r in recs)
    ds_hit = sum(_ds(r, "cache_hit_tokens", True) for r in recs)
    jev_calls = sum(1 for r in recs if _jev(r, "input_tokens") > 0 and not brain_direct(r))
    # Escalations to DeepSeek plus its direct decisions (build/route/rest decider since 2026-09-28).
    # Paid DeepSeek calls only: one-shot plan steps and memo-reused answers carry `deepseek.reused` and made no call.
    paid = [r for r in recs if (r.get("escalation") and r["escalation"].get("by", "deepseek") == "deepseek")
            or (isinstance(r.get("deepseek"), dict) and not r["deepseek"].get("reused"))
            or (brain_direct(r) and r.get("decider") != "claude" and not isinstance(r.get("deepseek"), dict))]
    ds_calls = len(paid)
    # The brain's calls by the engine that made them (V4.5: codex answers, DeepSeek falls back).
    by_engine = collections.Counter(brain_engine(r) for r in paid)
    cl_calls = sum(1 for r in recs if r.get("escalation") and r["escalation"].get("by") == "claude")
    elapsed = 0
    if recs:
        from datetime import datetime
        t0 = datetime.fromisoformat(recs[0]["ts"].replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(recs[-1]["ts"].replace("Z", "+00:00"))
        elapsed = (t1 - t0).total_seconds()

    # HP per floor (from fingerprints), and fights: consecutive COMBAT records on one floor.
    hp_by_floor = collections.OrderedDict()
    for r in recs:
        try:
            hp = json.loads(r["fingerprint"]).get("hp")
        except Exception:
            hp = None
        if r.get("floor") is not None and hp is not None:
            hp_by_floor.setdefault(r["floor"], [hp, hp])
            hp_by_floor[r["floor"]][1] = hp

    fights = fights_of(recs, states, died=ended and not victory)

    out = []
    title = "胜利" if victory else ("阵亡" if ended else "未结束")
    out.append(f"## 复盘：run {run_id} — {title}，最高第 {top_floor} 层")
    out.append("")
    brain_name = "DeepSeek" if set(by_engine) <= {"deepseek"} else "大脑"
    brain_split = "" if brain_name == "DeepSeek" else "（" + "，".join(f"{k} {v}" for k, v in by_engine.most_common()) + "）"
    out.append(f"- 决策 {len(recs)} 个；Jev 调用 {jev_calls} 次，Claude {cl_calls} 次，{brain_name} {ds_calls} 次{brain_split}；token {tokens_in:,} 入 / {tokens_out:,} 出，约 ${(tokens_in + tokens_out) / 1e6 * PRICE_PER_M:.4f}（Jev）；{brain_name} token {ds_in:,} 入（缓存命中 {ds_hit:,}，{(ds_hit / ds_in * 100 if ds_in else 0):.0f}%）/ {ds_out:,} 出；用时 {elapsed/60:.1f} 分钟")
    out.append(f"- 决策者：" + "，".join(f"{k} {v}" for k, v in by_decider.most_common()))
    out.append("")
    out.append("### 战斗掉血（按层）")
    for f in fights:
        loss = (f["hp_start"] or 0) - (f["hp_end"] or 0)
        who = collections.Counter(decider(r) for r in f["records"])
        healed = f"，战后回复 +{f['healed_after']}" if f.get("healed_after") else ""
        out.append(f"- 第 {f['floor']} 层 {'/'.join(sorted(x for x in f['enemies'] if x))}: HP {f['hp_start']}→{f['hp_end']}（{'-' if loss >= 0 else '+'}{abs(loss)}{healed}），决策 " + "，".join(f"{k} {v}" for k, v in who.most_common()))
    out.append("")
    if fights and not victory and ended:
        last = fights[-1]
        out.append(f"### 死亡战斗：第 {last['floor']} 层 {'/'.join(sorted(x for x in last['enemies'] if x))}")
        for r in last["records"][-12:]:
            conf = f" conf {r['confidence']:.2f}" if isinstance(r.get("confidence"), (int, float)) else ""
            out.append(f"- T{r.get('turn')} [{decider(r)}] {r['label']}: {r['rationale'][:160]}{conf}")
        out.append("")
    out.append("### 各类决策由谁做")
    for (label, who), n in sorted(by_label_decider.items(), key=lambda kv: (-kv[1], kv[0])):
        out.append(f"- {label} / {who}: {n}")
    esc = [r for r in recs if r.get("escalation")]
    out.append("")
    out.append(f"### 兜底介入（Claude/DeepSeek）：{len(esc)} 次（推翻 Jev {sum(1 for r in esc if r['escalation'].get('deepseek_choice') != r['escalation'].get('jev_choice'))} 次）")
    for r in esc[:20]:
        e = r["escalation"]
        verdict = "同意" if e.get("deepseek_choice") == e.get("jev_choice") else "推翻"
        out.append(f"- [{e.get('by', 'deepseek')}] 第 {r.get('floor')} 层 T{r.get('turn')} {r['label']}: {verdict} Jev（{e.get('jev_choice')} @{e.get('jev_confidence', 0):.2f} → {e.get('deepseek_choice')}）：{e.get('reason', '')[:120]}")
    low = [r for r in recs if decider(r) == "jev" and isinstance(r.get("confidence"), (int, float)) and r["confidence"] < 0.35]
    out.append("")
    out.append(f"### Jev 低置信度（<0.35）决策：{len(low)} 个")
    for r in low[:15]:
        out.append(f"- 第 {r.get('floor')} 层 {r['label']}: {r['rationale'][:150]} ({r['confidence']:.2f})")
    print("\n".join(out))

    # Append to the run index once.
    existing = {r.get("run_id") for r in load(RUNS)}
    if ended and run_id not in existing:
        sha = ""
        consoles = sorted(os.listdir(os.path.join(ROOT, "logs/console"))) if os.path.isdir(os.path.join(ROOT, "logs/console")) else []
        if consoles:
            sha = consoles[-1].rsplit("-", 1)[-1].removesuffix(".log")
        character = None
        ascension = None
        for r in recs:
            st = states.get(r["ts"])
            if st and st.get("run"):
                character = st["run"].get("character_id")
                ascension = st["run"].get("ascension")
                break
        with open(RUNS, "a", encoding="utf8") as handle:
            handle.write(json.dumps({
                "run_id": run_id, "ended": recs[-1]["ts"], "victory": victory, "floor": top_floor,
                "character": character, "ascension": ascension, "code": sha, "decisions": len(recs),
                "jev_calls": jev_calls, "deepseek_calls": ds_calls, "claude_calls": cl_calls, "tokens": tokens_in + tokens_out, "ds_tokens_in": ds_in, "ds_tokens_out": ds_out, "ds_cache_hit": ds_hit,
                "deciders": dict(by_decider),
                "death_fight": None if victory or not fights else sorted(x for x in fights[-1]["enemies"] if x),
                **ablation_arm(),
            }, ensure_ascii=False) + "\n")


def ablation_arm():
    """The ablation arm this run played under (ops/ablation-current.json, set by ops/run.sh), then
    advance the schedule. {} when no ablation is running."""
    ops = os.path.join(os.path.dirname(ROOT), "ops")
    cur_path = os.path.join(ops, "ablation-current.json")
    sched_path = os.path.join(ops, "ablation.json")
    try:
        cur = json.load(open(cur_path))
    except (OSError, json.JSONDecodeError):
        return {}
    if cur.get("done"):
        return {}
    cur["done"] = True
    json.dump(cur, open(cur_path, "w"))
    try:
        sched = json.load(open(sched_path))
        sched["i"] = int(sched.get("i", 0)) + 1
        json.dump(sched, open(sched_path, "w"))
    except (OSError, json.JSONDecodeError):
        pass
    return {"arm": cur.get("arm")}


def refresh_knowledge() -> None:
    """After each run: monster DB, per-fight move model, outcome stats. Background, unless REFRESH_WAIT=1 (autoplay.sh)."""
    import subprocess
    # Into the run worktree (branch v4-live since 2026-09-30; was jev-sts2-v3 / v3), whose logs/ links to jev-sts2/logs.
    wt = os.path.expanduser("~/Projects/sts2-jev/jev-sts2-v4run")
    tools = f"{wt}/tools"
    mm = f"{wt}/src/knowledge/move-model.json"
    cmd = (f'python3 {tools}/build-monster-db.py --quiet --move-model-out {mm}; '
           f'python3 {tools}/monster-db-check.py >/dev/null 2>&1; '
           f'python3 {tools}/build-outcome-stats.py >/dev/null 2>&1; '
           f'python3 {tools}/build-room-costs.py >/dev/null 2>&1; '
           f'python3 {tools}/build-boss-damage.py >/dev/null 2>&1; '
           f'python3 {tools}/build-card-upgrades.py >/dev/null 2>&1; '
           f'nice -n 10 {wt}/.cache/logdb-venv/bin/python {tools}/logdb/sync.py >/dev/null 2>&1; '
           f'{wt}/tools/refresh-potion-equivalents.sh >/dev/null 2>&1')
    log = open(os.path.expanduser("~/Projects/sts2-jev/ops/refresh.log"), "a")
    # fight-value (~5 min) is only a reference for Jev's history estimate and is written whole (tmp + rename, ede54d1),
    # so it runs on its own and the next run never waits for it; a run that starts meanwhile reads the previous copy.
    subprocess.Popen(["bash", "-c", f"nice -n 10 python3 {tools}/build-fight-value.py all >/dev/null 2>&1"],
                     stdout=log, stderr=log, start_new_session=True)
    proc = subprocess.Popen(["bash", "-c", cmd], stdout=log, stderr=log, start_new_session=True)
    # REFRESH_WAIT=1 (autoplay.sh, 2026-10-04): block until every file the next run reads is written, so the next run reads them fresh
    # (4AWD read the old outcome-stats.json while this was still rebuilding it). Capped; past the cap it keeps going.
    if os.environ.get("REFRESH_WAIT") == "1":
        try:
            proc.wait(timeout=int(os.environ.get("REFRESH_WAIT_S", "1800")))
        except subprocess.TimeoutExpired:
            log.write(f"refresh still running after {os.environ.get('REFRESH_WAIT_S', '1800')} s; next run starts anyway\n")
            log.flush()


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        selftest()
        sys.exit(0)
    main()
    try:
        refresh_knowledge()
    except Exception:
        pass
