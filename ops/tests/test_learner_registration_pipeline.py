"""Five real fixed wrappers publish while their parent still owns learn.lock."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(REPO / 'ops'), str(REPO / 'ops/tests')]
import learner_jobs as jobs
import strategy_external_jobs as external
import learner_registration as registration
import test_strategy_external as frozen
import test_learner_launch_failures as wrappers


class RegistrationPipeline(unittest.TestCase):
    def test_unpublished_or_incomplete_registration_does_not_release_a_batch(self):
        import fcntl
        import tempfile
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp); state={"batches":{}}
            def persist(value):registration.published(value)
            with registration.transaction(directory,persist):
                row=registration.reserve(directory,"learner-20260101-000001-strategy-proposal")
                row["pid"]=123
                state["batches"][row["batch"]]={"pid":123,"state":"running","external_source":"fixed-plan"}
                with open(row["path"],"a") as probe:
                    registration.checkpoint(state)
                    with self.assertRaises(BlockingIOError):fcntl.flock(probe,fcntl.LOCK_EX|fcntl.LOCK_NB)
                    state["batches"][row["batch"]].update(external_binding={"plan_id":"fixed-plan","dispatch_base":"a"*40},
                        external_lane="A",external_policy={"service_tier":"ultrafast"})
                    registration.checkpoint(state)
                    fcntl.flock(probe,fcntl.LOCK_EX|fcntl.LOCK_NB)
            # A parent failure never calls persist or marks an unregistered batch complete.
            with self.assertRaises(OSError):
                with registration.transaction(directory,lambda value: (_ for _ in ()).throw(OSError("fixed persist failure"))):
                    row=registration.reserve(directory,"learner-20260101-000002")
                    row["pid"]=124
                    registration.checkpoint({"batches":{}})
            with open(row["path"],"a") as probe:fcntl.flock(probe,fcntl.LOCK_EX|fcntl.LOCK_NB)

    def test_four_external_and_own_publish_before_next_slow_source_under_same_tick_lock(self):
        source = frozen.External('runTest'); source.setUp(); self.addCleanup(source.doCleanups)
        source.four_plans(); source.config['plans'] = source.config['plans'][:4]; source.save_config()
        root, directory = source.root, source.directory
        wrapper = wrappers.LearnerLauncher('runTest'); wrapper.setUp(); self.addCleanup(wrapper.doCleanups)
        for name in ('paths.sh','codex-ops-learner.sh','learner_entry.py','codex-learner.sh','codex-fast.sh','codex-policy.sh'):
            shutil.copy2(REPO/'ops'/name,root/'ops'/name)
        (root/'ops/codex-ops-learn.py').write_text('# Fixed finish callback; no production scheduling.\n')
        (root/'bin').mkdir(); (root/'agent/node_modules/.bin').mkdir(parents=True)
        executable = wrapper.write_executable
        git_path=Path(wrapper.env['HOME'])/'.local/node/bin/git';git_path.parent.mkdir(parents=True)
        executable(git_path, '#!/bin/sh\ncase "$*" in *rev-parse*) printf "%s\\n" '+source.base+';; esac\n')
        executable(root/'bin/codex', '#!/bin/sh\nexit 0\n')
        observations = root/'observations'; observations.mkdir()
        executable(root/'agent/node_modules/.bin/tsx', '''#!/usr/bin/python3
import json,os,time
from pathlib import Path
batch=os.environ['LEARNER_BATCH_ID']
row=json.loads(Path(os.environ['LEARNER_STATE_FILE']).read_text())['batches'][batch]
assert row['state']=='running' and row['pid']>0
if row.get('external_source'):
 assert row['external_binding']['dispatch_base'] and row['external_lane'] in 'ABCD'
 assert row['external_policy']['service_tier']=='ultrafast'
Path(os.environ['CODEX_OPS_ROOT'],'observations',batch+'.json').write_text(json.dumps(row))
''')
        executable(root/'ops/strategy_external_jobs.py', '''#!/usr/bin/python3
import json,sys
from pathlib import Path
action,root,directory,batch,character,tree,source=sys.argv[1:]
row=json.loads(Path(directory,'learn.json').read_text())['batches'][batch]
assert row['external_source']==source and row['external_binding']['plan_id']==source
if action=='ready':print(row['external_binding']['dispatch_base'])
elif action=='tier':print(row['external_policy']['service_tier'])
elif action=='prepare':print(Path(root,'task.md'))
''')
        for stamp in ('20260101-000001','20260101-000002','20260101-000003','20260101-000004'):
            tree=root/'.worktrees'/('codex-strategy-silent-'+stamp)
            (tree/'agent').mkdir(parents=True); (tree/'.git').write_text('fixed checkout identity\n')
        (root/'task.md').write_text('fixed external task\n')
        state_file=directory/'learn.json'; state_file.write_text('{"batches":{},"runs":{},"ascension":{}}')
        spec=importlib.util.spec_from_file_location('pipeline_parent',REPO/'ops/codex-ops-learn.py')
        parent=importlib.util.module_from_spec(spec); spec.loader.exec_module(parent)
        state={'batches':{},'runs':{},'ascension':{}}
        elapsed=[]; started=[]; handles=[]
        real_start=jobs.start_learner; real_source=external.read_source; real_popen=subprocess.Popen
        def spawn(*args,**kwargs):
            proc=real_popen(*args,**kwargs);handles.append(proc);return proc
        def await_published(batch):
            begin=time.monotonic()
            while not (observations/(batch+'.json')).exists():
                self.assertLess(time.monotonic()-begin,5,'wrapper '+batch+' cannot pass barrier: '+(directory/'learner'/(batch+'.err')).read_text() if (directory/'learner'/(batch+'.err')).exists() else batch)
                time.sleep(.01)
            elapsed.append(time.monotonic()-begin)
        def start(*args):
            result=real_start(*args); started.append((args[-1],result[0])); return result
        def validate(*args):
            # A later arbitrarily slow source cannot delay any already published wrapper.
            for batch in state['batches']:await_published(batch)
            return real_source(*args)
        env={**wrapper.env,'CODEX_OPS_ROOT':str(root),'CODEX_OPS_DIR':str(directory),
             'LEARNER_CODEX_HOME':source.home,'PATH':str(root/'bin')+':/usr/bin:/bin',
             'CODEX_OPS_LEARNER_HOST':'setsid'}
        def cleanup():
            for proc in handles:
                if proc.poll() is None:proc.terminate()
                proc.wait(timeout=5)
        self.addCleanup(cleanup)
        with contextlib.ExitStack() as stack:
            for manager in (
                patch.dict(os.environ,env,clear=True), patch.object(parent,'ROOT',str(root)),
             patch.object(parent,'DIR',str(directory)), patch.object(parent,'STATE',str(state_file)),
             patch.object(parent,'SCRIPTS',str(root/'ops')), patch.object(parent,'load_state',return_value=state),
             patch.object(parent,'check_victories',return_value=[]),patch.object(parent,'check_ascension',return_value=[]),
             patch.object(parent.disk_admission,'snapshot',return_value={'new_jobs_allowed':True}),patch.object(parent,'check_pending',return_value=False),
             patch.object(parent,'check_postmortems',side_effect=lambda s,c:parent.dispatch(s,['SILENT000001'],c,'tick')),
             patch.object(parent,'check_ascension_audits',return_value=None),patch.object(parent.learner_retention,'kick',return_value={}),
             patch.object(jobs,'available_worktree',return_value=True),patch.object(jobs,'external_writer',return_value=False),patch.object(jobs,'available',return_value=True),patch.object(jobs,'start_learner',side_effect=start),patch.object(parent,'start_learner',side_effect=start),
             patch.object(jobs.subprocess,'Popen',side_effect=spawn),
             patch.object(external,'read_source',side_effect=validate),
             patch.object(external.subprocess,'check_output',return_value=source.base+'\n')
            ):
                stack.enter_context(manager)
            # Give deterministic scheduler IDs; the actual persisted PID/lease stays real.
            from types import SimpleNamespace
            import datetime
            real_datetime=datetime.datetime
            class Clock:
                @staticmethod
                def now():return real_datetime(2026,1,1,0,0,1)
            with patch.object(parent.dt,'datetime',Clock):
                with parent.state_lock(),contextlib.redirect_stdout(io.StringIO()):
                    parent.cmd_tick(SimpleNamespace(character='silent'))
                    for batch in state['batches']:await_published(batch)
                    # All five accepted registration while this global transaction is still held.
                    self.assertEqual(len(list(observations.glob('*.json'))),5,str(state.get('strategy_external_error'))+' '+str(state.get('external_learning_policy'))+' '+str(list(state['batches'])))
                    self.assertEqual({b['external_lane'] for b in state['batches'].values() if b.get('external_source')},set('ABCD'))
                    self.assertTrue(all(t<120 for t in elapsed))
                    for batch,row in state['batches'].items():
                        self.assertEqual(json.loads((observations/(batch+'.json')).read_text()),row)
        self.assertEqual(len(started),5)


if __name__=='__main__':unittest.main()
