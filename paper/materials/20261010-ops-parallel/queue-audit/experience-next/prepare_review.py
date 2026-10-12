#!/usr/bin/env python3
"""Read-only mechanical review of an existing learner source; writes only here."""
import collections
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
SOURCE = 'e77eb7083e3c1cc1b08b21709ae600cfd447a715'
LIVE = '027bd9c570df19f4734e47059755f6698ca36452'
BATCH = '20261010-091302-experience-update'
EXPERIENCE = 'knowledge/characters/silent/experience.json'
REPORT_DIR = ROOT / '.worktrees/exp/learner/runs/20261010-091304-experience-update'
commands = []


def git(*args, check=True):
    command = ['git', *args]
    result = subprocess.run(command, cwd=ROOT, env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'}, capture_output=True)
    commands.append({'argv': command, 'rc': result.returncode,
                     'stdout_sha256': sha(result.stdout), 'stderr': result.stderr.decode()})
    if check and result.returncode:
        raise RuntimeError(result.stderr.decode())
    return result.stdout


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


def file_info(path):
    raw = path.read_bytes()
    return {'path': str(path), 'bytes': len(raw), 'sha256': sha(raw)}


def ancestor(old, new):
    git('merge-base', '--is-ancestor', old, new, check=False)
    return commands[-1]['rc'] == 0


def changed_names(old, new):
    return git('diff', '--no-renames', '--name-status', old, new).decode().splitlines()


OUT.mkdir(parents=True, exist_ok=True)
timestamp = subprocess.check_output(['date', '--iso-8601=seconds'], text=True).strip()
main = git('rev-parse', 'main').decode().strip()
current_live = git('rev-parse', 'live').decode().strip()
assert current_live == LIVE, 'live advanced: regenerate review against a fresh pinned baseline'
learn_raw = (ROOT / 'ops/codex-ops/learn.json').read_bytes()
learn = json.loads(learn_raw)
batch = learn['batches'][BATCH]
assert batch['report']['commit'] == SOURCE
save('batch-snapshot.json', batch)
before_raw = git('show', LIVE + ':' + EXPERIENCE)
source_raw = git('show', SOURCE + ':' + EXPERIENCE)
parent_raw = git('show', SOURCE + '^:' + EXPERIENCE)
before, source = json.loads(before_raw), json.loads(source_raw)
old = {e['id']: e for e in before['entries']}
new = {e['id']: e for e in source['entries']}
assert set(old) == set(new)
changed = sorted(k for k in old if old[k] != new[k])
assert len(changed) == 14
assert before_raw == parent_raw, 'source parent no longer matches live baseline'
assert all(old[k] == new[k] for k in old if 'core-' in k)
(OUT / 'experience-live027.json').write_bytes(before_raw)
(OUT / 'experience-source-e77.json').write_bytes(source_raw)
(OUT / 'experience.diff').write_bytes(git('diff', LIVE, SOURCE, '--', EXPERIENCE))
provenance = json.loads((REPORT_DIR / 'provenance-mapping.json').read_text())
assert set(p['experience'] for p in provenance) == set(changed)
mapping = {k: sorted({p['experience'] for p in provenance if k in p['ledger']})
           for p in provenance for k in p['ledger']}
assert sorted(mapping) == sorted(batch['report']['ledger']['proposed'])
save('provenance-original.json', provenance)
deltas = []
for key in changed:
    fields = sorted(k for k in set(old[key]) | set(new[key]) if old[key].get(k) != new[key].get(k))
    deltas.append({'id': key, 'scope': new[key]['scope'], 'changed_fields': fields,
                   'before': old[key], 'source': new[key],
                   'ledger': sorted(k for k, ids in mapping.items() if key in ids),
                   'evidence_added': sorted(set(new[key]['evidence']) - set(old[key]['evidence'])),
                   'evidence_removed': sorted(set(old[key]['evidence']) - set(new[key]['evidence']))})
save('exact-entry-deltas.json', deltas)
unique = []
for commit in git('rev-list', LIVE + '..' + SOURCE).decode().splitlines():
    parents = git('show', '-s', '--format=%P', commit).decode().strip().split()
    unique.append({'commit': commit, 'subject': git('show', '-s', '--format=%s', commit).decode().strip(),
                   'parents': parents, 'first_parent_paths': changed_names(parents[0], commit)})
base = git('merge-base', LIVE, SOURCE).decode().strip()
source_delta = changed_names(base, SOURCE)
all_diff = git('diff', '--no-renames', '--name-status', LIVE, SOURCE)
(OUT / 'all-live-source-tree-differences.tsv').write_bytes(all_diff)
all_paths = [line.split('\t', 1) for line in all_diff.decode().splitlines()]
source_code_paths = [p for p in source_delta if p.split('\t', 1)[-1].startswith(
    ('agent/', 'learner/', 'eval/', 'ops/', 'knowledge/', 'tools/', 'docs/'))]
assert source_code_paths == ['M\tknowledge/characters/silent/experience.json', 'M\tops/inbox-dev.md']
save('source-ancestry-audit.json', {
    'source_is_live_ancestor': ancestor(SOURCE, LIVE), 'source_is_main_ancestor': ancestor(SOURCE, main),
    'merge_base': base, 'unique_source_commits': unique, 'merge_base_to_source_paths': source_delta,
    'source_side_code_and_knowledge_paths': source_code_paths,
    'source_side_unvalidated_executable_changes': [],
    'current_live_to_source_path_count': len(all_paths),
    'current_live_to_source_top_counts': dict(collections.Counter(p.lstrip('"').split('/')[0] for _, p in all_paths)),
    'current_live_to_source_executable_and_knowledge_paths': [line for line in all_diff.decode().splitlines()
        if line.split('\t', 1)[-1].startswith(('agent/', 'learner/', 'ops/', 'eval/', 'tools/', 'knowledge/'))],
    'warning': 'Source is older than current live in many files. Preserve every live path except experience; source ancestry alone does not mean every historical source blob was deployed.'})
spec = importlib.util.spec_from_file_location('ledger_readonly', ROOT / 'learner/ledger.py')
ledger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ledger)
folded = ledger.fold()
selected = {k: folded[k] for k in sorted(mapping)}
save('ledger-current-selected.json', selected)
ledger_rows = ledger.read_rows()
save('ledger-source-registration.json', [{'line': n, 'row': row} for n, row in ledger_rows
    if row and row.get('id') in mapping and SOURCE in (row.get('where') or {}).get('commits', [])])
draft_ops = []
for key in sorted(mapping):
    draft_ops.append({'op': 'update', 'id': key, 'by': 'codex-ops', 'status': 'shipped',
                      'version': 'S1.exp148',
                      'where': {'experience': mapping[key], 'commits': [SOURCE, '<ACTUAL_LIVE_MERGE_COMMIT>']},
                      'note': '仅本批原经验数据2026-10-10.6已实际live的有限scope；14条观察/案例更新对应16既有账本。原claim、首证、反例、后续证据及代码提案历史保持；不宣称源码实现或实盘采用。'})
(OUT / 'ledger-operations-DRAFT-NOT-EXECUTED.jsonl').write_text(
    ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in draft_ops))
versions = {}
for ref in ('main', LIVE):
    values = json.loads(git('show', ref + ':eval/versions.json'))['versions']
    exp = [v for v in values if v['name'].startswith('S1.exp')]
    assert not any(v['name'] == 'S1.exp148' for v in values)
    versions[ref] = {'last_experience': exp[-1], 'candidate_next': 'S1.exp148', 'reserved': False}
save('next-version-slot.json', versions)
active = {k: v for k, v in learn['batches'].items() if v.get('state') == 'running'}
later = {k: {'state': v.get('state'), 'rc': v.get('rc'), 'worktree': v.get('worktree'),
             'report': v.get('report')} for k, v in learn['batches'].items()
         if k > BATCH and v.get('task') == 'experience-update'}
exp_head = git('-C', str(ROOT / '.worktrees/exp'), 'rev-parse', 'HEAD').decode().strip()
exp_status = git('-C', str(ROOT / '.worktrees/exp'), 'status', '--porcelain=v1', '--untracked-files=no').decode()
assert exp_head == SOURCE and not exp_status
save('lease-and-replacement-check.json', {'registered_running_batches': active, 'later_experience_batches': later,
    'exp_head': exp_head, 'exp_tracked_status': exp_status,
    'host_process_identity_checked': False,
    'limitation': 'No registered active lease and source tree tracked-clean at this cut. Sandbox /proc is not host identity proof. Main ops must recheck host writer via ops-do procs before a mutating integration.'})
names = ['report.md', 'completion.json', 'changes.json', 'provenance-mapping.json', 'test-results.json',
         'test-copy-manifest.json', 'test-source-1.log', 'test-source-1.exit', 'test-mirror-1.log',
         'test-mirror-1.exit', 'gitleaks-source.log', 'gitleaks-source.exit', 'live-merge.json',
         'consumer-render-verification.json', 'check-experience-final.log', 'ledger-check-completion.log',
         'changelog-section.md', 'final-verification.json']
manifest = [file_info(REPORT_DIR / name) for name in names]
for name in ['test-results.json', 'live-merge.json', 'consumer-render-verification.json', 'final-verification.json']:
    save('original-' + name, json.loads((REPORT_DIR / name).read_text()))
for suffix in ('out', 'err'):
    path = ROOT / 'ops/codex-ops/learner' / (BATCH + '.' + suffix)
    manifest.append(file_info(path))
save('source-manifest.json', {'timestamp': timestamp, 'learn_path': str(ROOT / 'ops/codex-ops/learn.json'),
    'learn_sha256_at_cut': sha(learn_raw), 'originals': manifest,
    'source_experience_sha256': sha(source_raw), 'source_experience_git_blob': git('rev-parse', SOURCE + ':' + EXPERIENCE).decode().strip(),
    'live_experience_sha256': sha(before_raw), 'live_experience_git_blob': git('rev-parse', LIVE + ':' + EXPERIENCE).decode().strip(),
    'ledger_source_sha256_at_cut': file_info(ROOT / 'paper/materials/learning/ledger.jsonl')['sha256']})
save('review.json', {'timestamp': timestamp, 'main': main, 'live': LIVE, 'batch': BATCH, 'source': SOURCE,
    'source_task': 'experience-update', 'disposition': 'pending mechanical integration; this review performs no merge/registration',
    'original_batch_state': batch['state'], 'original_rc': batch['rc'], 'original_merged': batch['merged'],
    'scope': [EXPERIENCE], 'before_version': before['version'], 'source_version': source['version'],
    'added': 0, 'updated': 14, 'retired': 0, 'active_before': len(old), 'active_after': len(new),
    'source_parent_equals_live_experience_bytes': before_raw == parent_raw,
    'core_entries_unchanged': [k for k in old if 'core-' in k],
    'exact_ledger_scope': mapping, 'code_proposal_ids': batch['report']['code_proposals'],
    'code_proposal_action': 'Preserve existing registration/dispatch; data shipping is not source implementation.',
    'source_tests': json.loads((REPORT_DIR / 'test-results.json').read_text()),
    'full_host_test_for_this_source': 'not present; request original-batch learner-recheck after actual source ancestry/live integration',
    'planned_next_version': 'S1.exp148; still free at cut, not reserved',
    'limitations': ['Host lease identity not inspected by child', 'Later postmortem ledger additions must remain intact',
                    'Offline rendering success does not prove live brain adopted new lessons',
                    'Original failed rc0/null merge and first ENOENT failure remain historical facts',
                    'Current live tree changes require regeneration/recheck before a mutating integration']})
save('commands.json', {'timestamp': timestamp, 'commands': commands})
print(json.dumps({'directory': str(OUT), 'source': SOURCE, 'changed': len(changed), 'ledger': len(mapping),
                  'source_only_commits': len(unique), 'next_version': 'S1.exp148',
                  'source_sha256': sha(source_raw), 'live_sha256': sha(before_raw)}, ensure_ascii=False))
