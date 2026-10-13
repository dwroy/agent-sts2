"""Fixed UI metadata; never connect to the game or mutate real saves."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

OPS=Path(__file__).resolve().parents[1];sys.path.insert(0,str(OPS))
spec=importlib.util.spec_from_file_location('regent_startup',OPS/'regent-startup-check.py')
check=importlib.util.module_from_spec(spec);spec.loader.exec_module(check)


class StartupTests(unittest.TestCase):
    def test_only_actual_private_modded_log_path_qualifies(self):
        self.assertEqual(check.root_evidence('Profile-scoped data path initialized: user://default/2026101302/modded/profile1'),'user://default/2026101302/modded/profile1')
        for log in ['user://steam/1/modded/profile1','user://default/1/modded/profile1','user://default/2026101302/profile1']:
            with self.assertRaises(ValueError):check.root_evidence(log)

    def test_locked_missing_and_multiplayer_are_not_admitted(self):
        base={'screen':'CHARACTER_SELECT','character_select':{'is_multiplayer':False,'characters':[{'character_id':'REGENT','is_locked':False}]}}
        self.assertTrue(check.summary(base)['qualified_for_regent'])
        for select in [{'is_multiplayer':True,'characters':base['character_select']['characters']},{'is_multiplayer':False,'characters':[{'character_id':'REGENT','is_locked':True}]},{}]:
            self.assertFalse(check.summary({**base,'character_select':select})['qualified_for_regent'])

    def test_existing_run_embark_and_other_role_selection_are_never_issued(self):
        self.assertIsNone(check.eligible_action({'screen':'CHARACTER_SELECT','available_actions':['embark','select_character']}))
        self.assertIsNone(check.eligible_action({'screen':'MAIN_MENU','run':{'run_id':'existing'},'available_actions':['open_character_select']}))

    def test_wrong_endpoint_process_profile_or_companion_never_posts(self):
        binding={'process_id':20,'base_url':check.BASE,'native_profile_id':1,'client_id':'2026101302'}
        log='user://default/2026101302/modded/profile1'
        for mismatch in [{'process_id':34676},{'api_port':8080},{'instance_role':'companion'}]:
            calls=[]
            def api(route,action=None):
                calls.append((route,action));return {'service':'sts2-ai-agent','process_id':20,'api_port':18181,'instance_role':'human',**mismatch}
            with self.assertRaises(ValueError):check.inspect(binding,log,api)
            self.assertNotIn('/action',[x[0] for x in calls])
        with self.assertRaises(ValueError):check.inspect({**binding,'base_url':'http://127.0.0.1:8080'},log,lambda *x:None)
        calls=[]
        def wrong_profile(route,action=None):
            calls.append(route)
            return {'service':'sts2-ai-agent','process_id':20,'api_port':18181,'instance_role':'human'} if route=='/health' else {'native_profile_id':2}
        with self.assertRaises(ValueError):check.inspect(binding,log,wrong_profile)
        self.assertNotIn('/action',calls)

    def test_only_advertised_startup_action_is_posted_after_rechecking_identity(self):
        binding={'process_id':20,'base_url':check.BASE,'native_profile_id':1,'client_id':'2026101302'}
        value={'native_profile_id':1,'screen':'MAIN_MENU','available_actions':['open_character_select']};calls=[]
        def api(route,action=None):
            calls.append((route,action))
            if route=='/health':return {'service':'sts2-ai-agent','process_id':20,'api_port':18181,'instance_role':'human'}
            if route=='/action':value.update({'screen':'CHARACTER_SELECT','available_actions':['embark'],'character_select':{'is_multiplayer':False,'characters':[{'character_id':'REGENT','is_locked':False}]}})
            return value
        with patch.object(check.time,'sleep'):
            result=check.inspect(binding,'user://default/2026101302/modded/profile1',api)
        self.assertTrue(result['qualified_for_regent']);self.assertEqual(result['startup_actions'],['open_character_select'])
        self.assertEqual([x for x in calls if x[0]=='/action'],[('/action','open_character_select')])


if __name__=='__main__':unittest.main()
