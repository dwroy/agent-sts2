"""One nonblocking live integration of the tested six-path source; no production process changes."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path('/home/dw/Projects/agent-sts2')
WORK = ROOT / '.worktrees/codex-brain-cache'
LIVE = ROOT / '.worktrees/live'
OUT = WORK / 'learner/runs/20261008-153529-codex-brain-cache'
SOURCE = '548b53ca211231ab5f1079a16fe9ad65f62b3c6c'
validation = json.loads((OUT / 'source-validation.json').read_text())
PATHS = validation['source_paths']
result = {'source': SOURCE, 'merged': None, 'published': None, 'version': None, 'status': 'pending'}


def git(*args, cwd=LIVE):
    return subprocess.check_output(['git', '-C', str(cwd), *args], text=True).strip()


def knowledge_snapshot(tag):
    tracked = git('ls-tree', '-r', 'HEAD', '--', 'knowledge/').splitlines()
    dirty = subprocess.check_output(['git', '-C', str(LIVE), 'status', '--porcelain=v1', '-z', '--', 'knowledge/']).split(b'\0')
    saved = {}
    for row in filter(None, dirty):
        name = row[3:].decode()
        path = LIVE / name
        if path.is_file():
            target = OUT / ('live-refresh-' + tag) / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
            saved[name] = {'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size}
        else:
            saved[name] = {'status': 'deleted-or-nonfile', 'porcelain': row.decode()}
    return {'tracked_git_blobs': tracked, 'saved_dirty_and_added': saved}


def persist():
    (OUT / 'publication.json').write_text(json.dumps(result, indent=2) + '\n')


try:
    with (ROOT / 'ops/live-merge.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        result['live_before'] = git('rev-parse', 'HEAD')
        env = dict(os.environ, CODEX_OPS_DO_WAIT='30')
        with (OUT / 'live-lock-procs.log').open('w') as log:
            procs = subprocess.run(['nice', '-n', '19', 'bash', str(ROOT / 'ops/codex-ops-do.sh'), 'procs'],
                                   cwd=WORK, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=40)
        result['procs_exit'] = procs.returncode
        if procs.returncode:
            raise RuntimeError('no verified external process view; no live mutation')
        if re.search(r'ops/report\.py|knowledge/builders/|(?:^|[ /])refresh\.sh', (OUT / 'live-lock-procs.log').read_text()):
            raise RuntimeError('live refresh is in flight; no live mutation')
        if (Path(git('rev-parse', '--absolute-git-dir')) / 'MERGE_HEAD').exists():
            raise RuntimeError('another live merge is in progress')
        if subprocess.check_output(['git', '-C', str(LIVE), 'diff', '--cached', '--name-only']):
            raise RuntimeError('live index is occupied; no live mutation')
        result['knowledge_before'] = knowledge_snapshot('before')
        changed = git('diff', '--name-only', SOURCE + '^', 'HEAD', '--', *PATHS)
        result['source_overlap_precheck'] = changed.splitlines()
        if changed:
            raise RuntimeError('selected live source changed relative to tested source base; preserve it and stop')
        dirty = git('status', '--porcelain=v1', '--', *PATHS)
        if dirty:
            raise RuntimeError('selected live source is dirty; preserve it and stop')
        actual = git('diff-tree', '--no-commit-id', '--name-only', '-r', SOURCE).splitlines()
        if set(actual) != set(PATHS):
            raise RuntimeError('source scope differs from tested six paths')
        patch = subprocess.check_output(['git', 'show', '--format=', '--binary', SOURCE], cwd=WORK)
        (OUT / 'source.patch').write_bytes(patch)
        check = subprocess.run(['git', 'apply', '--check', '--index', '-'], cwd=LIVE, input=patch, capture_output=True)
        (OUT / 'live-apply-check.log').write_bytes(check.stdout + check.stderr)
        result['apply_check'] = check.returncode
        if check.returncode:
            raise RuntimeError('patch precheck failed; no live mutation')
        if not result['knowledge_before']['saved_dirty_and_added'] == {}:
            raise RuntimeError('new knowledge refresh needs a recorded refresh commit before integration; saved bytes preserved')
        result['live_premerge'] = git('rev-parse', 'HEAD')
        with (OUT / 'live-cherry-pick.log').open('w') as log:
            pick = subprocess.run(['git', 'cherry-pick', '-x', SOURCE], cwd=LIVE, stdout=log, stderr=subprocess.STDOUT)
        result['cherry_pick_exit'] = pick.returncode
        if pick.returncode:
            raise RuntimeError('cherry-pick failed; retain original failure for ops continuation')
        result['merged'] = git('rev-parse', 'HEAD')
        result['merged_tree'] = git('rev-parse', 'HEAD^{tree}')
        result['merged_agent_tree'] = git('rev-parse', 'HEAD:agent')
        result['source_blobs_match'] = all(git('rev-parse', 'HEAD:' + p) == validation['source_blobs'][p] for p in PATHS)
        result['knowledge_after_merge'] = knowledge_snapshot('after-merge')
        if not result['source_blobs_match'] or result['knowledge_before'] != result['knowledge_after_merge']:
            raise RuntimeError('post-merge byte preservation check failed')
        env.update(PATH=str(Path.home() / '.local/node/bin') + ':' + env.get('PATH', ''),
                   TMPDIR=str(OUT / 'scratch'), SANDBOX_WORKERS='4')
        persist()
        with (OUT / 'live-sandbox.log').open('w') as log:
            tests = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', env=env,
                                   stdout=log, stderr=subprocess.STDOUT)
        result['sandbox_exit'] = tests.returncode
        (OUT / 'live-sandbox.exit').write_text(str(tests.returncode) + '\n')
        result['knowledge_after_tests'] = knowledge_snapshot('after-tests')
        if tests.returncode:
            with (OUT / 'live-code-rollback.log').open('w') as log:
                reverted = subprocess.run(['git', 'revert', '--no-edit', result['merged']], cwd=LIVE,
                                          stdout=log, stderr=subprocess.STDOUT)
            result['rollback_exit'] = reverted.returncode
            result['rollback_head'] = git('rev-parse', 'HEAD')
            result['status'] = 'failed-original-check-retained-code-reverted' if reverted.returncode == 0 else 'failed-code-rollback-blocked'
            raise RuntimeError('actual merged tree failed the original sandbox check; no release claimed')
        result['published'] = git('rev-parse', 'HEAD')
        result['fixed_tree'] = git('rev-parse', 'HEAD^{tree}')
        result['status'] = 'published-tool-only-controlled-probe-pending-next-wake'
        persist()
except Exception as error:
    result['error'] = str(error)
    if result['status'] == 'pending':
        result['status'] = 'blocked'
    persist()
    print(json.dumps({'status': result['status'], 'error': str(error), 'merged': result['merged']}))
    sys.exit(1)
print(json.dumps({'status': result['status'], 'merged': result['merged'], 'published': result['published']}))
