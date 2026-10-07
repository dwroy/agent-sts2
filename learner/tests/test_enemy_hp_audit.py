"""Fixed Silent observations; damage gaps are not filled by a simulator."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('resources', Path(__file__).parents[1] / 'resource_chain.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
EVIDENCE = json.loads(Path(__file__).with_name('silent-summon-hp-evidence.json').read_text())


def observation(line, enemies, turn=1):
    return {'line': line, 'ts': str(line), 'turn': turn, 'enemies': enemies}


def enemy(ident, hp, index=0, alive=True, max_hp=30):
    return {'index': index, 'enemy_id': ident, 'current_hp': hp, 'max_hp': max_hp, 'is_alive': alive}


class EnemyHpAudit(unittest.TestCase):
    def fight(self):
        return module.resource_chain(EVIDENCE['snapshots'], EVIDENCE['run'], 'silent')['combats'][0]

    def test_f31_separates_damage_summon_and_revival_from_net_hp(self):
        fight = self.fight()
        turns = fight['enemy_hp_audit']['turns']
        self.assertEqual([t['turn'] for t in turns], list(range(1, 9)))
        self.assertEqual([t['net_live_enemy_hp_loss'] for t in turns], [4, 18, 10, 21, 10, 9, 22, 35])
        self.assertEqual([t['visible_enemy_hp_loss_lower_bound'] for t in turns], [25, 18, 28, 42, 27, 9, 22, 34])
        self.assertEqual([t['observed_hp_added'] for t in turns], [21, 0, 18, 21, 17, 0, 0, 0])
        self.assertEqual(fight['observed_net_hp_loss'], 23)
        self.assertEqual(fight['entry']['hp'], 48)
        self.assertEqual(fight['exit']['hp'], 25)
        self.assertEqual(fight['entry']['potions'], [])
        self.assertEqual(fight['enemies'], ['THE_OBSCURA'])
        # The first reward frame closes the window; later reward refreshes are outside it.
        self.assertEqual(len(fight['enemy_hp_audit']['observations']), 39)
        self.assertEqual(fight['enemy_hp_audit']['observations'][-1]['line'], 278009)

    def test_missing_poison_death_frames_and_last_hp_are_unknown(self):
        turns = self.fight()['enemy_hp_audit']['turns']
        for idx in (2, 4):
            self.assertIn('hp_increase_without_intermediate_death_frame', turns[idx]['gaps'])
            self.assertIsNone(turns[idx]['damage_total'])
        self.assertIn('body_removed_without_death_frame', turns[7]['gaps'])
        self.assertIsNone(turns[7]['damage_total'])
        revival = [e for t in turns[3]['transitions'] for e in t['events'] if e['kind'] == 'observed_revival']
        self.assertEqual(len(revival), 1)
        self.assertEqual(revival[0]['before'][0]['current_hp'], 0)
        self.assertEqual(revival[0]['after'][0]['current_hp'], 21)

    def test_unique_type_alignment_survives_index_reordering(self):
        turns = module.enemy_hp_audit([
            observation(1, [enemy('MAIN', 30)]),
            observation(2, [enemy('SUMMON', 21), enemy('MAIN', 20, 1)])])['turns']
        self.assertEqual(turns[0]['visible_enemy_hp_loss_lower_bound'], 10)
        self.assertEqual(turns[0]['observed_hp_added'], 21)
        self.assertEqual(turns[0]['net_live_enemy_hp_loss'], -11)
        self.assertEqual(turns[0]['gaps'], [])

    def test_repeated_types_keep_both_bodies_and_do_not_guess_identity(self):
        before = [enemy('SAME', 10), enemy('SAME', 20, 1)]
        after = [enemy('SAME', 8), enemy('SAME', 9, 1)]
        turns = module.enemy_hp_audit([observation(1, before), observation(2, after)])['turns']
        self.assertEqual(turns[0]['net_live_enemy_hp_loss'], 13)
        self.assertEqual(turns[0]['visible_enemy_hp_loss_lower_bound'], 0)
        self.assertIn('ambiguous_enemy_identity', turns[0]['gaps'])
        event = turns[0]['transitions'][0]['events'][0]
        self.assertEqual(event['before'], before)
        self.assertEqual(event['after'], after)

    def test_missing_enemy_frame_and_changed_max_hp_are_not_damage(self):
        for after in (None, [enemy('MAIN', 10, max_hp=40)]):
            turn = module.enemy_hp_audit([
                observation(1, [enemy('MAIN', 30)]), observation(2, after)])['turns'][0]
            self.assertEqual(turn['visible_enemy_hp_loss_lower_bound'], 0)
            self.assertTrue(turn['gaps'])
            self.assertIsNone(turn['damage_total'])

    def test_absent_hp_does_not_become_zero(self):
        turn = module.enemy_hp_audit([
            observation(1, [enemy('MAIN', 30)]), observation(2, [enemy('MAIN', None)])])['turns'][0]
        self.assertIsNone(turn['net_live_enemy_hp_loss'])
        self.assertEqual(turn['visible_enemy_hp_loss_lower_bound'], 0)
        self.assertIn('unknown_enemy_hp', turn['gaps'])

    def test_restart_and_other_floor_do_not_create_damage_transitions(self):
        rows = copy.deepcopy(EVIDENCE['snapshots'][:4])
        restart = copy.deepcopy(rows[0])
        restart['_line'] = 300000
        restart['ts'] = '2026-10-07T12:00:00.000Z'
        result = module.resource_chain(rows + [restart], EVIDENCE['run'], 'silent',
                                       {31: ['2026-10-07T11:00:00.000Z']})
        self.assertEqual(len(result['combats']), 2)
        self.assertEqual(result['combats'][0]['end'], 'restart_observed')
        self.assertEqual(result['combats'][0]['enemy_hp_audit']['turns'][0]['observed_hp_added'], 0)
        self.assertEqual(result['combats'][1]['enemy_hp_audit']['turns'], [])
        restart['state']['run']['floor'] = 32
        result = module.resource_chain(rows + [restart], EVIDENCE['run'], 'silent')
        self.assertEqual(result['combats'][0]['end'], 'missing_exit')
        self.assertEqual(result['combats'][0]['enemy_hp_audit']['turns'][0]['observed_hp_added'], 0)

    def test_other_characters_retain_original_resource_output(self):
        rows = copy.deepcopy(EVIDENCE['snapshots'][:2])
        for row in rows:
            row['state']['run']['character_id'] = 'IRONCLAD'
        fight = module.resource_chain(rows, EVIDENCE['run'], 'ironclad')['combats'][0]
        self.assertNotIn('enemy_hp_audit', fight)
        self.assertNotIn('enemy_observations', fight)
        self.assertEqual(fight['entry']['hp'], 48)
        self.assertEqual(fight['enemies'], ['THE_OBSCURA'])


if __name__ == '__main__':
    unittest.main()
