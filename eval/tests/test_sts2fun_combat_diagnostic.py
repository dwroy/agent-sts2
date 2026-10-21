import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parents[1]))
import sts2fun_combat_diagnostic as M


def segment(**kw):
    return dict(fight_no=1, outcome='won', turns=4, net_hp_loss=-2,
                entry_hp=40, max_hp=70, deck_size=19, first_turn=1, **kw)


def attempt(result, number=1):
    return dict(ts=str(number), off=number, result=result, attempt=number)


class CombatDiagnosticTests(unittest.TestCase):
    def test_sl_predicted_death_is_not_an_actual_death(self):
        r = M.outcomes([segment()], [attempt('predicted_death'), attempt('won', 2)])
        self.assertIs(r['death'], False)
        self.assertIs(r['first_failure'], True)
        self.assertIs(r['predicted_first'], True)
        self.assertIsNone(r['turns'])
        self.assertIsNone(r['net_hp'])
        r = M.outcomes([segment()], [attempt('predicted_death')])
        self.assertIsNone(r['death'])
        r = M.outcomes([segment()], [attempt('won'), attempt('unfinished', 2)])
        self.assertIsNone(r['death'])
        self.assertIsNone(r['turns'])
        r = M.outcomes([segment()], [attempt('won', 2)])
        self.assertIsNone(r['first_failure'])
        r = M.outcomes([segment()], [attempt('predicted_death'), {**attempt('won', 2), 'turns': 7}])
        self.assertEqual(r['turns'], 7)
        self.assertIsNone(r['net_hp'])

    def test_retries_and_partial_entries_do_not_create_extra_samples(self):
        a, b = segment(), segment()
        b.update(fight_no=2)
        r = M.outcomes([a, b], [])
        self.assertEqual(r['segments'], 2)
        self.assertIsNone(r['first_failure'])
        self.assertIsNone(r['turns'])
        a['first_turn'] = 3
        r = M.outcomes([a], [])
        self.assertIsNone(r['entry_hp'])
        self.assertIsNone(r['deck_size'])
        self.assertIsNone(r['net_hp'])
        self.assertIsNone(r['turns'])

    def test_unique_roster_mapping_never_picks_between_weak_and_strong(self):
        mapping = {(1, 'monster', 'A+A'): {'ENCOUNTER.A_WEAK', 'ENCOUNTER.A_STRONG'},
                   (2, 'boss', 'B'): {'ENCOUNTER.B'}}
        self.assertEqual(M.resolve_mapping(mapping, 1, 'A+A', 'hallway'), (None, 'monster', 2))
        self.assertEqual(M.resolve_mapping(mapping, 2, 'B', 'boss'), ('ENCOUNTER.B', 'boss', 1))
        self.assertEqual(M.resolve_mapping(mapping, 2, 'B', 'unknown_room'), (None, 'monster', 0))
        self.assertEqual(M.composition(['MONSTER.B', 'MONSTER.A', 'MONSTER.A']), 'A+A+B')

    def test_external_normal_combat_and_multiboss_attribution(self):
        stat = dict(current_hp=12, damage_taken=10, hp_healed=15)
        room = dict(room_type='monster', model_id='ENCOUNTER.A', monster_ids=['MONSTER.A'], turns_taken=3)
        raw = dict(build_id='fixed', map_point_history=[[
            dict(player_stats=[stat], rooms=[room]),
            dict(player_stats=[stat], rooms=[{**room, 'room_type': 'boss'}, {**room, 'room_type': 'boss'}]),
            dict(player_stats=[{**stat, 'current_hp': 0}], rooms=[{**room, 'turns_taken': 0}]),
            dict(player_stats=[{}], rooms=[room])]])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'fixture.db'
            c = sqlite3.connect(path)
            c.execute('CREATE TABLE runs(id INTEGER,player_id INTEGER,win INTEGER,raw_json TEXT,character TEXT,ascension INTEGER,n_players INTEGER,is_valid INTEGER,was_abandoned INTEGER,has_modifiers INTEGER,patch_major TEXT)')
            c.execute('CREATE TABLE players(username TEXT,edit_token TEXT)')
            c.execute('INSERT INTO runs VALUES (1,7,0,?,"SILENT",10,1,1,0,0,"v0.111")', (json.dumps(raw),))
            c.commit(); c.close()
            fights, mapping, audit, builds = M.external(path)
        self.assertEqual(len(fights), 3)
        self.assertEqual(fights[0]['gross_damage'], 10)
        self.assertEqual(fights[0]['point_net'], -5)
        self.assertIsNone(fights[0]['entry_hp'])
        self.assertIsNone(fights[0]['deck_size'])
        self.assertTrue(fights[1]['death'])
        self.assertIsNone(fights[1]['turns'])
        self.assertIsNone(fights[2]['death'])
        self.assertEqual(audit['multi_room_or_non_solo_points_excluded'], 1)
        self.assertEqual(builds, {'fixed': 1})
        self.assertEqual(M.cluster_ci(fights, 'death'), [None, None])

    def test_repeated_fights_are_not_independent_players_or_runs(self):
        rows = [dict(unit=7, run=1, turns=3, death=False, gross_damage=2, point_net=1)] * 5
        row = M.aggregate(rows, 'external', 'encounter', 1, 'monster', 'ENCOUNTER.A')
        self.assertEqual((row['fights'], row['independent_runs'], row['independent_players']), (5, 1, 1))
        self.assertEqual(row['death_cluster_ci'], [None, None])
        self.assertIsNone(M.distribution([{}], 'death')['death_mean'])
        d = M.distribution([dict(run=1, unit=7, death=False), dict(run=2, unit=8, death=None)], 'death')
        self.assertEqual((d['death_n'], d['death_unknown'], d['death_independent_runs'], d['death_independent_units']), (1, 1, 1, 1))

    def test_frozen_sql_endpoint_healing_and_snapshot_tampering(self):
        try:
            import duckdb
        except ImportError:
            self.skipTest('Run with the existing logdb-venv for the SQL fixture')
        sys.path.insert(0, str(Path(__file__).parents[2]/'agent/tools/logdb'))
        from extract import TABLES
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            con = duckdb.connect(config={'threads': 1})
            for table in sorted(M.TABLES):
                cols = ','.join(f'"{name}" {kind}' for name, kind in TABLES[table])
                con.execute(f'CREATE TABLE {table} ({cols})')

            def insert(table, row):
                cols = ','.join('"'+name+'"' for name in row)
                con.execute(f'INSERT INTO {table} ({cols}) VALUES ({",".join("?" for _ in row)})', list(row.values()))

            base = dict(run_id='fixture-run', character='SILENT', ascension=10, act=1,
                        floor=1, max_hp=70, deck_size=19)
            enemy = dict(idx=0, id='A', hp=10, max_hp=10, block=0, alive=True,
                         move='FIXED', intent_dmg=1, minion=False)
            for off, turn, hp in [(1, 1, 40), (2, 4, 32)]:
                insert('frames', dict(base, off=off, ts=f'2026-01-01 00:00:0{off}',
                       screen='COMBAT', in_combat=True, turn=turn, hp=hp, player_hp=hp, enemies=[enemy]))
            for off, screen in [(3, 'REWARD'), (4, 'MAP')]:
                insert('frames', dict(base, off=off, ts=f'2026-01-01 00:00:0{off}',
                       screen=screen, in_combat=False, hp=35, map_node='Monster'))
            insert('runs_raw', dict(run_id='fixture-run', character='SILENT', ascension=10,
                   ended='2026-01-01 00:00:05', victory=True, floor=1, code='fixture'))
            files = []
            for table in sorted(M.TABLES):
                (root/table).mkdir()
                path = root/table/'fixed.parquet'
                con.execute(f"COPY {table} TO '{path}' (FORMAT PARQUET)")
                files.append(dict(path=f'{table}/fixed.parquet', bytes=path.stat().st_size, sha256=M.sha(path)))
            con.close()
            M.write_json(root/'snapshot.json', dict(files=files))
            paper = root/'paper.csv'
            paper.write_text('run_id,character,ascension,finished,victory\nfixture-run,SILENT,10,1,1\n')
            views = Path(__file__).parents[2]/'agent/tools/logdb/views.sql'
            fights, audit, versions, _ = M.own(root, views, paper)
            self.assertEqual(len(fights), 1)
            self.assertEqual(fights[0]['net_hp'], 5)  # 40 -> 35 includes the observed post-fight heal.
            self.assertEqual(fights[0]['turns'], 4)
            self.assertEqual(fights[0]['room'], 'hallway')
            self.assertIs(fights[0]['death'], False)
            self.assertEqual(audit['shared_finished_runs'], 1)
            self.assertEqual(audit['shared_victory_disagreements'], 0)
            self.assertEqual(versions[0]['game_patch'], 'unknown')
            with (root/'frames/fixed.parquet').open('ab') as f:
                f.write(b'changed')
            with self.assertRaisesRegex(ValueError, 'Frozen shard hash mismatch'):
                M.own(root, views, paper)


if __name__ == '__main__':
    unittest.main()
