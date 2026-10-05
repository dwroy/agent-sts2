"""CSBR5CRDWQNB F17 T9: final combat HP survives the transition to REWARD. Fixed data only."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("monster_terminal", ROOT / "knowledge/builders/build-monster-db.py")
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)


def entry(screen, hp, turn=9, combat_hp=None, floor=17, character="SILENT"):
    run = {"character_id": character, "act_id": "0", "floor": floor, "ascension": 2,
           "current_hp": hp, "boss_id": "WATERFALL_GIANT_BOSS", "relics": []}
    combat = None if combat_hp is None else {"player": {"current_hp": combat_hp, "powers": []}, "enemies": []}
    if screen == "COMBAT":
        combat["enemies"] = [{"enemy_id": "WATERFALL_GIANT", "index": 0, "current_hp": 240,
                              "max_hp": 240, "is_alive": True, "move_id": "RAM_MOVE", "powers": [], "intents": []}]
    return {"ts": f"2026-10-04T22:21:{turn:02d}Z", "state": {"run_id": "CSBR5CRDWQNB", "screen": screen,
            "turn": turn, "in_combat": screen == "COMBAT", "run": run, "combat": combat}}


class TerminalHpTest(unittest.TestCase):
    def records(self, endpoint=30, floor=17, character="SILENT", before=47, post=30):
        db.MECHANICS = db.Mechanics()
        builder = db.Builder()
        builder.feed("COMBAT", entry("COMBAT", 70, turn=1, combat_hp=70, character=character))
        builder.feed("COMBAT", entry("COMBAT", before, combat_hp=before, character=character))
        builder.feed("REWARD", entry("REWARD", post, combat_hp=endpoint, floor=floor, character=character))
        builder.finish()
        return db.records_output(builder, character.lower())

    def test_reward_terminal_hp_reaches_boss_encounter_and_monster_statistics(self):
        records = self.records()
        boss = records["bosses"]["WATERFALL_GIANT"]["2"]
        self.assertEqual(boss["hp_loss_won"], {"median": 40.0, "p75": 40.0, "n": 1})
        self.assertEqual(boss["hp_loss_per_turn"]["median"], 4.4)
        for table in (records["encounters"]["WATERFALL_GIANT"]["by_asc"], records["threat_by_asc"]["WATERFALL_GIANT"]):
            self.assertEqual(table["2"]["hp_loss_won"]["median"], 40)
            self.assertEqual(table["2"]["net_hp_loss_won"]["median"], 40)

    def test_healed_ironclad_endpoint_keeps_pre_heal_loss_separate_from_net_loss(self):
        records = self.records(endpoint=56, character="IRONCLAD", before=50, post=56)
        encounter = records["encounters"]["WATERFALL_GIANT"]["by_asc"]["2"]
        self.assertEqual(encounter["hp_loss_won"]["median"], 20)
        self.assertEqual(encounter["net_hp_loss_won"]["median"], 14)

    def test_absent_or_different_room_combat_snapshot_does_not_invent_final_damage(self):
        for endpoint, floor in ((None, 17), (30, 18)):
            with self.subTest(endpoint=endpoint, floor=floor):
                records = self.records(endpoint=endpoint, floor=floor)
                self.assertEqual(records["bosses"]["WATERFALL_GIANT"]["2"]["hp_loss_won"]["median"], 23)


if __name__ == "__main__":
    unittest.main()
