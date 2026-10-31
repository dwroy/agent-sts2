from pathlib import Path
import json, hashlib, subprocess, sqlite3, os

R = Path('/home/dw/Projects/agent-sts2')
M = R / 'paper/materials/20261025-issue62-combination-integrator'
O = R / 'paper/materials/20261025-issue62-natural-publication-ops'
F = R / '.artifacts/ops-issue59-62-release-20261025/sessions/62'
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_text())
K = 'K1-04b03e8483afb3061eb9a060055313cfc614cab79a0928b7c14bdf4c3853e7a4'
binding = 'launch:20261025-133306-e9a468882+dirty'

def slice_read(ref):
    with (R / ref['path']).open('rb') as f:
        f.seek(ref['offset'])
        b = f.read(ref['bytes'])
    assert len(b) == ref['bytes'] and sha(b) == ref['sha256'], ref['path']
    return json.loads(b)

launch = read(O / 'natural-launch-readback.json')
configs = [slice_read(x['source']) for x in launch]
for x in configs:
    assert x['run_id'] == '5K2E6HYNAAG1'
    assert x['knowledge']['runtime_version'] == K and x['knowledge']['runtime_binding'] == binding
    assert x['knowledge']['runtime_control_sha256'] == 'fd0a0be382d28395e5aee5bc47e12e1787984783ead444046ab548c176e396ca'
control_sha = configs[0]['knowledge']['runtime_control_sha256']
pid = configs[0]['process']['pid']
env = dict(s.split(b'=', 1) for s in Path(f'/proc/{pid}/environ').read_bytes().split(b'\0') if b'=' in s)
assert env[b'STS2_KNOWLEDGE_VERSION'].decode() == K
assert env[b'STS2_KNOWLEDGE_RUNTIME_CONTROL_SHA256'].decode() == control_sha
db = sqlite3.connect('file:' + str(R / 'data/knowledge-runtime/knowledge.sqlite') + '?mode=ro', uri=True)
db.row_factory = sqlite3.Row
try:
    rows = [dict(x) for x in db.execute('SELECT * FROM run_bindings WHERE run_id=?', (binding,))]
    assert len(rows) == 1 and rows[0]['version'] == K and rows[0]['code'] == 'e9a468882a4fe1da2b1b721f0271b82f6083b002'
finally:
    db.close()
consumption = read(O / 'natural-reader-consumption.json')
accepted = []
for row in consumption['rows']:
    x = slice_read(row['ref'])
    assert x['accepted'] is True and x['run_id'] == row['run_id'] and x['question_id'] == row['question']
    actual = [c for c in x['tool_calls'] if c['name'] in ('kb_strategies', 'kb_experience')]
    assert len(actual) == len(row['actual_indexed_tool_calls'])
    calls = []
    for c, expected in zip(actual, row['actual_indexed_tool_calls']):
        output = json.loads(c['output']) if isinstance(c['output'], str) else c['output']
        assert c['name'] == expected['name'] and c['input'] == expected['input']
        assert output['knowledge_version'] == K and c['sources'] == expected['sources']
        ids = [e['id'] for e in output['entries']]
        assert ids == [e['id'] for e in expected['returned_ids_versions']]
        assert all(s['knowledge_version'] == K for s in c['sources'])
        calls.append(dict(name=c['name'], returned_ids=ids, source_count=len(c['sources'])))
    accepted.append(dict(question_id=x['question_id'], accepted=True, slice_sha256=row['ref']['sha256'], calls=calls))

native_refs = read(O / 'natural-native-context.json')
native_evidence = []
for ref in native_refs:
    p = R / ref['path']
    if p.is_file():
        x = slice_read(ref)
        native_evidence.append(dict(path=ref['path'], verified=True, sha256=ref['sha256']))
    else:
        native_evidence.append(dict(path=ref['path'], resolved_path=str(p.resolve()), verified=False, reason='source file absent at independent readback; original SHA and logged native receipt retained', expected_sha256=ref['sha256']))

release = read(O / 'issue62-release.json')
pre = read(F / 'pre-release.json')
for oldpid in pre['allowed_idle_pids']:
    assert not Path('/proc', str(oldpid)).exists(), ('old release PID present', oldpid)
native = Path(release['native_log']['path']).read_bytes()
assert len(native) >= release['native_log']['bytes']
assert sha(native[:release['native_log']['bytes']]) == release['native_log']['sha256']
for n in ['terminal-tail.log', 'terminal-visible.ansi', 'continue-codex1.md', 'resume-original-session.sh', 'pre-release.json', 'release-state.json']:
    assert (F / n).is_file(), n
assert (F / 'tracked-delta.patch').stat().st_size == 0
tree = Path(release['worktree'])
assert subprocess.check_output(['git', '-C', str(tree), 'rev-parse', 'HEAD'], text=True).strip() == release['head']
assert subprocess.check_output(['git', '-C', str(tree), 'branch', '--show-current'], text=True).strip() == release['branch']
reg = read(R / 'ops/codex-ops/issue-sessions.json')['sessions']['62']
assert reg['state'] == 'waiting-worktree' and reg['engineering_release']['tree_retained'] is True
herdr = {}
for kind, target, expected in [('tab', 'wJ:t1H0', 'tab_not_found'), ('agent', 'wJ:p1J2', 'agent_not_found')]:
    r = subprocess.run(['herdr', kind, 'get', target], env={**os.environ, 'HERDR_ENV': '1'}, capture_output=True)
    out = json.loads(r.stdout or r.stderr)
    assert r.returncode != 0 and out['error']['code'] == expected
    herdr[kind] = dict(target=target, code=expected)
result = dict(at=subprocess.check_output(['date', '-Is'], text=True).strip(), ops_authority=6394018526,
              natural_run='5K2E6HYNAAG1', release_id='V6-R451', knowledge_version=K,
              binding=rows[0], control_sha256=control_sha, actual_play_pid=pid,
              two_run_config_slices_sha_verified=True, accepted_questions=accepted,
              code_metadata_limit='run-config git status ENOBUFS; actual binding.code is verified independently',
              first_question_logged_native_receipt=configs[-1]['brain_native_receipt'],
              native_turn_context_evidence=native_evidence, native_turn_context_independently_verified=all(x['verified'] for x in native_evidence),
              release=dict(original_idle_pids_all_absent=True, native_original_log_prefix_sha_verified=True,
                           worktree_branch_head_retained=True, state='waiting-worktree', herdr=herdr,
                           original_restoration_files_present=True, complete_or_delete=False),
              independent_full_model_game_production_or_release_actions=0,
              specific_new_learning_adoption_or_benefit_claimed=False,
              source_receipts={str(p.relative_to(R)):sha(p.read_bytes()) for p in [O/'runtime-acceptance.json', O/'natural-launch-readback.json', O/'natural-reader-consumption.json', O/'natural-native-context.json', O/'issue62-release.json', F/'pre-release.json', F/'release-state.json']},
              next='Original ops locate or archive the exact original native turn_context bytes; do not replay the natural question or reopen released developer CLI.')
(M / 'natural-runtime-release-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
