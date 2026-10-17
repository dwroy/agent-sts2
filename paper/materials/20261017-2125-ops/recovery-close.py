from pathlib import Path
import copy, fcntl, hashlib, importlib.util, json, subprocess

r = Path.cwd(); live = r / '.worktrees/live'
p = r / 'ops/codex-ops/record-staging/20261017-2125'; pub = r / 'paper/materials/20261017-2125-ops'
load = lambda f: json.loads(f.read_bytes())
sha = lambda raw: hashlib.sha256(raw).hexdigest()
def write(f, value): f.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def git(*args, cwd=r): return subprocess.check_output(['git', '-C', str(cwd), *args], stderr=subprocess.PIPE)
assert not (pub / 'ledger-shipped.json').exists()
reg = load(r / 'paper/materials/20261017-2059-ops/registration.json')
disposition = load(pub / 'bounded-host-disposition.json')
assert reg['release_id'] == 'V5-R388' and disposition['original_full_rc'] == 1 and disposition['selected_host_rc'] == 0
bid = reg['batch']; state = load(r / 'ops/codex-ops/learn.json')['batches'][bid]
assert state['state'] == 'done' and state['rc'] == 0 and state['merged'] == reg['original_publication']
assert state['proposal_audit_errors'] == []
history = {x['tree']: x for x in state['fallback_checks']}
assert history[reg['tree']]['rc'] == history[reg['original_fixed_release_tree']]['rc'] == 1
assert history[reg['tree']]['merged'] == reg['actual_live']
assert sha(Path(history[reg['tree']]['log']).read_bytes()) == disposition['original_full_log_sha256']
consumer_root = r / 'paper/materials/20261017-2015-ops/originals'
consumer = load(consumer_root / 'live-consumer-readback.json')
receipt = load(consumer_root / 'live-consumer-readback-receipt.json')
assert receipt['exit'] == 0 and receipt['head_before'] == receipt['head_after'] == reg['original_publication']
assert consumer['sha256'] == receipt['trust_sha256'] == '74b6060523f67ba620a434e45a6ad29e3945b7248926e313788610fbe82dc2a5'
assert len(consumer['readback']) == 24 and {x['use'] for x in consumer['readback']} == {'b2', 'b3'}
archive = load(r / 'paper/materials/20261017-2015-ops/original-archive-manifest.json')
archive = archive if isinstance(archive, list) else archive['files']
consumer_proofs = []
for name in ['live-consumer-readback.json', 'live-consumer-readback-receipt.json']:
    entry = next(x for x in archive if x['archived'] == str((consumer_root / name).relative_to(r)))
    assert sha((consumer_root / name).read_bytes()) == entry['sha256']
    consumer_proofs.append(entry)
with (r / 'ops/live-merge.lock').open('a') as lock:
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError: raise SystemExit(75)
    assert git('rev-parse', 'HEAD', cwd=live).decode().strip() == reg['actual_live']
    assert git('rev-parse', 'HEAD^{tree}', cwd=live).decode().strip() == reg['tree']
    assert not git('diff', '--name-only', reg['original_publication'], reg['actual_live'], '--', 'agent').strip()
    assert not git('diff', 'HEAD', '--', 'agent', cwd=live).strip()
    for cwd in [r, live]:
        git('merge-base', '--is-ancestor', reg['source'], 'HEAD', cwd=cwd)
        if cwd == live: git('merge-base', '--is-ancestor', reg['actual_behavior_commit'], 'HEAD', cwd=cwd)
        versions = json.loads(git('show', 'HEAD:eval/versions.json', cwd=cwd))
        entry = next(x for x in versions['versions'] if x['name'] == reg['name'])
        assert entry['release_id'] == reg['release_id'] and entry['commit'] == reg['actual_behavior_commit']
        assert next(x for x in versions['release_numbering']['releases'] if x['release_id'] == reg['release_id'])['commit'] == reg['actual_behavior_commit']
        for leaf in reg['leaves']:
            if leaf['path'].startswith('experiments/'):
                assert git('rev-parse', 'HEAD:' + leaf['path'], cwd=cwd).decode().strip() == leaf['source_blob']
            else:
                expected = leaf['main_sha256'] if cwd == r else leaf['live_sha256']
                assert sha(git('show', 'HEAD:' + leaf['path'], cwd=cwd)) == expected
                assert sha((cwd / leaf['path']).read_bytes()) == expected
        assert sha((cwd / 'knowledge/characters/silent/boss-trust.json').read_bytes()) == consumer['sha256']
    at = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
    acceptance = dict(at=at, batch=bid, release_id=reg['release_id'], source=reg['source'], behavior=reg['actual_behavior_commit'],
        actual_live=reg['actual_live'], tree=reg['tree'], main_source_integration=reg['main'], source_main_live_ancestry_verified=True,
        all46_owned_git_leaves_and9_current_files_verified=True, original_canonical_history_preserved=True,
        original_24be_full_rc=1, original_24be_selected_rc=0, final_a63667_full_rc=1, final_a63667_selected_rc=0,
        full_suite_pass=False, bounded_ops_deployment_disposition='accepted with unchanged exact-case supplements; both original complete failures retained',
        original_actual_consumer_exit=0, consumer_readback_count=24, original_consumer_receipts_SHA_verified=consumer_proofs,
        trust_sha256=consumer['sha256'], consumer_and_calibration_not_repeated=True, agent_unchanged_from_original_consumer=True,
        preserved_existing_knowledge_refreshes=reg['refreshed_files'], first_effective_run=None,
        six_target_or_f49_quality_pass=False, current_H0_H1_finite_prefix_calibrated=False, root0332_fixed=False,
        new_model_or_game_action=False, other_role_ACK=False)
    write(pub / 'actual-deployment-acceptance.json', acceptance)
    spec = importlib.util.spec_from_file_location('original_ledger', r / 'learner/ledger.py')
    ledger = importlib.util.module_from_spec(spec); spec.loader.exec_module(ledger)
    saved = copy.deepcopy(ledger.fold(ledger.read_rows())['silent-0506']); assert saved['status'] == 'proposed'
    prefix = (r / 'paper/materials/learning/ledger.jsonl').read_bytes()
    change = dict(id='silent-0506', by='ops:codex', status='shipped', version=reg['name'],
        where=dict(commits=[reg['source'], reg['actual_behavior_commit'], reg['main'], reg['actual_live']],
                   changelog=[str(pub / 'actual-deployment-acceptance.json'), str(pub / 'bounded-host-disposition.json'), str(r / 'paper/materials/20261017-2059-ops/registration.json')]),
        note='V5-R388 limited actual delivery: exact source71ad/main narrow sync, live b235/treea63667, official original eval name, unchanged trust SHA74b606 and original actual24 B2/B3 consumer readbacks0 verified. Host24be full1/one selected0 and finala63667 full1/two original15s-timeout selected0 remain separate; ops accepts bounded deployment disposition, never full0. No repeated source full, calibration, consumer, model or natural play. Fixed published7e1193c model, original107 tune keys/Platt, validation507,26 new actual outcomes only. Six target bosses/F49 remain low, low-asc independent validation missing; no current H0/H1 finite-prefix, F48/F49 joint, root0332 or natural/win benefit acceptance. Shipped means this bounded source/data/consumer delivery only; claim/evidence/prior/effect unchanged.')
    stdin = json.dumps(change, ensure_ascii=False) + '\n'; (p / 'ship-input.jsonl').write_text(stdin)
    cli = subprocess.run(['nice', '-n', '19', 'python3', 'learner/ledger.py', 'update'], input=stdin, capture_output=True, text=True)
    (pub / 'ship-cli.stdout').write_text(cli.stdout); (pub / 'ship-cli.stderr').write_text(cli.stderr); assert cli.returncode == 0
    physical = (r / 'paper/materials/learning/ledger.jsonl').read_bytes(); assert physical.startswith(prefix)
    owned = []; offsets = []; offset = len(prefix)
    for raw in physical[len(prefix):].splitlines(keepends=True):
        row = json.loads(raw)
        if row.get('id') == 'silent-0506' and row.get('by') == 'ops:codex' and row.get('status') == 'shipped' and row.get('version') == reg['name']:
            owned.append(raw); offsets.append(dict(offset=offset, bytes=len(raw), sha256=sha(raw), row=row))
        offset += len(raw)
    assert len(owned) == 1
    after = ledger.fold(ledger.read_rows())['silent-0506']
    assert after['status'] == 'shipped' and after['version'] == reg['name']
    for key in ['character', 'kind', 'claim', 'first_run', 'asc', 'prior', 'prior_note', 'prior_runs', 'evidence', 'effect']:
        assert saved.get(key) == after.get(key), key
    (p / 'own-ledger-rows.jsonl').write_bytes(b''.join(owned))
    write(pub / 'ledger-shipped.json', dict(at=at, id='silent-0506', release_id=reg['release_id'], version=reg['name'], exit_code=0,
        prefix_bytes=len(prefix), prefix_sha256=sha(prefix), own_rows=offsets, claim_evidence_prior_effect_preserved=True,
        bounded_delivery_only=True, full_suite_pass=False, other_role_ACK=False))
    pending_path = r / 'ops/codex-ops/pending-integrations/20261017-170116-fix-batch.json'
    pending = load(pending_path)
    pending.update(status='V5-R388 bounded actual source/data/consumer delivery closed; both full1 and selected0 histories retained',
        host_complete=True, host_rc=1, full_suite_pass=False, host_disposition_accepted=True,
        deployment_acceptance_receipt=str((pub / 'actual-deployment-acceptance.json').relative_to(r)),
        supplement_complete=True, supplement_rc=0, supplement_receipt=str((pub / 'bounded-host-disposition.json').relative_to(r)),
        ledger_shipped=True, ledger_shipped_receipt=str((pub / 'ledger-shipped.json').relative_to(r)),
        next_step='This bounded periodic release delivery is closed. Preserve original full1/selected0, canonical history, six-target/F49 low and H0/H1/0332 unknown. No new tests, model or observer; wider requests remain with original owners.')
    write(pending_path, pending)
check = subprocess.run(['nice', '-n', '19', 'python3', 'learner/ledger.py', 'check'], capture_output=True, text=True)
(pub / 'ledger-check.log').write_text(check.stdout + check.stderr); assert check.returncode == 0
print(json.dumps(dict(release_id=reg['release_id'], ledger='silent-0506', status='shipped', bounded_host_disposition=True, full_suite_pass=False, ledger_check=0)), flush=True)
