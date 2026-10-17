"""Which character a log row belongs to, shared by the builders, ops and the top-level metrics (multi-character, Roy
2026-10-04: the Silent is played next to the Ironclad, and every number we learn stays the character's own).

The knowledge id is the game's character_id lower-cased ("IRONCLAD" -> "ironclad", "SILENT" -> "silent"), the same as
the TS side's; a character's knowledge lives in knowledge/characters/<id>/, the character-independent facts in
knowledge/common/. logs/runs.jsonl rows carry "character": "IRONCLAD", states carry state.run.character_id. Every run
logged before the Silent (2026-10-04) was the Ironclad, and the oldest rows carry no character at all: a run row or a
state's run without one is the Ironclad's (a historical fact, not a guess). A menu state (run null) has no character.
"""
import json
import os

LEGACY = "ironclad"  # the character of every row that names none (all runs before 2026-10-04)

# The characters' Chinese names (the game's zh text), for notes written in Chinese.
NAMES_ZH = {"ironclad": "铁甲战士", "silent": "静默猎手", "regent": "储君", "necrobinder": "亡灵契约师", "defect": "故障机器人"}


def character_key(raw):
    """The knowledge id of a game character_id ("SILENT" -> "silent"); None when there is none."""
    if not isinstance(raw, str) or not raw.strip():
        return None
    return raw.strip().lower()


def run_character(run):
    """The character of a runs.jsonl row or a state's `run` dict: its "character" / "character_id", the Ironclad
    when it names none (legacy rows); None for no run at all (a menu state)."""
    if not isinstance(run, dict):
        return None
    return character_key(run.get("character")) or character_key(run.get("character_id")) or LEGACY


def characters_with_runs(runs_path):
    """The sorted ids of the characters with at least one row in runs.jsonl ([] when the file is missing)."""
    found = set()
    if runs_path and os.path.exists(runs_path):
        with open(runs_path, encoding="utf8") as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                except ValueError:
                    continue
                if isinstance(row, dict) and row.get("run_id"):
                    found.add(run_character(row))
    return sorted(found)


def character_dir(root, character):
    """knowledge/characters/<id>/ under the project root."""
    return os.path.join(root, "knowledge", "characters", character)


def env_character():
    """The CHARACTER environment variable as a knowledge id (ops' and metrics' default filter), None when unset."""
    return character_key(os.environ.get("CHARACTER"))
