import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('sts2fun', Path(__file__).parents[1] / 'sts2fun_stats.py')
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class ExternalStatsTests(unittest.TestCase):
    def test_sqlite_denies_players_and_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'fixture.db'
            c = sqlite3.connect(path)
            c.executescript('CREATE TABLE runs (player_id INTEGER); CREATE TABLE players (username TEXT);')
            c.close()
            c = M.connect(path)
            self.assertEqual(c.execute('SELECT player_id FROM runs').fetchall(), [])
            with self.assertRaises(sqlite3.DatabaseError):
                c.execute('SELECT username FROM players')
            with self.assertRaises(sqlite3.DatabaseError):
                c.execute('INSERT INTO runs VALUES (1)')
            c.close()

    def test_shop_choices_and_multiroom_damage_never_become_rewards_or_fights(self):
        choices = [dict(card={'id': 'CARD.'+c}, was_picked=False) for c in ('A','B','C')]
        stat = dict(card_choices=choices, damage_taken=8, current_hp=20)
        raw = dict(players=[dict(deck=[dict(id='CARD.A')], relics=[])], map_point_history=[[
            dict(player_stats=[stat], rooms=[dict(room_type='shop')]),
            dict(player_stats=[stat], rooms=[dict(room_type='elite', model_id='E', turns_taken=3)]),
            dict(player_stats=[stat], rooms=[dict(room_type='boss', turns_taken=3), dict(room_type='boss', turns_taken=7)])]])
        r = M.lean_run(1, 'v0.111', True, json.dumps(raw))
        self.assertEqual(r['offers'], [(1, 2, [('A', False), ('B', False), ('C', False)])])
        self.assertEqual(r['fights'], [(1, 'E', 'elite', 8, 3, False)])
        self.assertEqual(r['audit']['noncombat_choice_screen_excluded'], 2)
        self.assertEqual(r['audit']['multi_room_fight_excluded'], 1)
        raw['map_point_history'][0][1]['player_stats'][0]['card_choices'] = choices * 2
        r = M.lean_run(1, 'v0.111', True, json.dumps(raw))
        self.assertEqual(r['offers'], [])
        self.assertEqual(r['audit']['invalid_or_duplicate_choice_screen'], 1)

    def test_within_player_adjustment_removes_between_player_perfect_confounding(self):
        runs = []
        for player, win, choices in [(1, 1, [True]*9+[False]), (2, 0, [True]+[False]*9)]:
            for picked in choices:
                runs.append(dict(pid=player, win=win, offers=[(1, 2, [('A', picked)])]))
        rows, skips = M.card_rows(runs, M.Inference({1, 2}, reps=100))
        row = next(r for r in rows if r['act'] == 'all')
        self.assertAlmostEqual(row['win_difference'], .8)
        self.assertEqual(row['player_act_adjusted_difference'], 0)
        self.assertEqual(row['adjusted_cluster_ci'], [0, 0])
        self.assertEqual(row['frequent_player_offers'], 20)
        self.assertEqual(next(r for r in skips if r['act']=='all')['rate'], .5)

    def test_cluster_geometry_has_no_outcome_input_and_normalizes_duplicate_cards(self):
        vectors = [dict(A=1.), dict(A=1.), dict(B=1.), dict(B=1.)]
        centers, objective = M.fit(vectors, 2, 24)
        self.assertAlmostEqual(objective, 4)
        self.assertEqual({tuple(sorted(x)) for x in centers}, {('A',), ('B',)})

    def test_own_first_accepted_screen_and_version_freezes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'logs').mkdir()
            run = dict(run_id='internal', character='SILENT', ascension=10)
            (root/'logs/runs.jsonl').write_text(json.dumps(run)+'\n')
            row = dict(run_id='internal', label='reward/card', engine='codex',
                       payload=dict(facts=dict(act=1, floor=2)),
                       options=dict(card0=json.dumps(dict(card='Alpha'))), answer=dict(choice='card0'))
            bad = {**row, 'accepted': False}
            (root/'logs/brain.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in (bad,row,row)))
            cards, acts, audit, manifest = M.own_picks(root, dict(collections=dict(cards=[dict(id='A',name='Alpha')])))
            self.assertEqual(cards['A'], [1,1])
            self.assertEqual(audit['revisit_or_duplicate'], 1)
            self.assertEqual(audit['unsuccessful_or_non_codex'], 1)
            self.assertEqual(manifest['unique_runs_with_picks'], 1)
            with (root/'logs/brain.jsonl').open('a') as f:
                f.write('broken\n[]\n'+json.dumps({**row, 'payload':dict(facts=dict(act=2,floor=4))})+'\n{"partial":')
            catalog = dict(collections=dict(cards=[dict(id='A',name='Alpha')]))
            replay = M.own_picks(root, catalog, manifest['files'])
            self.assertEqual(replay[0], cards)
            self.assertEqual(replay[3]['files'], manifest['files'])
            current = M.own_picks(root, catalog)
            self.assertEqual(current[0]['A'], [2,2])
            self.assertEqual(current[3]['parse_audit']['brain.jsonl'], dict(invalid_json=1,non_object=1,partial_tail=1))
            frozen = manifest['files']
            frozen['brain.jsonl']['prefix_sha256'] = '0'*64
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                M.own_picks(root, catalog, frozen)


if __name__ == '__main__':
    unittest.main()
