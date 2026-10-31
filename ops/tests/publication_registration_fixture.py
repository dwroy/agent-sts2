"""Real wrappers/readiness/admission with fixed Git/quota and model/finish transports."""
import contextlib
import datetime
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import time
from types import SimpleNamespace
from unittest.mock import patch

import learner_jobs as jobs
import learner_registration
import publication_gate
import strategy_external_jobs as external
import test_strategy_external as frozen
import test_learner_launch_failures as wrappers

REPO = Path(__file__).resolve().parents[2]


class World:
    def __enter__(self):
        self.source = frozen.External('runTest')
        self.source.setUp()
        self.source.four_plans()
        self.source.config['plans'] = self.source.config['plans'][:4]
        self.source.save_config()
        self.launcher = wrappers.LearnerLauncher('runTest')
        self.launcher.setUp()
        self.root, self.directory = self.source.root, self.source.directory
        self.handles, self.processes, self.started = [], {}, []
        self.fsyncs, self.checkpoints = [], []
        self.before_source = lambda: None
        ops = self.root / 'ops'
        for name in ('paths.sh', 'codex-ops-learner.sh', 'learner_entry.py', 'codex-learner.sh',
                     'codex-fast.sh', 'codex-policy.sh', 'publication_gate.py', 'learner_registration.py',
                     'strategy_backfill_jobs.py', 'strategy_research_jobs.py', 'external_learning_policy.py',
                     'external_stock.py', 'external_stock_source.py', 'learning_concurrency.py'):
            shutil.copy2(REPO / 'ops' / name, ops / name)
        shutil.copy2(REPO / 'ops/strategy_external_jobs.py', ops / 'external_implementation.py')
        # The real source reader and ready/tier/prepare actions use a fixed quota clock.
        # The optional rendezvous only lets a test change a gate after source preparation.
        (ops / 'strategy_external_jobs.py').write_text('''import os,runpy,time
from pathlib import Path
import external_learning_policy
external_learning_policy.time.time=lambda:1767225601
runpy.run_path(str(Path(__file__).with_name('external_implementation.py')),run_name='__main__')
if os.environ.get('FIXTURE_HOLD_PREPARE')=='1' and __import__('sys').argv[1]=='prepare':
 batch=__import__('sys').argv[4]
 root=Path(os.environ['CODEX_OPS_ROOT'])
 (root/'prepared'/batch).write_text('real prepare completed')
 deadline=time.monotonic()+5
 while not (root/'release'/batch).exists():
  if time.monotonic()>deadline:raise RuntimeError('fixed prepare rendezvous timed out')
  time.sleep(.01)
''')
        (ops / 'codex-ops-learn.py').write_text('# Fixed finish callback; no scheduling or state mutation.\n')
        (self.root / 'bin').mkdir()
        (self.root / 'agent/node_modules/.bin').mkdir(parents=True)
        self.observations = self.root / 'observations'
        for name in ('observations', 'prepared', 'release'):
            (self.root / name).mkdir()
        executable = self.launcher.write_executable
        git = Path(self.launcher.env['HOME']) / '.local/node/bin/git'
        git.parent.mkdir(parents=True)
        executable(git, '#!/bin/sh\ncase "$*" in *rev-parse*) printf "%s\\n" ' + self.source.base + ';; esac\n')
        executable(self.root / 'bin/codex', '#!/bin/sh\nexit 0\n')
        executable(self.root / 'agent/node_modules/.bin/tsx', '''#!/usr/bin/python3
import fcntl,json,os,sys
from pathlib import Path
root=Path(os.environ['CODEX_OPS_ROOT'])
sys.path.insert(0,str(root/'ops'))
from learner_entry import lease_identity
batch=os.environ['LEARNER_BATCH_ID']
file=Path(os.environ['LEARNER_STATE_FILE'])
row=json.loads(file.read_text())['batches'][batch]
args=sys.argv[1:]
cwd=args[args.index('--cwd')+1]
lease=lease_identity(str(root),cwd,batch,str(file))
assert lease is not None and row['state']=='running' and row['pid']>0
with (file.parent/'learn.lock').open('a') as lock:
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:pass
 else:raise AssertionError('parent global transaction was released too early')
if row.get('external_source'):
 assert row['external_lane'] in 'ABCD' and row['external_policy']['service_tier']=='default'
 assert args[args.index('--service-tier')+1]=='default'
 assert row['candidate_mode']=={'schema':'candidate-only-v1','merge':'no',
  'dispatch_base':row['external_binding']['dispatch_base'],'worktree':cwd}
 assert 'merge=no' in args and 'merge=live' not in args
 assert args[0]==str(Path(cwd)/'learner/run.ts')
 task=Path(args[args.index('--task')+1]).read_text()
 assert row['external_binding']['input_manifest']['sha256'] in task and batch in task
assert Path(os.environ['LEARNER_REGISTRATION_GATE']).name==batch+'.lock'
(root/'observations'/(batch+'.json')).write_text(json.dumps({'batch':row,'lease':lease,
 'global_lock_held':True,'gate':os.environ['LEARNER_REGISTRATION_GATE']}))
''')
        for stamp in ('20260101-000001', '20260101-000002', '20260101-000003', '20260101-000004'):
            tree = self.root / '.worktrees' / ('codex-strategy-silent-' + stamp)
            (tree / 'agent').mkdir(parents=True)
            (tree / '.git').write_text('fixed checkout identity\n')
            (tree / 'learner/tasks').mkdir(parents=True)
            for name in ('strategy-external.md', 'strategy-external-dual-boss.md', 'strategy-external-act-boss.md'):
                shutil.copy2(REPO / 'learner/tasks' / name, tree / 'learner/tasks' / name)
        self.state_file = self.directory / 'learn.json'
        self.state_file.write_text('{"batches":{},"runs":{},"ascension":{}}')
        spec = importlib.util.spec_from_file_location('publication_registration_parent', REPO / 'ops/codex-ops-learn.py')
        self.parent = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.parent)
        self.state = {'batches': {}, 'runs': {}, 'ascension': {}}
        return self

    def __exit__(self, *unused):
        try:
            for proc in self.handles:
                if proc.poll() is None:
                    proc.terminate()
                proc.wait(timeout=5)
        finally:
            self.launcher.doCleanups()
            self.source.doCleanups()

    @contextlib.contextmanager
    def runtime(self, **environment):
        env = {**self.launcher.env, 'CODEX_OPS_ROOT': str(self.root), 'CODEX_OPS_DIR': str(self.directory),
               'LEARNER_CODEX_HOME': self.source.home, 'PATH': str(self.root / 'bin') + ':/usr/bin:/bin',
               'CODEX_OPS_LEARNER_HOST': 'setsid', **environment}
        real_start, real_source, real_popen = jobs.start_learner, external.read_source, subprocess.Popen
        real_fsync, real_published = os.fsync, learner_registration.published
        def fsync(descriptor):
            real_fsync(descriptor)
            info = os.fstat(descriptor)
            self.fsyncs.append((info.st_ino, info.st_mode))
        def published(state):
            # Observe the real fsync calls; never replace persistence or barrier release.
            assert len(self.fsyncs) >= 2
            file, directory = self.fsyncs[-2:]
            assert stat.S_ISREG(file[1]) and file[0] == self.state_file.stat().st_ino
            assert stat.S_ISDIR(directory[1]) and directory[0] == self.directory.stat().st_ino
            self.checkpoints.append(json.loads(json.dumps(state)))
            real_published(state)
        def spawn(*args, **kwargs):
            proc = real_popen(*args, **kwargs)
            self.handles.append(proc)
            return proc
        def start(*args):
            result = real_start(*args)
            self.started.append(result[0])
            self.processes[args[-1].removeprefix('learner-').removesuffix('-postmortem')] = self.handles[-1]
            return result
        def validate(*args):
            self.before_source()
            return real_source(*args)
        real_datetime = datetime.datetime
        class Clock:
            @staticmethod
            def now(): return real_datetime(2026, 1, 1, 0, 0, 1)
        with contextlib.ExitStack() as stack:
            for manager in (
                patch.dict(os.environ, env, clear=True), patch.object(self.parent, 'ROOT', str(self.root)),
                patch.object(self.parent, 'DIR', str(self.directory)), patch.object(self.parent, 'STATE', str(self.state_file)),
                patch.object(self.parent, 'SCRIPTS', str(self.root / 'ops')),
                patch.object(self.parent, 'load_state', return_value=self.state),
                patch.object(self.parent, 'check_victories', return_value=[]), patch.object(self.parent, 'check_ascension', return_value=[]),
                patch.object(self.parent.disk_admission, 'snapshot', return_value={'new_jobs_allowed': True}),
                patch.object(self.parent, 'check_pending', return_value=False),
                patch.object(self.parent, 'check_postmortems', side_effect=lambda s, c: self.parent.dispatch(s, ['SILENT000001'], c, 'tick')),
                patch.object(self.parent, 'check_ascension_audits', return_value=None),
                patch.object(self.parent.learner_retention, 'kick', return_value={}),
                patch.object(jobs, 'available_worktree', return_value=True), patch.object(jobs, 'external_writer', return_value=False),
                patch.object(jobs, 'available', return_value=True), patch.object(jobs, 'start_learner', side_effect=start),
                patch.object(self.parent, 'start_learner', side_effect=start), patch.object(jobs.subprocess, 'Popen', side_effect=spawn),
                patch.object(external, 'read_source', side_effect=validate),
                patch.object(external.subprocess, 'check_output', return_value=self.source.base + '\n'),
                patch.object(self.parent.dt, 'datetime', Clock),
                patch.object(os, 'fsync', side_effect=fsync),
                patch.object(learner_registration, 'published', side_effect=published),
            ):
                stack.enter_context(manager)
            yield

    def wait_file(self, path, batch):
        deadline = time.monotonic() + 5
        while not path.exists():
            if time.monotonic() > deadline:
                err = self.directory / 'learner' / (batch + '.err')
                raise AssertionError('wrapper cannot progress while parent holds learn.lock: ' + (err.read_text() if err.exists() else batch))
            time.sleep(.01)

    def await_model(self, batch):
        path = self.observations / (batch + '.json')
        self.wait_file(path, batch)
        # Drain each fixed wrapper before the next source, limiting active test workers.
        assert self.processes[batch].wait(timeout=5) == 0
        value = json.loads(path.read_text())
        assert value['global_lock_held'] and value['batch'] == self.state['batches'][batch]
        assert any(saved['batches'].get(batch) == value['batch'] for saved in self.checkpoints)
        return value

    def await_previous(self):
        for batch in self.state['batches']:
            self.await_model(batch)

    def tick(self, waiting=False):
        if waiting:
            publication_gate.begin(self.root, self.directory, 'fixed-publication', os.getpid())
        self.before_source = self.await_previous
        with self.parent.state_lock(), contextlib.redirect_stdout(io.StringIO()):
            self.parent.cmd_tick(SimpleNamespace(character='silent'))
            self.await_previous()
            rows = list(self.state['batches'].values())
            assert len(rows) == (4 if waiting else 5), str(self.state.get('strategy_external_error'))
            assert {row['external_lane'] for row in rows if row.get('external_source')} == set('ABCD')
            assert len(list(self.observations.glob('*.json'))) == len(rows)

    def late_rejection(self, flag=None, corrupt_mode=False):
        with self.parent.state_lock():
            result = external.dispatch(self.state, str(self.root), str(self.root / 'ops'), 'silent',
                self.parent.alive, '20260101-000001', jobs.dispatch_write, {})
            assert result is not None
            batch = result[0]
            self.wait_file(self.root / 'prepared' / batch, batch)
            if flag:
                (self.directory / flag).write_text('unknown legacy/global hold\n')
            if corrupt_mode:
                value = json.loads(self.state_file.read_text())
                value['batches'][batch]['candidate_mode']['merge'] = 'live'
                self.state_file.write_text(json.dumps(value))
            (self.root / 'release' / batch).write_text('continue real admission')
            assert self.processes[batch].wait(timeout=5) == 1
            assert not list(self.observations.glob('*.json'))
            proof = json.loads((self.directory / 'learner' / (batch + '.external-not-started.json')).read_text())
            assert proof['models_started'] == 0
            out = (self.directory / 'learner' / (batch + '.out')).read_text()
            assert '"status": "held"' in out
