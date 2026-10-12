"""Integrate only this immutable, tested source while preserving live refreshes."""
import fcntl
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
SOURCE = '76508f8aed6fbcf3cd43e1cf2f2fda78d0c5eaa9'
result = dict(source=SOURCE, merged=None, status='preparing', tests=None, version=None)

def save():
    (HERE/'publication-followup.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')

def run(args, cwd=LIVE, check=True, log=None, env=None):
    p = subprocess.run(args, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if log:
        (HERE/log).write_bytes(p.stdout)
    if check and p.returncode:
        raise RuntimeError(f'{args[0]} operation failed ({p.returncode}); log={log}')
    return p

def git(*args, **kwargs):
    return run(['git', *args], **kwargs)

save()
with (ROOT/'ops/live-merge.lock').open('a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        result.update(status='blocked', reason='live-merge.lock busy; no live mutation')
        save(); sys.exit(75)
    try:
        result['checked_at'] = run(['date','-Iseconds']).stdout.decode().strip()
        env = {**os.environ, 'CODEX_OPS_DO_WAIT':'15'}
        procs = run(['nice','-n','19','bash',str(ROOT/'ops/codex-ops-do.sh'),'procs'], cwd=ROOT, check=False, env=env, log='followup-merge-lock-procs.log')
        if procs.returncode:
            raise RuntimeError('Cannot verify external refresh state through the existing broker')
        busy = [line for line in procs.stdout.decode().splitlines() if line[:1].isdigit()
                and ('knowledge/builders/' in line or 'ops/report.py' in line or '/refresh.sh' in line)]
        if busy:
            raise RuntimeError('External refresh/report still in flight; preserve live untouched')
        result['external_refresh_check'] = {'exit':0, 'busy':busy, 'log':str(HERE/'followup-merge-lock-procs.log')}
        if git('diff','--cached','--quiet',check=False).returncode:
            raise RuntimeError('Live index is occupied')
        for ref in ['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD']:
            if git('rev-parse','--verify','-q',ref,check=False).returncode == 0:
                raise RuntimeError('Live has an existing operation: '+ref)
        result['initial_live'] = git('rev-parse','HEAD').stdout.decode().strip()
        incoming = git('diff-tree','--no-commit-id','--name-only','-r',SOURCE).stdout.decode().splitlines()
        result['source_paths'] = incoming
        dirty = git('ls-files','-m','-o','--exclude-standard','-z','--','knowledge','notes/fight-value-backtest*.md').stdout.decode().split('\0')
        dirty = sorted(set(p for p in dirty if p))
        result['refresh_paths'] = dirty
        result['overlap'] = sorted(set(dirty)&set(incoming))
        if result['overlap']:
            raise RuntimeError('Source overlaps refreshed live data')
        snapshot = HERE/'followup-live-refresh-before'
        hashes = {}
        for name in dirty:
            source = LIVE/name
            target = snapshot/name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source,target)
            hashes[name] = hashlib.sha256(target.read_bytes()).hexdigest()
        result['refresh_sha256'] = hashes
        if dirty:
            git('add','--',*dirty)
            scan = run(['nice','-n','19','gitleaks','git','--staged','--no-banner','--redact'],check=False,log='followup-live-refresh-gitleaks.log')
            if scan.returncode:
                git('reset','--',*dirty)
                raise RuntimeError('Refresh gitleaks failed; original live working data remains')
            git('commit','-m','Refresh knowledge data before Codex cache measurement integration','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>',log='followup-live-refresh-commit.log')
        result['pre_merge'] = git('rev-parse','HEAD').stdout.decode().strip()
        result['knowledge_tree_before'] = git('ls-tree','-r','HEAD','--','knowledge').stdout.decode()
        patch = git('diff',SOURCE+'^',SOURCE,'--',*incoming).stdout
        (HERE/'followup-source.patch').write_bytes(patch)
        preflight = git('apply','--check',str(HERE/'followup-source.patch'),check=False,log='followup-live-preflight.log')
        result['preflight'] = preflight.returncode
        if preflight.returncode:
            raise RuntimeError('Source preflight conflict; refresh commit preserved')
        git('cherry-pick','--no-edit',SOURCE,log='followup-live-cherry-pick.log')
        result['code_commit'] = git('rev-parse','HEAD').stdout.decode().strip()
        result['fixed_tree'] = git('rev-parse','HEAD^{tree}').stdout.decode().strip()
        if result['knowledge_tree_before'] != git('ls-tree','-r','HEAD','--','knowledge').stdout.decode():
            raise RuntimeError('Knowledge tree changed during source integration')
        result['status'] = 'testing'; save()
        test_env = {**os.environ, 'PATH':str(pathlib.Path.home()/'.local/node/bin')+':'+os.environ.get('PATH',''),
                    'TMPDIR':str(HERE/'scratch'), 'SANDBOX_WORKERS':'4'}
        with (HERE/'followup-live-sandbox.log').open('wb') as output:
            tested = subprocess.run(['bash','tools/test-sandbox.sh'],cwd=LIVE/'agent',env=test_env,stdout=output,stderr=subprocess.STDOUT)
        (HERE/'followup-live-sandbox.exit').write_text(str(tested.returncode)+'\n')
        result['tests'] = {'exit':tested.returncode,'log':str(HERE/'followup-live-sandbox.log')}
        if tested.returncode:
            git('revert','--no-edit',result['code_commit'],log='followup-live-revert.log')
            result.update(status='reverted',rollback=git('rev-parse','HEAD').stdout.decode().strip())
            save(); sys.exit(1)
        ancestry = git('merge','--no-ff','--strategy=ours',SOURCE,'-m','Record ancestry of the tested Codex cache source; retain the verified live tree','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>',log='followup-source-ancestry.log')
        result['source_ancestry_commit'] = git('rev-parse','HEAD').stdout.decode().strip()
        result['same_tested_tree'] = result['fixed_tree'] == git('rev-parse','HEAD^{tree}').stdout.decode().strip()
        if not result['same_tested_tree']:
            raise RuntimeError('Ancestry metadata changed the tested tree')
        result['merged'] = result['source_ancestry_commit']
        result['knowledge_tree_after'] = git('ls-tree','-r','HEAD','--','knowledge').stdout.decode()
        result['knowledge_preserved'] = result['knowledge_tree_before']==result['knowledge_tree_after']
        result['status'] = 'tested-live-integration'
        save()
    except Exception as error:
        result.update(status='blocked',reason=str(error))
        save(); print(str(error)); sys.exit(1)
print(json.dumps({k:result[k] for k in ['status','source','merged','tests','version']}))
