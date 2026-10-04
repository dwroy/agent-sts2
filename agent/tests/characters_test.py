"""Multi-character knowledge (2026-10-04): knowledge/builders/characters.py (whose run a log row is; a row naming none is
the Ironclad's), the monster DB split into knowledge/common/monster-db.json + knowledge/characters/<id>/monster-records.json
and its merge back into the old shape (the TS loader's), and the per-character filter of the outcome stats."""
import contextlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
BUILDERS = os.path.join(ROOT, "knowledge", "builders")
sys.path.insert(0, BUILDERS)
import characters  # noqa: E402


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class CharactersTest(unittest.TestCase):
    def test_ids_and_legacy_rows(self):
        self.assertEqual(characters.character_key("SILENT"), "silent")
        self.assertIsNone(characters.character_key(""))
        self.assertEqual(characters.run_character({"character": "IRONCLAD"}), "ironclad")
        self.assertEqual(characters.run_character({"character_id": "SILENT", "floor": 3}), "silent")
        # Every run before the Silent was the Ironclad's; the oldest rows name no character.
        self.assertEqual(characters.run_character({"run_id": "OLD"}), "ironclad")
        self.assertEqual(characters.run_character({"character": None}), "ironclad")
        self.assertIsNone(characters.run_character(None))  # a menu state: no run, no character
        self.assertEqual(characters.character_dir("/p", "silent"), os.path.join("/p", "knowledge", "characters", "silent"))

    def test_characters_with_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "runs.jsonl")
            with open(path, "w", encoding="utf8") as handle:
                handle.write(json.dumps({"run_id": "A"}) + "\n" + json.dumps({"run_id": "B", "character": "SILENT"}) + "\nnot json\n")
            self.assertEqual(characters.characters_with_runs(path), ["ironclad", "silent"])
            self.assertEqual(characters.characters_with_runs(os.path.join(tmp, "none.jsonl")), [])


class MonsterDbSplitTest(unittest.TestCase):
    def test_merge_puts_records_back_in_the_old_shape(self):
        bmd = load("build_monster_db", os.path.join(BUILDERS, "build-monster-db.py"))
        common = {"meta": {"note": "m"}, "monsters": {
            "A": {"name": {}, "moves": {}, "powers": {"P": {}}, "provenance": {"n_runs": 1}},
            "B": {"name": {}, "moves": {}, "powers": {}, "provenance": {"n_runs": 1}, "observed": {"x": 1}}}, "observed": {"note": "o"}}
        records = {"meta": {"character": "silent"}, "bosses": {"Q": {}}, "encounters": {"A": {}}, "threat_by_asc": {"A": {"8": {"fights": 1}}}}
        merged = bmd.merge_records(common, records)
        self.assertEqual(list(merged), ["meta", "bosses", "encounters", "monsters", "observed"])
        self.assertEqual(merged["meta"], common["meta"])  # the common file's meta (every character's fights)
        self.assertEqual(list(merged["monsters"]["A"]), ["name", "moves", "powers", "threat_by_asc", "provenance"])
        self.assertEqual(merged["monsters"]["A"]["threat_by_asc"], {"8": {"fights": 1}})
        self.assertEqual(merged["monsters"]["B"]["threat_by_asc"], {})  # never met by this character
        self.assertEqual(list(merged["monsters"]["B"])[-1], "observed")
        self.assertNotIn("threat_by_asc", common["monsters"]["A"])  # the common dict is not changed

    def test_builder_self_tests(self):
        # build-monster-db's self-test builds the split from a synthetic log with an Ironclad and a Silent run;
        # build-outcome-stats' keeps a Silent run out of the Ironclad's tables.
        for name, script in (("build_monster_db", "build-monster-db.py"), ("build_outcome_stats", "build-outcome-stats.py")):
            mod = load(name, os.path.join(BUILDERS, script))
            with contextlib.redirect_stdout(io.StringIO()) as out:
                self.assertEqual(mod.self_test(), 0, script)
            self.assertIn("self-test ok", out.getvalue())


if __name__ == "__main__":
    unittest.main()
