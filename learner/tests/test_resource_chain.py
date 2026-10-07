"""Fixed observed resources: no game-engine calls or counterfactual outcomes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('resources', Path(__file__).parents[1] / 'resource_chain.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
RUN = 'SILENT000001'


def row(hp, turn=None, floor=48, belt=(), character='SILENT', combat=True, ts='01'):
    return {'ts': ts, '_line': int(ts), 'state': {'run_id': RUN, 'turn': turn,
            'in_combat': combat, 'screen': 'combat' if combat else 'reward',
            'run': {'character_id': character, 'floor': floor, 'current_hp': hp, 'max_hp': 80,
                    'potions': [{'index': i, 'potion_id': p, 'occupied': True} for i,p in belt]},
            'combat': {'enemies': [{'enemy_id': 'OBSERVED_BOSS'}] if combat else []}}}


class ResourceChain(unittest.TestCase):
    def chain(self, rows, starts=None):
        return module.resource_chain(rows, RUN, 'silent', starts)

    def test_won_fight_exit_and_next_boss_retain_exact_belt_slots(self):
        rows = [row(60,1,belt=((0,'POISON'),(1,'POISON'))),
                row(48,3,belt=((1,'POISON'),),ts='02'),
                row(50,combat=False,belt=((1,'POISON'),),ts='03'),
                row(50,1,49,belt=((1,'POISON'),),ts='04'),
                row(0,2,49,belt=(),ts='05'),row(0,floor=49,combat=False,ts='06')]
        result = self.chain(rows);first,second = result['combats']
        self.assertEqual(first['exit']['hp'],50)
        self.assertEqual(first['observed_net_hp_loss'],10)
        self.assertEqual(second['entry']['hp'],50)
        self.assertEqual(second['entry']['potions'],[[1,'POISON']])
        self.assertEqual(first['changes'][-1]['to']['hp'],50)
        self.assertEqual(first['changes'][-1]['combat_sequence'],1)
        self.assertIn('unclassified',first['outcome'])

    def test_missing_exit_and_partial_entry_are_explicit(self):
        result = self.chain([row(30,4),row(20,1,49,ts='02')])
        self.assertFalse(result['combats'][0]['entry_is_turn_one'])
        for fight in result['combats']:
            self.assertIsNone(fight['exit'])
            self.assertIsNone(fight['observed_net_hp_loss'])
            self.assertEqual(fight['end'],'missing_exit')

    def test_restart_restoration_is_separate_from_damage_or_healing(self):
        result = self.chain([row(60,1),row(10,4,ts='02'),row(60,1,ts='03'),row(8,4,ts='04')])
        self.assertEqual(len(result['combats']),2)
        self.assertEqual(result['combats'][0]['end'],'restart_observed')
        reset = result['resource_changes'][1]
        self.assertTrue(reset['restart_boundary'])
        self.assertIsNone(reset['combat_sequence'])
        self.assertEqual(len(result['combats'][1]['changes']),1)

    def test_sl_restart_can_happen_at_same_first_turn(self):
        result = self.chain([row(60,1),row(40,1,ts='02'),row(60,1,ts='04')],{48:['03']})
        self.assertEqual(len(result['combats']),2)
        self.assertTrue(result['resource_changes'][-1]['restart_boundary'])

    def test_between_fight_changes_do_not_belong_to_new_combat(self):
        result = self.chain([row(20,combat=False),row(30,1,ts='02'),row(28,2,ts='03')])
        self.assertIsNone(result['resource_changes'][0]['combat_sequence'])
        self.assertEqual(len(result['combats'][0]['changes']),1)

    def test_foreign_character_and_other_run_are_ignored(self):
        foreign = row(70,1,character='IRONCLAD')
        wrong = row(70,1);wrong['state']['run_id']='SILENT000002'
        result = self.chain([foreign,wrong,row(10,1,ts='03')])
        self.assertEqual(len(result['combats']),1)
        self.assertEqual(result['combats'][0]['entry']['hp'],10)

    def test_stream_skips_other_runs_and_malformed_frames(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory,'states.jsonl')
            other=row(10,1);other['state']['run_id']='OTHER0000001'
            path.write_text(json.dumps(other)+'\n'+json.dumps(row(60,1))+'\n'+
                            '{"run_id":"'+RUN+'", invalid}\n')
            selected=list(module.selected_entries(path,RUN))
            self.assertEqual(len(selected),1)
            self.assertEqual(selected[0]['_line'],2)


if __name__ == '__main__': unittest.main()
