"""Row extractors for the log database (tools/logdb/sync.py): one raw JSONL line -> one compact row.

Stdlib only, so the extractors can be tested without DuckDB. Each source file maps to one table and one
extractor; the table's columns and DuckDB types are in TABLES. A row always carries `off` and `len`, the
byte offset and length of its line in the source file, so the full record can be read back from the JSONL
(the JSONL stays the only raw record; the database is derived and can be rebuilt at any time).

Free text that goes into the database (rationales, short model reasons, plan summaries) passes through
scrub(), which blanks anything shaped like an API key; long texts (questions, reasoning, memory, prompts)
are stored as lengths only.
"""
import json
import re

# Bumped per source when its extractor or columns change: sync.py rebuilds that source's shards.
VERSIONS = {"states": 1, "decisions": 1, "runs": 1, "deepseek-reasoning": 1, "brain": 2, "run-plans": 1, "run-config": 1, "sl-attempts": 2}

KEY_RE = re.compile(r"(sk-(?:ant-)?[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/-]{16,}|(?:api[_-]?key|x-api-key)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9._-]{12,})", re.I)
AGENT_VIEW = b',"agent_view":'
TS_RE = re.compile(rb'"ts":\s*"([^"]+)"')
TEXT_CAP = 4000
INT_MAX = 2**31 - 1

ENEMY_TYPE = "STRUCT(idx INTEGER, id VARCHAR, hp INTEGER, max_hp INTEGER, block INTEGER, alive BOOLEAN, move VARCHAR, intent_dmg INTEGER, minion BOOLEAN)[]"
POWER_TYPE = "STRUCT(id VARCHAR, amount INTEGER)[]"
NODE_TYPE = "STRUCT(idx INTEGER, row INTEGER, col INTEGER, type VARCHAR)[]"

# table -> [(column, DuckDB type)], in column order.
TABLES = {
    "frames": [
        ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"), ("observed_ts", "TIMESTAMP"), ("observed", "BOOLEAN"),
        ("fingerprint", "VARCHAR"), ("screen", "VARCHAR"), ("session", "VARCHAR"), ("run_id", "VARCHAR"),
        ("in_combat", "BOOLEAN"), ("turn", "INTEGER"), ("character", "VARCHAR"), ("ascension", "INTEGER"), ("act", "INTEGER"),
        ("floor", "INTEGER"), ("hp", "INTEGER"), ("max_hp", "INTEGER"), ("gold", "INTEGER"), ("boss_id", "VARCHAR"),
        ("deck", "VARCHAR[]"), ("deck_size", "INTEGER"), ("relics", "VARCHAR[]"), ("potions", "VARCHAR[]"), ("potion_slots", "INTEGER"),
        ("player_hp", "INTEGER"), ("block", "INTEGER"), ("energy", "INTEGER"), ("cards_played", "INTEGER"),
        ("player_powers", POWER_TYPE), ("enemies", ENEMY_TYPE), ("incoming", "INTEGER"),
        ("map_row", "INTEGER"), ("map_col", "INTEGER"), ("map_node", "VARCHAR"), ("map_avail", NODE_TYPE),
        ("event_id", "VARCHAR"), ("go_victory", "BOOLEAN"), ("go_floor", "INTEGER"),
    ],
    "decisions": [
        ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"), ("observed_ts", "TIMESTAMP"), ("mode", "VARCHAR"),
        ("screen", "VARCHAR"), ("session", "VARCHAR"), ("run_id", "VARCHAR"), ("floor", "INTEGER"), ("turn", "INTEGER"),
        ("label", "VARCHAR"), ("label_head", "VARCHAR"), ("decider", "VARCHAR"),
        ("action", "VARCHAR"), ("option_index", "INTEGER"), ("card_index", "INTEGER"), ("target_index", "INTEGER"),
        ("card_id", "VARCHAR"), ("potion_id", "VARCHAR"), ("chosen", "VARCHAR"),
        ("questions", "VARCHAR[]"), ("options", "VARCHAR[]"), ("choice", "VARCHAR"), ("probabilities", "VARCHAR"), ("confidence", "DOUBLE"),
        ("fallback", "BOOLEAN"), ("reasked", "BOOLEAN"), ("no_jev", "BOOLEAN"), ("reused_answer", "BOOLEAN"),
        ("hp", "INTEGER"), ("max_hp", "INTEGER"), ("gold", "INTEGER"),
        ("input_tokens", "INTEGER"), ("output_tokens", "INTEGER"), ("cache_hit_tokens", "INTEGER"), ("reasoning_tokens", "INTEGER"),
        ("latency_plan_ms", "INTEGER"), ("latency_jev_ms", "INTEGER"), ("latency_action_ms", "INTEGER"), ("latency_deepseek_ms", "INTEGER"),
        ("rollout_available", "BOOLEAN"), ("rollout_best", "VARCHAR"), ("rollout_tied", "VARCHAR[]"), ("rollout_best_chosen", "BOOLEAN"),
        ("rollout_best_added", "BOOLEAN"), ("rollout_saturated", "BOOLEAN"), ("rollout_lines", "INTEGER"), ("rollout_horizon", "INTEGER"),
        ("rollout_samples", "INTEGER"), ("rollout_degraded", "INTEGER"), ("rollout_ms", "INTEGER"),
        ("escalated", "BOOLEAN"), ("esc_jev_choice", "VARCHAR"), ("esc_jev_confidence", "DOUBLE"), ("esc_deepseek_choice", "VARCHAR"),
        ("ds_choice", "VARCHAR"), ("ds_effort", "VARCHAR"), ("ds_latency_ms", "INTEGER"), ("ds_tokens", "INTEGER"),
        ("jev_context", "VARCHAR"), ("jev_hints", "VARCHAR[]"), ("route_review", "VARCHAR"),
        ("rationale", "VARCHAR"), ("result", "VARCHAR"),
        # SL (docs/sl.md; SL_ENABLED runs only, else NULL): the attempt at the fight, the reloads so far in the run.
        ("sl_attempt", "INTEGER"), ("sl_reloads", "INTEGER"),
    ],
    "runs_raw": [
        ("off", "BIGINT"), ("len", "INTEGER"), ("run_id", "VARCHAR"), ("ended", "TIMESTAMP"), ("victory", "BOOLEAN"), ("floor", "INTEGER"),
        ("character", "VARCHAR"), ("ascension", "INTEGER"), ("code", "VARCHAR"), ("decisions", "INTEGER"), ("jev_calls", "INTEGER"),
        ("deepseek_calls", "INTEGER"), ("claude_calls", "INTEGER"), ("tokens", "BIGINT"), ("ds_tokens_in", "BIGINT"),
        ("ds_tokens_out", "BIGINT"), ("ds_cache_hit", "BIGINT"), ("deciders", "VARCHAR"), ("death_fight", "VARCHAR[]"), ("arm", "VARCHAR"),
    ],
    "llm_calls_raw": [
        ("src", "VARCHAR"), ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"), ("run_id", "VARCHAR"), ("label", "VARCHAR"),
        ("label_head", "VARCHAR"), ("engine", "VARCHAR"), ("model", "VARCHAR"), ("effort", "VARCHAR"), ("guide", "VARCHAR"),
        ("input_tokens", "INTEGER"), ("cache_hit_tokens", "INTEGER"), ("output_tokens", "INTEGER"), ("reasoning_tokens", "INTEGER"),
        ("cost_usd", "DOUBLE"), ("latency_ms", "INTEGER"), ("attempts", "INTEGER"), ("tool_calls", "INTEGER"), ("fallback_from", "VARCHAR"),
        ("options", "VARCHAR[]"), ("choice", "VARCHAR"), ("reason", "VARCHAR"),
        ("question_chars", "INTEGER"), ("reasoning_chars", "INTEGER"), ("memory_chars", "INTEGER"), ("answer_chars", "INTEGER"),
        ("parse_error", "BOOLEAN"),
        # brain.jsonl only (NULL on deepseek-reasoning rows):
        ("cache_write_tokens", "INTEGER"), ("system_chars", "INTEGER"), ("reasks", "INTEGER"), ("fallback_kind", "VARCHAR"),
        ("error_kind", "VARCHAR"), ("error", "VARCHAR"),
        # brain.jsonl `limits` (codex's usage guard): the plan's fullest window and the credit balance as last read.
        ("limit_used_pct", "DOUBLE"), ("limit_resets_at", "TIMESTAMP"), ("limit_credits", "DOUBLE"),
        # brain.jsonl from 2026-10-03 (NULL before; added without a rebuild, the older rows never had them): the failed
        # primary's wall clock on the fallback's row (the question's time = latency_ms + primary_ms) and the question's id.
        ("primary_ms", "INTEGER"), ("question_id", "VARCHAR"),
    ],
    "run_plans": [
        ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"), ("run_id", "VARCHAR"), ("floor", "INTEGER"), ("trigger", "VARCHAR"),
        ("version", "INTEGER"), ("archetype", "VARCHAR"), ("summary", "VARCHAR"), ("want", "VARCHAR[]"), ("avoid", "VARCHAR[]"),
        ("input_tokens", "INTEGER"), ("output_tokens", "INTEGER"), ("cache_hit_tokens", "INTEGER"), ("reasoning_tokens", "INTEGER"),
        ("latency_ms", "INTEGER"), ("effort", "VARCHAR"), ("error", "VARCHAR"),
    ],
    "run_config": [
        ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"), ("run_id", "VARCHAR"), ("ascension", "INTEGER"), ("character", "VARCHAR"),
        ("floor", "INTEGER"), ("restart", "BOOLEAN"), ("pid", "INTEGER"), ("process_started", "TIMESTAMP"),
        ("code", "VARCHAR"), ("commit", "VARCHAR"), ("dirty", "BOOLEAN"), ("dirty_files", "VARCHAR[]"), ("branch", "VARCHAR"), ("worktree", "VARCHAR"),
        ("brain_active", "BOOLEAN"), ("brain_engine", "VARCHAR"), ("brain_by_prefix", "VARCHAR"), ("brain_fallback", "VARCHAR"),
        ("brain_label", "VARCHAR"), ("brain_engines", "VARCHAR[]"),
        ("claude_model", "VARCHAR"), ("claude_max_calls", "INTEGER"), ("claude_effort", "VARCHAR"),
        ("deepseek_model", "VARCHAR"), ("deepseek_max_calls", "INTEGER"), ("deepseek_effort", "VARCHAR"),
        ("knowledge_prefix", "VARCHAR"), ("prefix_sha", "VARCHAR"), ("prefix_chars", "INTEGER"), ("prefix_tokens_deepseek", "INTEGER"),
        ("prefix_tokens_claude", "INTEGER"), ("system_sha", "VARCHAR"), ("system_chars", "INTEGER"), ("experience_version", "VARCHAR"),
        ("knowledge_error", "VARCHAR"),
        ("jev_enabled", "BOOLEAN"), ("jev_model", "VARCHAR"), ("jev_context", "VARCHAR"),
        ("loop_mode", "VARCHAR"), ("build_decider", "VARCHAR"), ("build_oneshot", "VARCHAR"), ("run_plan", "VARCHAR"), ("fight_plan", "VARCHAR"),
        ("target_ascension", "INTEGER"), ("arm", "VARCHAR"), ("config_sha", "VARCHAR"), ("config", "VARCHAR"),
    ],
    "sl_attempts": [
        ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"), ("run_id", "VARCHAR"), ("act", "VARCHAR"), ("floor", "INTEGER"),
        ("encounter", "VARCHAR"), ("enemies", "VARCHAR[]"), ("fight_kind", "VARCHAR"), ("sl_kind", "VARCHAR"), ("gate", "VARCHAR"), ("elite", "VARCHAR"),
        ("attempt", "INTEGER"), ("max_attempts", "INTEGER"), ("from_point", "VARCHAR"), ("started_at", "TIMESTAMP"), ("ended_at", "TIMESTAMP"),
        ("result", "VARCHAR"), ("turns", "INTEGER"), ("end_hp", "INTEGER"), ("end_block", "INTEGER"), ("incoming", "INTEGER"),
        ("judge_tier", "VARCHAR"), ("judge_reason", "VARCHAR"),
        ("reload_ok", "BOOLEAN"), ("reload_ms", "INTEGER"), ("reload_step", "VARCHAR"), ("reload_reason", "VARCHAR"), ("resumed_turn", "INTEGER"),
        ("give_up_reason", "VARCHAR"), ("potions", "VARCHAR[]"), ("killers", "VARCHAR[]"), ("summary", "VARCHAR"),
    ],
}


def scrub(text, cap=TEXT_CAP):
    """Text safe to store: key-shaped substrings blanked, capped at `cap` characters."""
    if text is None:
        return None
    if not isinstance(text, str):
        text = json.dumps(text, ensure_ascii=False, separators=(",", ":"))
    text = KEY_RE.sub("[REDACTED]", text)
    return text if len(text) <= cap else text[:cap] + "…"


def to_int(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value if -INT_MAX <= value <= INT_MAX else None
    if isinstance(value, float) and value == value:
        return int(value) if -INT_MAX <= value <= INT_MAX else None
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return None
    return None


def to_float(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def to_bool(value):
    return value if isinstance(value, bool) else None


def to_str(value):
    if value is None:
        return None
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def to_ts(value):
    """ISO time as stored in the logs ("2026-09-29T11:43:42.789Z"); anything else -> None (DuckDB parses it)."""
    return value if isinstance(value, str) and len(value) >= 19 and value[4] == "-" and value[10] == "T" else None


def line_ts(raw):
    """The first "ts" of a raw line (used by sync --upto-ts), without parsing it."""
    match = TS_RE.search(raw, 0, 400)
    return match.group(1).decode("ascii", "replace") if match else None


def run_id_of(value):
    return value if isinstance(value, str) and value and value != "run_unknown" else None


def label_head(label):
    return label.split("/", 1)[0] if isinstance(label, str) and label else None


def text_len(value):
    if value is None:
        return None
    return len(value) if isinstance(value, str) else len(json.dumps(value, ensure_ascii=False))


# ---------------------------------------------------------------- states.jsonl -> frames


def parse_state_line(raw):
    """The state entry without its agent_view copy (a second rendering of the same state, about a third of the
    line): the part before `,"agent_view":` closed with "}}". Falls back to the full line."""
    cut = raw.rfind(AGENT_VIEW)
    if cut > 0:
        try:
            return json.loads(raw[:cut] + b"}}")
        except ValueError:
            pass
    return json.loads(raw)


def intent_damage(intents):
    """An enemy's shown attack: damage x max(1, hits) over its intents (the move-model's rule)."""
    total = 0
    for intent in intents or []:
        if isinstance(intent, dict) and isinstance(intent.get("damage"), (int, float)):
            hits = intent.get("hits")
            total += int(intent["damage"]) * max(1, int(hits) if isinstance(hits, (int, float)) else 1)
    return total


def powers_list(entity):
    out = []
    for power in (entity or {}).get("powers") or []:
        if isinstance(power, dict) and power.get("power_id"):
            out.append({"id": power["power_id"], "amount": to_int(power.get("amount"))})
    return out


def frame_row(raw, off):
    entry = parse_state_line(raw)
    state = entry.get("state") if isinstance(entry.get("state"), dict) else {}
    run = state.get("run") if isinstance(state.get("run"), dict) else {}
    act = to_int(run.get("act_id"))
    screen = entry.get("screen") or state.get("screen")
    session = entry.get("session")
    if isinstance(session, dict):
        session = "/".join(str(session.get(k)) for k in ("mode", "phase"))
    row = {
        "off": off,
        "len": len(raw),
        "ts": to_ts(entry.get("ts")),
        "observed_ts": to_ts(entry.get("observed_ts")),
        "observed": to_bool(entry.get("observed")),
        "fingerprint": to_str(entry.get("fingerprint")),
        "screen": to_str(screen),
        "session": to_str(session),
        "run_id": run_id_of(state.get("run_id")),
        "in_combat": to_bool(state.get("in_combat")),
        "turn": to_int(state.get("turn")),
        "character": to_str(run.get("character_id")),
        "ascension": to_int(run.get("ascension")),
        "act": act + 1 if act is not None else None,
        "floor": to_int(run.get("floor")),
        "hp": to_int(run.get("current_hp")),
        "max_hp": to_int(run.get("max_hp")),
        "gold": to_int(run.get("gold")),
        "boss_id": to_str(run.get("boss_id")),
    }
    deck = run.get("deck")
    if isinstance(deck, list):
        cards = [c["card_id"] + ("+" if c.get("upgraded") else "") for c in deck if isinstance(c, dict) and isinstance(c.get("card_id"), str)]
        row["deck"] = cards
        row["deck_size"] = len(cards)
    relics = run.get("relics")
    if isinstance(relics, list):
        row["relics"] = [r["relic_id"] for r in relics if isinstance(r, dict) and isinstance(r.get("relic_id"), str)]
    potions = run.get("potions")
    if isinstance(potions, list):
        row["potions"] = [p["potion_id"] for p in potions if isinstance(p, dict) and p.get("occupied") and isinstance(p.get("potion_id"), str)]
        row["potion_slots"] = len(potions)
    combat = state.get("combat")
    if isinstance(combat, dict) and (screen == "COMBAT" or state.get("in_combat")):
        player = combat.get("player") if isinstance(combat.get("player"), dict) else {}
        row["player_hp"] = to_int(player.get("current_hp"))
        row["block"] = to_int(player.get("block"))
        row["energy"] = to_int(player.get("energy"))
        row["cards_played"] = to_int(player.get("cards_played_this_turn"))
        row["player_powers"] = powers_list(player)
        enemies = []
        incoming = 0
        for position, enemy in enumerate(combat.get("enemies") or []):
            if not isinstance(enemy, dict) or not enemy.get("enemy_id"):
                continue
            alive = enemy.get("is_alive", True)
            damage = intent_damage(enemy.get("intents"))
            if alive:
                incoming += damage
            enemies.append({
                "idx": to_int(enemy.get("index", position)),
                "id": enemy["enemy_id"],
                "hp": to_int(enemy.get("current_hp")),
                "max_hp": to_int(enemy.get("max_hp")),
                "block": to_int(enemy.get("block")),
                "alive": bool(alive),
                "move": to_str(enemy.get("move_id")),
                "intent_dmg": damage,
                "minion": any(p["id"] == "MINION_POWER" for p in powers_list(enemy)),
            })
        row["enemies"] = enemies
        row["incoming"] = incoming
    themap = state.get("map")
    if isinstance(themap, dict) and screen == "MAP":
        current = themap.get("current_node") if isinstance(themap.get("current_node"), dict) else {}
        row["map_row"] = to_int(current.get("row"))
        row["map_col"] = to_int(current.get("col"))
        for node in themap.get("nodes") or []:
            if isinstance(node, dict) and node.get("row") == current.get("row") and node.get("col") == current.get("col"):
                row["map_node"] = to_str(node.get("node_type"))
                break
        row["map_avail"] = [
            {"idx": to_int(node.get("index")), "row": to_int(node.get("row")), "col": to_int(node.get("col")), "type": to_str(node.get("node_type"))}
            for node in themap.get("available_nodes") or [] if isinstance(node, dict)
        ]
    event = state.get("event")
    if isinstance(event, dict):
        row["event_id"] = to_str(event.get("event_id"))
    over = state.get("game_over")
    if isinstance(over, dict):
        row["go_victory"] = to_bool(over.get("is_victory"))
        row["go_floor"] = to_int(over.get("floor"))
    return row


# ---------------------------------------------------------------- decisions.jsonl -> decisions


def slot_ids(field):
    """A fingerprint slot list ("0:BASH:true|1:DEFEND_IRONCLAD:true" or "FIRE_POTION:true:true|:false:false")
    -> {index: id}. Hands carry their index first; potion slots are positional."""
    out = {}
    if not isinstance(field, str) or not field:
        return out
    for position, part in enumerate(field.split("|")):
        bits = part.split(":")
        if len(bits) >= 2 and bits[0].isdigit():
            out[int(bits[0])] = bits[1] or None
        else:
            out[position] = bits[0] or None
    return out


def decision_row(raw, off):
    record = json.loads(raw)
    try:
        fp = json.loads(record.get("fingerprint") or "{}")
        if not isinstance(fp, dict):
            fp = {}
    except (ValueError, TypeError):
        fp = {}
    chosen = record.get("chosen") if isinstance(record.get("chosen"), dict) else {}
    action = chosen.get("action")
    card_index = to_int(chosen.get("card_index"))
    option_index = to_int(chosen.get("option_index"))
    questions = record.get("questions") if isinstance(record.get("questions"), dict) else {}
    answers = record.get("answers") if isinstance(record.get("answers"), dict) else {}
    options = []
    for question in questions.values():
        if isinstance(question, dict) and isinstance(question.get("criteria"), dict):
            options = list(question["criteria"].keys())
            break
    choice = probabilities = None
    for answer in answers.values():
        if isinstance(answer, dict):
            choice = to_str(answer.get("choice"))
            probabilities = to_str(answer.get("probabilities")) if answer.get("probabilities") is not None else None
            break
    usage = record.get("usage") if isinstance(record.get("usage"), dict) else {}
    latency = record.get("latency_ms") if isinstance(record.get("latency_ms"), dict) else {}
    rollout = record.get("rollout") if isinstance(record.get("rollout"), dict) else None
    escalation = record.get("escalation") if isinstance(record.get("escalation"), dict) else None
    deepseek = record.get("deepseek") if isinstance(record.get("deepseek"), dict) else None
    ds = deepseek or escalation or {}
    label = record.get("label")
    row = {
        "off": off,
        "len": len(raw),
        "ts": to_ts(record.get("ts")),
        "observed_ts": to_ts(record.get("observed_ts")),
        "mode": to_str(record.get("mode")),
        "screen": to_str(record.get("screen")),
        "session": to_str(record.get("session")),
        "run_id": run_id_of(record.get("run_id")) or run_id_of(fp.get("run")),
        "floor": to_int(record.get("floor")),
        "turn": to_int(record.get("turn")),
        "label": to_str(label),
        "label_head": label_head(label),
        "decider": to_str(record.get("decider")),
        "action": to_str(action),
        "option_index": option_index,
        "card_index": card_index,
        "target_index": to_int(chosen.get("target_index")),
        "card_id": slot_ids(fp.get("hand")).get(card_index) if action == "play_card" and card_index is not None else None,
        "potion_id": slot_ids(fp.get("potions")).get(option_index) if action in ("use_potion", "discard_potion") and option_index is not None else None,
        "chosen": scrub(record.get("chosen")) if record.get("chosen") is not None else None,
        "questions": list(questions.keys()),
        "options": options,
        "choice": choice,
        "probabilities": probabilities,
        "confidence": to_float(record.get("confidence")),
        "fallback": to_bool(record.get("fallback")),
        "reasked": to_bool(record.get("reasked")),
        "no_jev": to_bool(record.get("no_jev")),
        "reused_answer": to_bool(record.get("reused_answer")),
        "hp": to_int(fp.get("hp")),
        "max_hp": to_int(fp.get("maxHp")),
        "gold": to_int(fp.get("gold")),
        "input_tokens": to_int(usage.get("input_tokens")),
        "output_tokens": to_int(usage.get("output_tokens")),
        "cache_hit_tokens": to_int(usage.get("cache_hit_tokens")),
        "reasoning_tokens": to_int(usage.get("reasoning_tokens")),
        "latency_plan_ms": to_int(latency.get("plan")),
        "latency_jev_ms": to_int(latency.get("jev")),
        "latency_action_ms": to_int(latency.get("action")),
        "latency_deepseek_ms": to_int(latency.get("deepseek")),
        "escalated": escalation is not None,
        "jev_context": to_str(record.get("jev_context")),
        "jev_hints": [h for h in record.get("jev_hints") or [] if isinstance(h, str)] if isinstance(record.get("jev_hints"), list) else None,
        "route_review": to_str((record.get("route_review") or {}).get("outcome")) if isinstance(record.get("route_review"), dict) else None,
        "rationale": scrub(record.get("rationale")),
        "result": scrub(record.get("result"), 500),
        "sl_attempt": to_int(record.get("sl_attempt")),
        "sl_reloads": to_int(record.get("sl_reloads")),
    }
    if rollout is not None:
        tied = rollout.get("tied")
        row.update({
            "rollout_available": to_bool(rollout.get("available")),
            "rollout_best": to_str(rollout.get("best")),
            "rollout_tied": [t for t in tied if isinstance(t, str)] if isinstance(tied, list) else None,
            "rollout_best_chosen": to_bool(record.get("rollout_best_chosen")),
            "rollout_best_added": to_bool(rollout.get("best_added")),
            "rollout_saturated": to_bool(rollout.get("saturated")),
            "rollout_lines": to_int(rollout.get("lines")),
            "rollout_horizon": to_int(rollout.get("horizon")),
            "rollout_samples": to_int(rollout.get("samples")),
            "rollout_degraded": len(rollout["degraded"]) if isinstance(rollout.get("degraded"), list) else None,
            "rollout_ms": to_int(rollout.get("ms")),
        })
    if escalation is not None:
        row.update({
            "esc_jev_choice": to_str(escalation.get("jev_choice")),
            "esc_jev_confidence": to_float(escalation.get("jev_confidence")),
            "esc_deepseek_choice": to_str(escalation.get("deepseek_choice")),
        })
    if ds:
        row.update({
            "ds_choice": to_str(ds.get("choice") if deepseek else ds.get("deepseek_choice")),
            "ds_effort": to_str(ds.get("effort")),
            "ds_latency_ms": to_int(ds.get("latency_ms")),
            "ds_tokens": to_int(ds.get("tokens")),
        })
    return row


# ---------------------------------------------------------------- runs.jsonl -> runs_raw


def run_row(raw, off):
    record = json.loads(raw)
    run_id = run_id_of(record.get("run_id"))
    if not run_id:
        return None
    deaths = record.get("death_fight")
    return {
        "off": off,
        "len": len(raw),
        "run_id": run_id,
        "ended": to_ts(record.get("ended")),
        "victory": to_bool(record.get("victory")),
        "floor": to_int(record.get("floor")),
        "character": to_str(record.get("character")),
        "ascension": to_int(record.get("ascension")),
        "code": to_str(record.get("code")),
        "decisions": to_int(record.get("decisions")),
        "jev_calls": to_int(record.get("jev_calls")),
        "deepseek_calls": to_int(record.get("deepseek_calls")),
        "claude_calls": to_int(record.get("claude_calls")),
        "tokens": to_int(record.get("tokens")),
        "ds_tokens_in": to_int(record.get("ds_tokens_in")),
        "ds_tokens_out": to_int(record.get("ds_tokens_out")),
        "ds_cache_hit": to_int(record.get("ds_cache_hit")),
        "deciders": to_str(record.get("deciders")) if record.get("deciders") is not None else None,
        "death_fight": [d for d in deaths if isinstance(d, str)] if isinstance(deaths, list) else None,
        "arm": to_str(record.get("arm")),
    }


# ---------------------------------------------------------------- deepseek-reasoning.jsonl, brain.jsonl -> llm_calls_raw


def deepseek_call_row(raw, off):
    record = json.loads(raw)
    usage = record.get("usage") if isinstance(record.get("usage"), dict) else {}
    memory_chars = to_int(record.get("memory_chars"))
    if memory_chars is None and record.get("memory") is not None:
        memory_chars = text_len(record.get("memory"))
    options = record.get("options")
    label = record.get("label")
    return {
        "src": "deepseek-reasoning",
        "off": off,
        "len": len(raw),
        "ts": to_ts(record.get("ts")),
        "run_id": run_id_of(record.get("run_id")),
        "label": to_str(label),
        "label_head": label_head(label),
        "engine": "deepseek",
        "model": to_str(record.get("model")),
        "effort": to_str(record.get("effort")),
        "guide": to_str(record.get("guide")),
        "input_tokens": to_int(usage.get("input_tokens")),
        "cache_hit_tokens": to_int(usage.get("cache_hit_tokens")),
        "output_tokens": to_int(usage.get("output_tokens")),
        "reasoning_tokens": to_int(usage.get("reasoning_tokens")),
        "latency_ms": to_int(record.get("latency_ms")),
        "attempts": 1,
        "options": [to_str(o) for o in options] if isinstance(options, list) else None,
        "choice": to_str(record.get("choice")),
        "reason": scrub(record.get("reason"), 1000),
        "question_chars": text_len(record.get("question")),
        "reasoning_chars": text_len(record.get("reasoning")),
        "memory_chars": memory_chars,
        "answer_chars": text_len(record.get("answer")),
        "parse_error": record.get("parse_error") is not None,
    }


def memory_size(memory):
    """Characters of a run memory: a string, or named sections (the sum of their lengths, like v3's memoryChars)."""
    if isinstance(memory, dict):
        return sum(len(v) if isinstance(v, str) else text_len(v) for v in memory.values() if v is not None)
    return text_len(memory)


def brain_call_row(raw, off):
    """logs/brain.jsonl: one row per brain question, as src/brain/router.ts writes it (BrainLogRow): ts, label,
    engine, model, system_sha, system_chars, memory (string or sections), question, options {key: criteria},
    payload, tools, tool_calls [...], answer (null when it failed), problems, reasks, attempts, latency_ms,
    usage {inputTokens, cacheHitTokens?, cacheWriteTokens?, outputTokens, reasoningTokens?, costUsd?},
    first?, fell_back_from? {engine, error, kind}, primary_ms? (the failed primary's wall clock, on the fallback's row
    when the primary failed as an engine), primary_usage?, question_id?, error?, error_kind?, raw?, reasoning_chars?,
    limits? {used_pct, resets_at, credits, ...} (src/brain/engines/codex-usage.ts usageNote: the codex plan's fullest
    window as last read).
    The router writes no run id (llm_calls gives the row its run by time) and no effort. Usage covers every
    model call of the question (re-asks summed); inputTokens counts cached tokens too."""
    record = json.loads(raw)
    usage = record.get("usage") if isinstance(record.get("usage"), dict) else {}
    answer = record.get("answer")
    fell = record.get("fell_back_from") if isinstance(record.get("fell_back_from"), dict) else {}
    tool_calls = record.get("tool_calls")
    label = record.get("label")
    options = record.get("options")
    if isinstance(options, dict):
        options = list(options.keys())
    error = record.get("error")
    reasoning_chars = to_int(record.get("reasoning_chars"))
    if reasoning_chars is None and record.get("reasoning") is not None:
        reasoning_chars = text_len(record.get("reasoning"))
    limits = record.get("limits") if isinstance(record.get("limits"), dict) else {}
    return {
        "src": "brain",
        "off": off,
        "len": len(raw),
        "ts": to_ts(record.get("ts")),
        "run_id": run_id_of(record.get("run_id")),
        "label": to_str(label),
        "label_head": label_head(label),
        "engine": to_str(record.get("engine")),
        "model": to_str(record.get("model")),
        "effort": to_str(record.get("effort")),
        "guide": to_str(record.get("system_sha")),
        "input_tokens": to_int(usage.get("inputTokens")),
        "cache_hit_tokens": to_int(usage.get("cacheHitTokens")),
        "output_tokens": to_int(usage.get("outputTokens")),
        "reasoning_tokens": to_int(usage.get("reasoningTokens")),
        "cost_usd": to_float(usage.get("costUsd")),
        "latency_ms": to_int(record.get("latency_ms")),
        "attempts": to_int(record.get("attempts")),
        "tool_calls": len(tool_calls) if isinstance(tool_calls, list) else None,
        "fallback_from": to_str(fell.get("engine")) if fell else None,
        "options": [to_str(o) for o in options] if isinstance(options, list) else None,
        "choice": to_str(answer.get("choice")) if isinstance(answer, dict) and answer.get("choice") is not None else None,
        "reason": scrub(answer.get("reason"), 1000) if isinstance(answer, dict) and answer.get("reason") is not None else None,
        "question_chars": text_len(record.get("question")),
        "reasoning_chars": reasoning_chars,
        "memory_chars": memory_size(record.get("memory")),
        "answer_chars": text_len(answer),
        # No usable answer and no engine error: the model answered, but the answer failed parsing or validation.
        "parse_error": answer is None and not error,
        "cache_write_tokens": to_int(usage.get("cacheWriteTokens")),
        "system_chars": to_int(record.get("system_chars")),
        "reasks": to_int(record.get("reasks")),
        "fallback_kind": to_str(fell.get("kind")) if fell else None,
        "error_kind": to_str(record.get("error_kind")),
        "error": scrub(error, 500) if error else None,
        "limit_used_pct": to_float(limits.get("used_pct")),
        "limit_resets_at": to_ts(limits.get("resets_at")),
        "limit_credits": to_float(limits.get("credits")),
        "primary_ms": to_int(record.get("primary_ms")),
        "question_id": to_str(record.get("question_id")),
    }


# ---------------------------------------------------------------- run-plans.jsonl -> run_plans


def run_plan_row(raw, off):
    record = json.loads(raw)
    plan = record.get("plan") if isinstance(record.get("plan"), dict) else {}
    want = plan.get("want")
    avoid = plan.get("avoid")
    return {
        "off": off,
        "len": len(raw),
        "ts": to_ts(record.get("ts")),
        "run_id": run_id_of(record.get("run")),
        "floor": to_int(record.get("floor")),
        "trigger": to_str(record.get("trigger")),
        "version": to_int(record.get("version")),
        "archetype": scrub(plan.get("archetype"), 500),
        "summary": scrub(plan.get("summary"), 1500),
        "want": [w for w in want if isinstance(w, str)] if isinstance(want, list) else None,
        "avoid": [a for a in avoid if isinstance(a, str)] if isinstance(avoid, list) else None,
        "input_tokens": to_int(record.get("input_tokens")),
        "output_tokens": to_int(record.get("output_tokens")),
        "cache_hit_tokens": to_int(record.get("cache_hit_tokens")),
        "reasoning_tokens": to_int(record.get("reasoning_tokens")),
        "latency_ms": to_int(record.get("latency_ms")),
        "effort": to_str(record.get("effort")),
        "error": scrub(record.get("error"), 500),
    }


# ---------------------------------------------------------------- run-config.jsonl -> run_config


def as_dict(value):
    return value if isinstance(value, dict) else {}


def brain_label(brain):
    """A short name for a brain setup, for grouping: the default engine with its model, then each question kind
    (label prefix) answered by another engine or model, e.g. "deepseek:deepseek-flash; MAP=claude:claude-opus-5-5"
    (kinds with the same engine and model joined: "EVENT,MAP=..."). "none" when the run had no brain (no DeepSeek)."""
    if not isinstance(brain, dict) or not brain.get("engine"):
        return None
    if brain.get("active") is False:
        return "none"
    engines = as_dict(brain.get("engines"))
    default = brain["engine"]
    by_prefix = as_dict(brain.get("by_prefix"))

    def token(engine, prefix=None):
        spec = as_dict(engines.get(engine))
        model = (as_dict(spec.get("model_by_prefix")).get(prefix) if prefix else None) or spec.get("model")
        return f"{engine}:{model}" if model else str(engine)

    base = token(default)
    prefixes = set(by_prefix) | {p for spec in engines.values() for p in as_dict(as_dict(spec).get("model_by_prefix"))}
    kinds = {}
    for prefix in sorted(prefixes):
        engine = by_prefix.get(prefix, default)
        name = token(engine, prefix)
        if name != base:
            kinds.setdefault(name, []).append(prefix)
    return "; ".join([base] + [f"{','.join(ps)}={name}" for name, ps in sorted(kinds.items(), key=lambda kv: kv[1])])


def run_config_row(raw, off):
    """logs/run-config.jsonl: one row per run (a second one when a restarted process ran it with another setup), as
    src/eye/run-config.ts writes it (RunConfigRow): run, code, brain engines and models, knowledge prompt
    hashes and sizes, Jev and loop settings, config_sha. It holds no key (the writer checks); `config` keeps the
    whole row as JSON text (scrubbed) for ad-hoc json_extract queries."""
    record = json.loads(raw)
    code = as_dict(record.get("code"))
    brain = as_dict(record.get("brain"))
    engines = as_dict(brain.get("engines"))
    claude = as_dict(engines.get("claude"))
    knowledge = as_dict(record.get("knowledge"))
    tokens = as_dict(knowledge.get("prefix_tokens_est"))
    deepseek = as_dict(record.get("deepseek"))
    jev = as_dict(record.get("jev"))
    loop = as_dict(record.get("loop"))
    proc = as_dict(record.get("process"))
    files = code.get("dirty_files")
    by_prefix = brain.get("by_prefix")
    return {
        "off": off,
        "len": len(raw),
        "ts": to_ts(record.get("ts")),
        "run_id": run_id_of(record.get("run_id")),
        "ascension": to_int(record.get("ascension")),
        "character": to_str(record.get("character")),
        "floor": to_int(record.get("floor")),
        "restart": to_bool(record.get("restart")),
        "pid": to_int(proc.get("pid")),
        "process_started": to_ts(proc.get("started")),
        "code": to_str(code.get("code")),
        "commit": to_str(code.get("commit")),
        "dirty": to_bool(code.get("dirty")),
        "dirty_files": [f for f in files if isinstance(f, str)] if isinstance(files, list) else None,
        "branch": to_str(code.get("branch")),
        "worktree": to_str(code.get("worktree")),
        "brain_active": to_bool(brain.get("active")),
        "brain_engine": to_str(brain.get("engine")),
        "brain_by_prefix": json.dumps(by_prefix, sort_keys=True, separators=(",", ":")) if isinstance(by_prefix, dict) else None,
        "brain_fallback": to_str(brain.get("fallback")),
        "brain_label": brain_label(brain) if brain else None,
        "brain_engines": sorted(engines) if engines else None,
        "claude_model": to_str(claude.get("model")),
        "claude_max_calls": to_int(claude.get("max_calls")),
        "claude_effort": to_str(claude.get("effort")),
        "deepseek_model": to_str(deepseek.get("model")),
        "deepseek_max_calls": to_int(deepseek.get("max_calls")),
        "deepseek_effort": to_str(deepseek.get("reasoning_effort")),
        "knowledge_prefix": to_str(knowledge.get("prefix")),
        "prefix_sha": to_str(knowledge.get("prefix_sha")),
        "prefix_chars": to_int(knowledge.get("prefix_chars")),
        "prefix_tokens_deepseek": to_int(tokens.get("deepseek")),
        "prefix_tokens_claude": to_int(tokens.get("claude")),
        "system_sha": to_str(knowledge.get("system_sha")),
        "system_chars": to_int(knowledge.get("system_chars")),
        "experience_version": to_str(knowledge.get("experience_version")),
        "knowledge_error": scrub(knowledge.get("error"), 500) if knowledge.get("error") else None,
        "jev_enabled": to_bool(jev.get("enabled")),
        "jev_model": to_str(jev.get("model")),
        "jev_context": to_str(jev.get("context")),
        "loop_mode": to_str(loop.get("mode")),
        "build_decider": to_str(loop.get("build_decider")),
        "build_oneshot": to_str(loop.get("build_oneshot")),
        "run_plan": to_str(loop.get("run_plan")),
        "fight_plan": to_str(loop.get("fight_plan")),
        "target_ascension": to_int(record.get("target_ascension")),
        "arm": to_str(record.get("arm")),
        "config_sha": to_str(record.get("config_sha")),
        "config": scrub(record, 8000),
    }


# ---------------------------------------------------------------- sl-attempts.jsonl -> sl_attempts


def str_list(value):
    return [v for v in value if isinstance(v, str)] if isinstance(value, list) else None


def sl_gate(record):
    """Why the fight got SL: the row's `gate` (2026-10-03 on); earlier rows had only a boss or a listed hard fight."""
    gate = to_str(record.get("gate"))
    if gate is not None:
        return gate
    if record.get("fight_kind") == "boss":
        return "boss"
    return "hard-fight" if to_str(record.get("elite")) is not None else None


def sl_attempt_row(raw, off):
    """One SL attempt (src/sl/attempts.ts SlAttemptRow): a boss or listed-elite fight's attempt, how it ended, the reload.

    fight_kind as the row writes it: the room (boss / elite / hallway / event) from 2026-10-04, before that boss or elite
    (every SL fight but a boss). sl_kind keeps the earlier meaning for every row (boss, else elite), gate why it got SL.
    """
    record = json.loads(raw)
    judge = as_dict(record.get("judge"))
    reload = record.get("reload") if isinstance(record.get("reload"), dict) else None
    summary = as_dict(record.get("summary"))
    return {
        "off": off,
        "len": len(raw),
        "ts": to_ts(record.get("ts")),
        "run_id": run_id_of(record.get("run_id")),
        "act": to_str(record.get("act")),
        "floor": to_int(record.get("floor")),
        "encounter": to_str(record.get("encounter")),
        "enemies": str_list(record.get("enemies")),
        "fight_kind": to_str(record.get("fight_kind")),
        "sl_kind": None if record.get("fight_kind") is None else ("boss" if record.get("fight_kind") == "boss" else "elite"),
        "gate": sl_gate(record),
        "elite": to_str(record.get("elite")),
        "attempt": to_int(record.get("attempt")),
        "max_attempts": to_int(record.get("max_attempts")),
        "from_point": to_str(record.get("from")),
        "started_at": to_ts(record.get("started_at")),
        "ended_at": to_ts(record.get("ended_at")),
        "result": to_str(record.get("result")),
        "turns": to_int(record.get("turns")),
        "end_hp": to_int(record.get("end_hp")),
        "end_block": to_int(record.get("end_block")),
        "incoming": to_int(record.get("incoming")),
        "judge_tier": to_str(judge.get("tier")),
        "judge_reason": scrub(judge.get("reason"), 500) if judge.get("reason") is not None else None,
        "reload_ok": to_bool(reload.get("ok")) if reload else None,
        "reload_ms": to_int(reload.get("ms")) if reload else None,
        "reload_step": to_str(reload.get("step")) if reload else None,
        "reload_reason": scrub(reload.get("reason"), 500) if reload and reload.get("reason") is not None else None,
        "resumed_turn": to_int(reload.get("resumed_turn")) if reload else None,
        "give_up_reason": scrub(record.get("give_up_reason"), 500) if record.get("give_up_reason") is not None else None,
        "potions": str_list(summary.get("potions")),
        "killers": str_list(summary.get("killers")),
        "summary": scrub(json.dumps(summary, ensure_ascii=False), 8000) if summary else None,
    }


# source key -> (file name in logs/, table, extractor)
SOURCES = {
    "states": ("states.jsonl", "frames", frame_row),
    "decisions": ("decisions.jsonl", "decisions", decision_row),
    "runs": ("runs.jsonl", "runs_raw", run_row),
    "deepseek-reasoning": ("deepseek-reasoning.jsonl", "llm_calls_raw", deepseek_call_row),
    "brain": ("brain.jsonl", "llm_calls_raw", brain_call_row),
    "run-plans": ("run-plans.jsonl", "run_plans", run_plan_row),
    "run-config": ("run-config.jsonl", "run_config", run_config_row),
    "sl-attempts": ("sl-attempts.jsonl", "sl_attempts", sl_attempt_row),
}
