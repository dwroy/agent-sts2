"""Reuse a still-current real receipt; otherwise run the same fixed consumer once anew."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(entry):
    return hashlib.sha256(json.dumps(entry, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def save(path, value):
    assert not path.exists(), path
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


pub = json.loads((HERE / 'publication.json').read_text())
assert pub['publication'] and not pub.get('error')
previous_path = Path(pub['consumer_receipt']['path'])
assert sha(previous_path) == pub['consumer_receipt']['sha256']
previous = json.loads(previous_path.read_text())
for item in previous['evidence']:
    assert sha(Path(item['path'])) == item['sha256']
current = json.loads((LIVE / 'knowledge/characters/silent/experience.json').read_text())
entries = {e['id']: e for e in current['entries']}
assert len(previous['entries']) == 10
owned = set(pub['experience_owned_ids'])
context_changed = []
for ref in previous['entries']:
    same = canonical(entries[ref['id']]) == ref['sha256']
    if ref['id'] in owned:
        assert same, 'An owned object changed; do not replace its research input.'
    elif not same:
        context_changed.append(ref['id'])
outputs = [e for e in previous['evidence'] if e['path'].endswith('-output.json')]
assert len(outputs) == 1
old_sources = json.loads(Path(outputs[0]['path']).read_text())['source_files']
consumer_source_changed = any(sha(LIVE / r['path']) != r['sha256'] for r in old_sources)
head = subprocess.check_output(['git', '-C', str(LIVE), 'rev-parse', 'HEAD'], text=True).strip()
tree = subprocess.check_output(['git', '-C', str(LIVE), 'rev-parse', 'HEAD^{tree}'], text=True).strip()
for commit in [pub['source'], pub['merged'], pub['publication']]:
    subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', commit, head], check=True)
if current['version'] == previous['experience_version'] and not context_changed and not consumer_source_changed:
    receipt_ref = pub['consumer_receipt']
    executed = False
else:
    label = 'current-consumer-' + dt.datetime.now().strftime('%Y%m%d-%H%M%S')
    expected = {'experience_version': current['version'], 'entries':
                [{'entry': entries[r['id']], 'sha256': canonical(entries[r['id']])} for r in previous['entries']]}
    expected_path = HERE / (label + '-expected.json')
    save(expected_path, expected)
    argv = ['nice', '-n', '19', 'python3', str(HERE / 'run-consumer.py'), '--root', str(LIVE),
            '--label', label, '--expected-head', head, '--expected', str(expected_path)]
    result = subprocess.run(argv, capture_output=True)
    (HERE / (label + '-wrapper.log')).write_bytes(result.stdout + result.stderr)
    save(HERE / (label + '-wrapper-command.json'), {'argv': argv, 'exit': result.returncode})
    assert result.returncode == 0, result.stderr.decode(errors='replace')
    output = json.loads((HERE / (label + '-output.json')).read_text())
    assert output['status'] == 'passed' and output['experience_version'] == current['version']
    names = [label + suffix for suffix in ['-expected.json', '-input.json', '-output.json', '-command.json',
             '-observation-before.json', '-observation-after.json', '-read-guard.json', '.log',
             '-wrapper.log', '-wrapper-command.json']]
    receipt = {'request_id': 'roy-20261017-human-pace-h0', 'revision': 1, 'character': 'silent',
               'experience_version': output['experience_version'], 'kind': 'fixed-consumer', 'status': 'passed',
               'live_commit': output['head'], 'tested_tree': output['tree'],
               'source_commit': pub['source'], 'previous_receipt_preserved': pub['consumer_receipt'],
               'entries': [{'id': e['id'], 'sha256': e['sha256']} for e in output['checks']],
               'evidence': [{'path': str(HERE / name), 'sha256': sha(HERE / name)} for name in names] +
                           [{'path': str(HERE / name), 'sha256': sha(HERE / name)} for name in
                            ['consumer-v2.mts', 'run-consumer.py', 'input-read-guard.mjs']],
               'scope': 'One new actual execution of the same fixed consumer after a whole-library version, production reader-source or unowned context object changed; owned research objects remain identical. No old output/receipt rewritten; no natural-use or H1 calibration claim.'}
    receipt_path = HERE / (label + '-receipt.json')
    save(receipt_path, receipt)
    receipt_ref = {'path': str(receipt_path), 'sha256': sha(receipt_path)}
    executed = True
save(HERE / 'current-consumer-guard.json', {'observed_at': dt.datetime.now(dt.timezone.utc).isoformat(),
     'live_head': head, 'live_tree': tree, 'experience_version': current['version'], 'objects_verified': 10,
     'owned_canonical_entries_unchanged': True, 'unowned_context_changed': context_changed, 'consumer_source_changed': consumer_source_changed, 'new_execution_required': executed, 'consumer_receipt': receipt_ref,
     'scope': 'Current per-file/live ancestry observation; no ACK or atomic running-game snapshot.'})
print(json.dumps({'status': 'passed', 'new_execution': executed, 'consumer_receipt': receipt_ref}, ensure_ascii=False))
