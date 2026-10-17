from pathlib import Path
import fcntl, hashlib, json, os, re, subprocess

r = Path.cwd(); live = r / '.worktrees/live'
exec((r / 'ops/codex-ops/record-staging/20261016-2003/publish.py').read_text().split('phase=r/')[0])
p = r / 'ops/codex-ops/record-staging/20261017-2059'
pub = r / 'paper/materials/20261017-2059-ops'
load = lambda f: json.loads(f.read_bytes())
def write(f, value): f.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def builder_active(): return subprocess.run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], capture_output=True).returncode != 1
pending_path = r / 'ops/codex-ops/pending-integrations/20261017-170116-fix-batch.json'
pending = load(pending_path)
source = pending['source']; base = pending['source_parent']; behavior = pending['actual_behavior_commit']
paths = pending['expanded_source_leaves']
artifact_root = next(x for x in pending['code_and_artifact_paths'] if x.startswith('experiments/'))
code_paths = [x for x in paths if not x.startswith(artifact_root + '/')]
assert len(code_paths) == 9 and len(paths) == 46
assert load(pub / 'supplement-disposition.json')['selected_host_rc'] == 0
assert not (pub / 'registration.json').exists()
patch = git('diff', '--binary', base, source, '--', *code_paths)
(p / 'nine-source.patch').write_bytes(patch)
with (r / 'ops/live-merge.lock').open('a') as lock:
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError: raise SystemExit(75)
    assert not builder_active(), 'Knowledge builder active; retain the original pending delivery'
    heads = {str(cwd): git('rev-parse', 'HEAD', cwd=cwd).decode().strip() for cwd in [r, live]}
    for ref in [source, behavior, pending['original_publication']]:
        git('merge-base', '--is-ancestor', ref, heads[str(live)])
    snapshots = {}; index_raw = {}; refs = {}; versions = {}; old_physical = {}
    for cwd in [r, live]:
        key = str(cwd); assert not git('ls-files', '-u', cwd=cwd).strip()
        snapshots[key] = git('ls-files', '--stage', '-z', cwd=cwd)
        idx = Path(git('rev-parse', '--git-path', 'index', cwd=cwd).decode().strip()); idx = idx if idx.is_absolute() else cwd / idx
        index_raw[key] = idx.read_bytes(); refs[key] = git('symbolic-ref', 'HEAD', cwd=cwd).decode().strip()
        versions[key] = blob('HEAD', 'eval/versions.json', cwd)
        assert blob('', 'eval/versions.json', cwd) == versions[key] == (cwd / 'eval/versions.json').read_bytes()
    for path in paths:
        assert blob('', path, r) == blob('HEAD', path, r), path
        physical = (r / path).read_bytes() if (r / path).exists() else None
        assert physical == blob('HEAD', path, r), path
        old_physical[path] = physical
        deployed = blob(heads[str(live)], path, live)
        assert (live / path).read_bytes() == deployed, path
    main_env = {**os.environ, 'GIT_INDEX_FILE': str(p / 'main.index')}
    git('read-tree', heads[str(r)], env=main_env)
    applied = subprocess.run(['git', 'apply', '--cached', '--3way', '--whitespace=nowarn', '-'], input=patch, env=main_env, capture_output=True)
    (pub / 'main-apply.log').write_bytes(applied.stdout + applied.stderr)
    assert applied.returncode == 0 and not git('ls-files', '-u', env=main_env).strip()
    composed_tree = git('write-tree', env=main_env).decode().strip()
    main_values = {}; leaves = []
    for path in paths:
        desired = blob(source, path)
        composed = blob(composed_tree, path) if path in code_paths else desired
        deployed = blob(heads[str(live)], path, live)
        attribution_only = path == 'docs/boss-sim.md' and composed.replace(b'Dai', b'Roy') == deployed.replace(b'Dai', b'Roy')
        assert composed == deployed or attribution_only, path
        assert composed == desired or (path == 'docs/boss-sim.md' and composed.replace(b'Dai', b'Roy') == desired.replace(b'Dai', b'Roy')), path
        main_values[path] = composed
        leaves.append(dict(path=path, source_blob=git('rev-parse', source + ':' + path).decode().strip(), source_sha256=sha(desired), main_sha256=sha(composed), live_sha256=sha(deployed), historical_attribution_only=composed != deployed))
    assert sha(main_values['knowledge/characters/silent/boss-trust.json']) == '74b6060523f67ba620a434e45a6ad29e3945b7248926e313788610fbe82dc2a5'
    refresh = {path: (live / path).read_bytes() for path in git('diff', '--name-only', 'HEAD', '--', 'knowledge', cwd=live).decode().splitlines()}
    assert not set(refresh) & set(paths), 'Owned live calibration changed; require original-owner disposition'
    for raw in refresh.values(): json.loads(raw)
    datasets = {key: json.loads(raw) for key, raw in versions.items()}
    releases = datasets[str(live)]['release_numbering']['releases']
    assert releases == datasets[str(r)]['release_numbering']['releases']
    nums = [int(re.fullmatch(r'V\d+-R(\d+)', x['release_id'])[1]) for x in releases]
    assert nums == list(range(max(nums) + 1)) and releases[-1]['release_id'] == 'V5-R387'
    rid = f'V5-R{max(nums) + 1:03d}'; name = pending['original_version_name']
    originals = [x for x in datasets[str(live)]['versions'] if x['name'] == name]
    assert len(originals) == 1 and originals[0]['commit'] == behavior and 'release_id' not in originals[0]
    original_entry = json.loads(json.dumps(originals[0]))
    registered = dict(original_entry, release_id=rid, release_status='registered-primary-ops')
    for key, dataset in datasets.items():
        old_entries = json.loads(json.dumps(dataset['versions'])); old_releases = json.loads(json.dumps(dataset['release_numbering']['releases']))
        matches = [i for i, x in enumerate(dataset['versions']) if x['name'] == name]
        if matches:
            assert len(matches) == 1 and dataset['versions'][matches[0]] == original_entry
            dataset['versions'][matches[0]] = registered
        else: dataset['versions'].append(registered)
        dataset['release_numbering']['releases'].append(dict(release_id=rid, commit=behavior, aliases=[name]))
        assert dataset['release_numbering']['releases'][:-1] == old_releases
        assert [x for x in dataset['versions'] if x['name'] != name] == [x for x in old_entries if x['name'] != name]
    version_values = {key: (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode() for key, value in datasets.items()}
    main_values['eval/versions.json'] = version_values[str(r)]
    scan = p / 'composition-scan'
    for lane, values in [('main', main_values), ('preserved-live-knowledge', refresh), ('live-version', {'eval/versions.json': version_values[str(live)]})]:
        for path, raw in values.items():
            target = scan / lane / path; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(raw)
    command = ['nice', '-n', '19', 'gitleaks', 'dir', str(scan), '--redact', '--no-banner', '--report-format', 'json']
    with (pub / 'composition-gitleaks-original.log').open('wb') as out:
        result = subprocess.run(command + ['--report-path', str(p / 'composition-gitleaks-original.json')], stdout=out, stderr=subprocess.STDOUT, env={**os.environ, 'GOMAXPROCS': '1'})
    findings = load(p / 'composition-gitleaks-original.json')
    assert result.returncode in [0, 1]
    if findings:
        assert result.returncode == 1 and len(findings) == 1
        finding = findings[0]
        assert finding['RuleID'] == 'generic-api-key' and finding['StartLine'] == 20
        assert Path(finding['File']).as_posix().endswith('/main/' + artifact_root + '/completed.json')
        completed = json.loads(main_values[artifact_root + '/completed.json'])
        checksum = completed['files_sha256']['published-corrected-opening-keys.json']
        assert checksum == sha(main_values[artifact_root + '/published-corrected-opening-keys.json'])
        assert checksum.encode() in main_values[artifact_root + '/completed.json'].splitlines()[19]
        ignore = p / 'exact-archive-fingerprint'; ignore.write_text(finding['Fingerprint'] + '\n')
        with (pub / 'composition-gitleaks-qualified.log').open('wb') as out:
            qualified = subprocess.run(command + ['--report-path', str(p / 'composition-gitleaks-qualified.json'), '--gitleaks-ignore-path', str(ignore)], stdout=out, stderr=subprocess.STDOUT, env={**os.environ, 'GOMAXPROCS': '1'})
        assert qualified.returncode == 0 and load(p / 'composition-gitleaks-qualified.json') == []
    write(pub / 'composition-secret-scan.json', dict(original_rc=result.returncode, original_findings=len(findings), qualified_rc=0, exact_known_archive_sha256_verified=bool(findings), global_rules_changed=False, original_redacted_report_sha256=sha((p / 'composition-gitleaks-original.json').read_bytes())))
    at = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip(); print(at, flush=True)
    live_env = {**os.environ, 'GIT_INDEX_FILE': str(p / 'live.index')}; git('read-tree', heads[str(live)], env=live_env, cwd=live)
    for path, raw in refresh.items(): stage(path, raw, live_env, live)
    fresh_tree = git('write-tree', env=live_env, cwd=live).decode().strip()
    fresh = commit(fresh_tree, [heads[str(live)]], 'Preserve live knowledge before original calibration release registration', live) if refresh else heads[str(live)]
    stage('eval/versions.json', version_values[str(live)], live_env, live)
    live_tree = git('write-tree', env=live_env, cwd=live).decode().strip()
    new_live = commit(live_tree, [fresh], 'Register already-live Silent calibration as ' + rid, live)
    for path, raw in main_values.items(): stage(path, raw, main_env, r)
    main_tree = git('write-tree', env=main_env).decode().strip()
    new_main = commit(main_tree, [heads[str(r)], source], 'Narrowly integrate original Silent calibration and register ' + rid, r)
    assert set(git('diff', '--name-only', fresh, new_live).decode().splitlines()) == {'eval/versions.json'}
    assert set(git('diff', '--name-only', heads[str(r)], new_main).decode().splitlines()) <= set(paths) | {'eval/versions.json'}
    normal = []
    for cwd, values in [(r, main_values), (live, {**refresh, 'eval/versions.json': version_values[str(live)]})]:
        target = p / ('main-preserved.index' if cwd == r else 'live-preserved.index'); target.write_bytes(index_raw[str(cwd)])
        env = {**os.environ, 'GIT_INDEX_FILE': str(target)}
        for path, raw in values.items(): stage(path, raw, env, cwd)
        normal.append((cwd, env))
    record = dict(at=at, batch=pending['batch'], task=pending['task'], source=source, source_parent=base, actual_behavior_commit=behavior, old_main=heads[str(r)], main=new_main, old_live=heads[str(live)], actual_live=new_live, tree=live_tree, release_id=rid, name=name, late_registration_of_already_live_behavior=True, original_publication=pending['original_publication'], original_fixed_release_tree=pending['fixed_release_tree'], original_entry_preserved=original_entry, leaves=leaves, refreshed_files=[dict(path=k, sha256=sha(v)) for k, v in refresh.items()], knowledge_refresh_commit=fresh, composition_gitleaks_qualified_rc=0, no_new_live_production_code=True, all_other_release_history_preserved=True, original_host_full_rc=1, original_selected_host_rc=0, host='pending one same-batch final-tree host full', source_full_or_calibration_or_consumer_repeated=False, current_game_restarted=False, six_targets_trusted=False, f49_trusted=False, root0332_fixed=False, first_effective_run=None, other_role_ACK=False)
    write(p / 'intended-registration.json', record)
    locks = locks_for(normal)
    try:
        assert not builder_active()
        for cwd in [r, live]:
            assert git('rev-parse', 'HEAD', cwd=cwd).decode().strip() == heads[str(cwd)]
            assert git('ls-files', '--stage', '-z', cwd=cwd) == snapshots[str(cwd)]
            assert (cwd / 'eval/versions.json').read_bytes() == versions[str(cwd)]
        for path, raw in old_physical.items(): assert ((r / path).read_bytes() if (r / path).exists() else None) == raw
        for path, raw in refresh.items(): assert (live / path).read_bytes() == raw
        for path in paths: assert (live / path).read_bytes() == blob(heads[str(live)], path, live)
        changes = 'start\n' + ''.join('update ' + refs[str(cwd)] + ' ' + value + ' ' + heads[str(cwd)] + '\n' for cwd, value in [(r, new_main), (live, new_live)]) + 'prepare\ncommit\n'
        git('update-ref', '-m', 'ops: narrow original calibration source and official numbering', '--stdin', data=changes.encode())
        for path, raw in main_values.items(): install(r, path, raw)
        install(live, 'eval/versions.json', version_values[str(live)])
        for index, lock_path in locks: os.replace(lock_path, index)
    finally:
        for _, lock_path in locks:
            if lock_path.exists(): lock_path.unlink()
    for cwd in [r, live]: git('merge-base', '--is-ancestor', source, 'HEAD', cwd=cwd)
    write(pub / 'registration.json', record)
    pending.update(status='Original source narrowly synced and already-live calibration numbered; final-tree host pending', official_numbering_complete=True, release_id=rid, main=new_main, actual_live=new_live, tree=live_tree, registration_receipt=str((pub / 'registration.json').relative_to(r)), source_sync_complete=True, supplement_complete=True, supplement_rc=0, supplement_receipt=str((pub / 'supplement-disposition.json').relative_to(r)), original_host_rc=1, original_host_tree=pending['fixed_release_tree'], host_started=False, host_complete=False, host_rc=None, ledger_shipped=False, next_step='Verify and start exactly one original170116 final-tree host via learner-recheck. Preserve original24be full1 and selected0; ledger0506 remains proposed until final-tree deployment/host disposition closure.')
    write(pending_path, pending)
    print(json.dumps(dict(main=new_main, live=new_live, tree=live_tree, release_id=rid, source_sync_complete=True)), flush=True)
