"""Bounded, read-only verification of frozen replay materials, not production tests."""
import gzip
import hashlib
import json
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    questions = json.load(gzip.open(HERE/'frozen/questions.json.gz', 'rt'))
    ledger = [json.loads(x) for x in (HERE/'results/requests.jsonl').read_text().splitlines()]
    assert len(questions) == 83 and len({q['key'] for q in questions}) == 83
    selected = {q['key'] for q in questions if q['nova_selected']}
    assert len(selected) == len(ledger) == 60
    assert selected == {r['key'] for r in ledger}
    assert [r['ordinal'] for r in ledger] == list(range(1, 61))
    analysis = json.loads((HERE/'analysis-results.json').read_text())
    assert {r['key'] for r in analysis} == {q['key'] for q in questions}
    assert all(not r['display_mismatches'] and r['wire_bytes'] <= 24000 for r in analysis)
    for q in questions:
        r = json.load(gzip.open(HERE/'results'/f"{q['key']}.json.gz", 'rt'))
        assert r['brain_choice'] == q['brain_choice']
        assert r['nova_selected'] == q['nova_selected']
        assert ('jev' in r) == q['nova_selected']
        assert q['combat']['state']['in_combat']
        assert q['combat']['state']['run_id'] == q['run']
        assert q['combat']['state']['run']['floor'] == q['floor']
        assert len(q['frame']['state']['reward']['card_options']) == 3
        assert q['decision']['chosen']['action'] in ('choose_reward_card', 'skip_reward_cards')
    runtime = ROOT/'.artifacts/runtime'
    data = json.loads((HERE/'frozen/runtime-data-manifest.json').read_text())
    assert all(sha(runtime/x['snapshot']) == x['sha256'] for x in data)
    with tarfile.open(HERE/'frozen/runtime-data.tar.gz', 'r:gz') as archive:
        for entry in data:
            payload = archive.extractfile(entry['snapshot']).read()
            assert hashlib.sha256(payload).hexdigest() == entry['sha256']
    source = []
    files = sorted((ROOT/'agent/src').rglob('*.ts'))
    files += [ROOT/'agent/tests/logged.ts', ROOT/'agent/tests/logged-states/game-data.json', ROOT/'agent/package.json']
    for f in files:
        rel = f.relative_to(ROOT)
        assert sha(f) == sha(runtime/rel), str(rel)
        source.append({'path': str(rel), 'sha256': sha(f), 'bytes': f.stat().st_size})
    assert not subprocess.check_output(['git', 'diff', 'HEAD', '--', 'agent/src', 'agent/tests/logged.ts', 'agent/tests/logged-states/game-data.json', 'agent/package.json'], cwd=ROOT)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    assert head == 'cf4aff4ceebd958ad70b1512cc886c45bd8092aa'
    checks = HERE/'checks'
    checks.mkdir(exist_ok=True)
    (checks/'runtime-source-manifest.json').write_text(json.dumps({'base': head, 'files': source}, indent=2)+'\n')
    receipt = {'base': head, 'situations': len(questions), 'nova_requests': len(ledger),
               'ledger_unique': True, 'strict_postcombat_source': True, 'source_files': len(source),
               'data_files': len(data), 'source_and_snapshot_bytes_verified': True,
               'archived_data_bytes_verified': True,
               'display_formatter_verified': True, 'wire_budget_bytes': 24000,
               'production_code_changed': False, 'actions_dispatched': 0,
               'source_manifest_sha256': sha(checks/'runtime-source-manifest.json')}
    (checks/'verification.json').write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
