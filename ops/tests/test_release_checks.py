import contextlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import release_checks as checks
import board_heavy


class FullChecks(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        (self.root/'.agents').mkdir(); (self.root/'ops').mkdir(); (self.root/'agent').mkdir()
        (self.root/'.agents/board.yaml').write_bytes((Path(checks.__file__).parents[1]/'.agents/board.yaml').read_bytes())
        self.source = self.root/'agent/fixed.ts'; self.source.write_text('fixed\n')
        self.git('init','-q'); self.git('add','.')
        self.calls = []
        self.first = self.root/'receipts/integrator.json'

    def git(self,*argv):
        return subprocess.check_output(['git','-C',str(self.root),*argv],stderr=subprocess.DEVNULL)

    def runner(self,argv,**kw):
        self.calls.append(argv)
        return SimpleNamespace(returncode=0)

    def test_same_tree_reuses_integrator_full_result_without_execution(self):
        self.assertEqual(checks.check(self.root,self.root,self.first,'integrator',runner=self.runner),0)
        count = len(self.calls)
        output=self.root/'receipts/ops.json'
        self.assertEqual(checks.check(self.root,self.root,output,'ops',self.first,self.runner),0)
        value=json.loads(output.read_text())
        self.assertEqual(value['state'],'reused'); self.assertEqual(len(self.calls),count)
        self.assertEqual(value['reused_from']['tree'],checks.tree(self.root))

    def test_different_tree_rechecks_and_preserves_original_result(self):
        checks.check(self.root,self.root,self.first,'integrator',runner=self.runner)
        before=self.first.read_bytes(); self.source.write_text('changed\n'); self.git('add','agent/fixed.ts')
        output=self.root/'receipts/changed.json'
        self.assertEqual(checks.check(self.root,self.root,output,'ops',self.first,self.runner),0)
        self.assertEqual(len(self.calls),4); self.assertEqual(self.first.read_bytes(),before)
        self.assertEqual(json.loads(output.read_text())['state'],'passed')

    def test_targeted_or_failed_receipt_cannot_be_reused(self):
        checks.check(self.root,self.root,self.first,'integrator',runner=self.runner)
        data=json.loads(self.first.read_text()); data['full_suite']=False; self.first.write_text(json.dumps(data))
        self.assertEqual(checks.check(self.root,self.root,self.root/'receipts/new.json','ops',self.first,self.runner),0)
        self.assertEqual(len(self.calls),4)
        data['full_suite']=True; data['state']='failed-retain-original'
        self.first.write_text(json.dumps(data))
        self.assertIsNone(checks.reusable(self.first,self.root,'dwroy/agent-sts2',checks.tree(self.root)))
        data['state']='passed';data['results']={'tsc':False,'vitest':False};self.first.write_text(json.dumps(data))
        self.assertIsNone(checks.reusable(self.first,self.root,'dwroy/agent-sts2',checks.tree(self.root)))

    def test_failure_and_changed_inputs_preserve_non_green_receipt(self):
        def changed(argv,**kw):
            self.source.write_text('dirty\n'); return SimpleNamespace(returncode=0)
        self.assertEqual(checks.check(self.root,self.root,self.first,runner=changed),1)
        self.assertEqual(json.loads(self.first.read_text())['state'],'failed-retain-original')

    def test_admission_wraps_original_lock_and_commands(self):
        active=[]
        @contextlib.contextmanager
        def admission(*args):
            active.append(True)
            try:yield
            finally:active.pop()
        def runner(argv,**kw):
            self.assertEqual(active,[True]); return self.runner(argv,**kw)
        with patch.object(checks,'admission',admission):
            self.assertEqual(checks.check(self.root,self.root,self.first,runner=runner),0)
        self.assertEqual(active,[])

    def test_off_preserves_old_argv_and_enabled_prefixes_before_locks(self):
        argv=['flock','publication.lock','fixed']
        self.assertEqual(board_heavy.queued_argv(self.root,'ops',argv),argv)
        import yaml
        path=self.root/'.agents/board.yaml'; data=yaml.safe_load(path.read_text())
        data['dispatcher']['heavy']['enabled']=True; path.write_text(json.dumps(data))
        queued=board_heavy.queued_argv(self.root,'ops',argv)
        self.assertEqual(queued[-5:],['ops','--',*argv])


if __name__=='__main__':unittest.main()
