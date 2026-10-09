import difflib, json, pathlib, re, subprocess

ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
FEATURE = ROOT / '.worktrees/ops-eval-metrics'
LIVE = ROOT / '.worktrees/live'
RESULT = pathlib.Path('/tmp/sts2-0907-deploy-result.json')
LOG = 'paper/materials/decision-log.md'
FOOTER = 'Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'
PATHS = ['agent/tests/learner-jobs.test.ts', 'agent/tests/ops-eval-metrics.test.ts',
         'agent/tests/ops_eval_metrics_test.py', 'docs/codex-ops.md',
         'learner/tasks/fix-batch.md', 'ops/codex-ops-actions.sh',
         'ops/codex-ops-do.sh', 'ops/codex/lib.ts']

def run(args, cwd=ROOT, data=None, check=True):
    r = subprocess.run(args, cwd=cwd, input=data, text=True,
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if check and r.returncode:
        raise RuntimeError(f'{args!r}: exit {r.returncode}: {r.stdout}')
    return r

def git(*args, cwd=ROOT, check=True):
    return run(['git', *args], cwd=cwd, check=check).stdout

def stamp():
    value = run(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
    print('date:', value, flush=True)
    return value

def scan(cwd):
    git('-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', cwd=cwd)
    run(['nice', '-n', '19', '/home/dw/.local/bin/gitleaks', 'stdin',
         '--no-banner', '--redact', '--log-level', 'error'], cwd=cwd,
        data=git('diff', '--cached', '--no-ext-diff', '--no-textconv', cwd=cwd))

def commit(message, cwd):
    scan(cwd)
    print(git('commit', '-m', message + '\n\n' + FOOTER, cwd=cwd), flush=True)
    return git('rev-parse', 'HEAD', cwd=cwd).strip()

def save(value):
    RESULT.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def checked_summary(path):
    raw = path.read_text()
    assert len(re.findall(r'Test Files\s+\d+ passed', raw)) == 2, raw[-4000:]
    return {'exit': 0, 'files': sum(map(int, re.findall(r'Test Files\s+(\d+) passed', raw))),
            'cases': sum(map(int, re.findall(r'\bTests\s+(\d+) passed', raw))), 'log': str(path)}

def preserve_log(cwd):
    ours = git('show', ':2:' + LOG, cwd=cwd)
    theirs = git('show', ':3:' + LOG, cwd=cwd)
    missing = [s for s in theirs.splitlines() if s and s not in set(ours.splitlines())]
    assert all(s.startswith('- ') for s in missing)
    assert not re.search(r'^(<<<<<<<|=======|>>>>>>>)', ours + theirs, re.M)
    stamp()
    (cwd / LOG).write_text(ours.rstrip('\n') + '\n' + '\n'.join(missing) + '\n')
    git('add', '--', LOG, cwd=cwd)
    print('Preserved both decision logs:', len(missing), flush=True)

def preserve_versions(cwd):
    name = 'eval/versions.json'
    ours = git('show', ':2:' + name, cwd=cwd)
    current = json.loads(ours)
    other = json.loads(git('show', ':3:' + name, cwd=cwd))
    assert {k: v for k, v in current.items() if k != 'versions'} == {k: v for k, v in other.items() if k != 'versions'}
    by_name = {v['name']: v for v in current['versions']}
    added = []
    for entry in other['versions']:
        if entry['name'] in by_name:
            assert by_name[entry['name']] == entry, entry['name']
        else:
            added.append(entry)
    marker = '\n  ]\n}'
    assert marker in ours
    stamp()
    (cwd / name).write_text(ours.replace(marker, ''.join(',\n    ' + json.dumps(v, ensure_ascii=False) for v in added) + marker, 1))
    git('add', '--', name, cwd=cwd)

def cache_update(path, target):
    base = git('show', ':' + path)
    patch = ''.join(difflib.unified_diff(base.splitlines(True), target.splitlines(True),
                                       fromfile='a/' + path, tofile='b/' + path))
    run(['git', 'apply', '--cached', '--check'], data=patch)
    run(['git', 'apply', '--cached'], data=patch)

def append_owned(path, addition):
    cache_update(path, git('show', ':' + path) + addition)
    with (ROOT / path).open('a') as output:
        output.write(addition)
