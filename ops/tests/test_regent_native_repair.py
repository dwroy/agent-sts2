"""Only own no-run startup metadata; do not access Windows, saves or credentials."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('regent_repair',Path(__file__).resolve().parents[1]/'regent-native-repair.py')
repair=importlib.util.module_from_spec(spec);spec.loader.exec_module(repair)


class RepairTests(unittest.TestCase):
    def test_retains_native_valid_enum_and_changes_only_own_launch_preferences(self):
        before={'schema_version':8,'vsync':'adaptive','language':'zhs','mod_settings':None,'controller_mapping':{'test':'fixture'}}
        after=repair.repaired_settings(before)
        self.assertEqual(after['vsync'],'adaptive');self.assertEqual(after['language'],'zhs')
        self.assertEqual(after['controller_mapping'],before['controller_mapping']);self.assertIsNone(before['mod_settings'])
        self.assertEqual(after['mod_settings']['mod_list'],[{'id':'STS2AIAgent','is_enabled':True,'source':'mods_directory'}])
        for bad in [{**before,'vsync':'disabled'},{**before,'schema_version':99},None]:
            with self.assertRaises(ValueError):repair.repaired_settings(bad)

    def test_cannot_close_primary_foreign_path_or_unidentified_process(self):
        value={'request_id':'roy-20261013-isolated-character-climb','status':'started','pid':15696,'desktop_session':1,
               'game_executable':repair.EXE,'client_id':'2026101302','creation_time':'2026-10-13T02:02:39.3856157Z'}
        self.assertEqual(repair.guard_receipt(value),15696)
        for change in [{'pid':34676},{'game_executable':r'C:\original\SlayTheSpire2.exe'},{'desktop_session':0},{'client_id':'1'},{'creation_time':"fake'; arbitrary-command"}]:
            with self.assertRaises(ValueError):repair.guard_receipt({**value,**change})


if __name__=='__main__':unittest.main()
