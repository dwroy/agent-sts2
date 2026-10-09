from pathlib import Path
import base64, hashlib, json, subprocess

root = Path('/home/dw/Projects/agent-sts2')
result = Path('/tmp/sts2-20261009-1639-paper-result.json')
assert not result.exists()
paths = ['paper/data/README.md', 'paper/data/commits.csv', 'paper/data/decisions_by_label.csv',
         'paper/data/escalations.csv', 'paper/data/fight_plans.csv', 'paper/data/runs.csv',
         'paper/data/summary.json', 'paper/data/verification.json', 'paper/data/cost-sources.json',
         'paper/data/cost-unattributed.csv']
paths += [str(p.relative_to(root)) for p in (root / 'paper/data').glob('learning-curve-*.csv')]
paths += [str(p.relative_to(root)) for p in (root / 'paper/data').glob('cost-*.csv')]
paths += [str(p.relative_to(root)) for p in (root / 'paper/materials').glob('*/cost.md')]
paths = sorted(set(paths))
def digest(path):
    p = root / path
    return hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
before = {p: digest(p) for p in paths}
dirty_before = subprocess.check_output(['git', 'diff', '--name-only', '--', *paths], cwd=root).decode().splitlines()
print(subprocess.check_output(['date'], cwd=root).decode().strip(), flush=True)
with Path('/tmp/sts2-20261009-1639-paper-dataset.log').open('w') as log:
    proc = subprocess.run(['nice', '-n', '19', 'python3', 'ops/paper_dataset.py', '--no-raw'],
                          cwd=root, stdout=log, stderr=subprocess.STDOUT)
paths = sorted(set(paths + [str(p.relative_to(root)) for p in (root / 'paper/data').glob('learning-curve-*.csv')]
                   + [str(p.relative_to(root)) for p in (root / 'paper/data').glob('cost-*.csv')]
                   + [str(p.relative_to(root)) for p in (root / 'paper/materials').glob('*/cost.md')]))
after = {p: digest(p) for p in paths}
changed = [p for p in paths if after[p] != before.get(p)]
content = {p: base64.b64encode((root / p).read_bytes()).decode() for p in changed if after[p] is not None}
assert all(hashlib.sha256(base64.b64decode(content[p])).hexdigest() == after[p] for p in content)
print(subprocess.check_output(['date'], cwd=root).decode().strip(), flush=True)
result.write_text(json.dumps({'rc': proc.returncode, 'before': before, 'after': after,
                             'changed': changed, 'dirty_before': dirty_before, 'content_base64': content}, indent=2) + '\n')
print('PAPER EXIT', proc.returncode, 'changed', changed, flush=True)
print(Path('/tmp/sts2-20261009-1639-paper-dataset.log').read_text()[-6500:], flush=True)
raise SystemExit(proc.returncode)
