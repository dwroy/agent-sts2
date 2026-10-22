import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).parents[1]))
import launch_environment_audit as audit
import launch_runtime as launch


class ConsumerInventory(unittest.TestCase):
    def test_actual_consumers_are_classified_including_other_policy_and_host_readers(self):
        result=audit.inventory(Path(__file__).parents[2])
        self.assertEqual(result['unclassified'],[])
        self.assertGreater(len(result['variables']),200)
        for key in ('SIM_ADAPTIVE','S_READINESS','SIM_FAILURE_RETRIES','S_COMBAT_RANK',
                'GLOBAL_BUILD_EVAL','HUMAN_PACE_H2','MECH_RULES','POTION_COST','BUILD_DECIDER',
                'V6_PICK_MS','V6_CARD_DECIDER','BRAIN_DSH_MODEL','BRAIN_CODEX_FIRST_TOKEN_MS','MAX_TOKENS',
                'TYPESAFE_BASE_URL','DEEPSEEK_BASE_URL','ENRICHER_BASE_URL'):
            self.assertEqual(result['variables'][key]['category'],'published-policy',key)
        for key in ('BRAIN_CODEX_HOME','CLAUDE_CONFIG_DIR','JEV_SHARED_ENV_FILE','TYPESAFE_API_KEY_FILE'):
            self.assertEqual(result['variables'][key]['category'],'credential-or-account-reference',key)
        self.assertEqual(result['variables']['STS2_EXPECTED_PROCESS_ID']['category'],'runtime-binding-or-host')

    def fixture(self,source):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);root=Path(temp.name)
        for name in audit.LAUNCHERS:
            p=root/'ops'/name;p.parent.mkdir(exist_ok=True);p.write_text('')
        p=root/'agent/src/new.ts';p.parent.mkdir(parents=True);p.write_text(source)
        return root

    def test_a_new_unclassified_consumer_blocks_the_audit(self):
        root=self.fixture('const value = process.env["NEW_GAME_POLICY"];')
        self.assertEqual(audit.inventory(root)['unclassified'],['NEW_GAME_POLICY'])

    def test_a_new_dynamic_reader_requires_explicit_audit(self):
        root=self.fixture('const value = process.env[key];')
        with self.assertRaises(ValueError):audit.inventory(root)

    def test_credential_words_inside_policy_do_not_bypass_isolation(self):
        for key in ('MAX_TOKENS','BRAIN_CODEX_FIRST_TOKEN_MS','JEV_MAX_TOKENS'):
            self.assertTrue(launch.behavior_key(key));self.assertFalse(launch.credential_key(key))
        for key in ('TYPESAFE_API_KEY_FILE','DEEPSEEK_API_KEY','BRAIN_CODEX_HOME','CLAUDE_CONFIG_DIR'):
            self.assertTrue(launch.credential_key(key))

    def test_credential_and_instance_overrides_are_not_publishable_policy(self):
        for key in ('BRAIN_CODEX_HOME','CLAUDE_CONFIG_DIR','JEV_SHARED_ENV_FILE','DEEPSEEK_API_KEY',
                'STS2_BASE_URL','STS2_EXPECTED_PROCESS_ID','BRAIN_CODEX_PAID_CREDITS'):
            with self.subTest(key=key),self.assertRaises(ValueError):
                launch.launch_settings({'ops/launch-settings.json':json.dumps({key:'fixed-value'}).encode()})


if __name__=='__main__':unittest.main()
