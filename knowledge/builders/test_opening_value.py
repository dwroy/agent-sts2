"""Fixed evidence extraction and generic feature checks; no fitting or API calls."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
SPEC = importlib.util.spec_from_file_location('opening_value', Path(__file__).with_name('opening_value.py'))
OV = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(OV)

class OpeningTests(unittest.TestCase):
    def test_descriptors_and_act_are_observed(self):
        face = {'card_id':'ANY', 'card_type':'Power', 'rules_text':'Poison. Discard. Shiv. Draw.', 'dynamic_values':[{'name':'Poison','current_value':7}]}
        d = OV.descriptor(face)
        self.assertEqual([d['text:poison'],d['text:discard'],d['text:shiv'],d['dynamic:Poison']], [1,1,1,7])
        self.assertEqual(OV.compact_run({'act_id':'1','deck':[face]}, 30)['act'], 2)
        x = OV.features(OV.compact_run({'deck':[face]}, 30), 'ENEMY', 'elite', ['deck:count','per_card:dynamic:Poison','card:ANY','kind:elite'])
        self.assertEqual(x,[1,7,1,1])
    def test_exported_tree_strict_boundary_and_logloss(self):
        self.assertEqual(OV.predict({'base':1,'lr':1,'loss':'l2','trees':[[0,2,3,4]]}, [2]),5)
        self.assertEqual(OV.predict({'base':0,'lr':1,'loss':'logloss','trees':[]}, []),.5)
    def test_first_attempt_censoring_and_pre_reward_heal_label(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            (p/'game.json').write_text(json.dumps({'monsters':[{'id':'ENEMY','type':'elite'}]}))
            run = {'character_id':'SILENT','act_id':'0','floor':8,'current_hp':50,'max_hp':60,'deck':[]}
            def frame(screen, turn=0, hp=50, rid='R'):
                state = {'run_id':rid,'run':{**run,'current_hp':hp},'screen':screen,'turn':turn,'in_combat':screen=='COMBAT'}
                if screen=='COMBAT': state['combat']={'enemies':[{'enemy_id':'ENEMY'}],'player':{'current_hp':hp,'cards_played_this_turn':0}}
                return {'ts':'2020-01-01','state':state}
            rows=[frame('COMBAT',1),frame('COMBAT',3,35),frame('REWARD',0,45),frame('COMBAT',1),frame('REWARD'),frame('COMBAT',1,rid='CENSORED')]
            (p/'states').write_text(''.join(json.dumps(r)+'\n' for r in rows))
            OV.extract(p/'states',p/'game.json',str(p/'out'),'silent')
            output=[json.loads(s) for s in (p/'out').read_text().splitlines()]
            self.assertEqual(len(output),1)
            self.assertEqual((output[0]['hp_loss'],output[0]['turns'],output[0]['win']), (15,3,1))
            receipt=json.loads((p/'out.source.json').read_text())
            self.assertEqual(receipt['rejected']['censored_end'],1)

if __name__=='__main__': unittest.main()
