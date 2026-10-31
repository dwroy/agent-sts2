from pathlib import Path
import hashlib, json, os, runpy, subprocess, sys

sys.dont_write_bytecode = True
R = Path('/home/dw/Projects/agent-sts2')
M = R / 'paper/materials/20261025-issue36-dialog-integrator'
H = lambda b: hashlib.sha256(b).hexdigest()
assert Path.cwd() == R
assert os.environ.get('CODEX_OPS_ROOT') == str(R)
assert os.environ.get('CODEX_OPS_DIR') == str(R / 'ops/codex-ops')
at = subprocess.check_output(['date', '-Is'], text=True).strip()
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
sys.path.insert(0, str(R / 'ops'))
import issue_session
import issue_session_support
import learner_tui
import learner_tabs
finish = runpy.run_path(str(R / 'ops/codex-ops-learn.py'), run_name='integrator_readonly_preflight')
assert Path(finish['ROOT']) == R and Path(finish['DIR']) == R / 'ops/codex-ops'
inputs_path = R / 'paper/materials/20261025-issue60-fixture-composition-integrator/inputs-before.sha256'
inputs = {line.split('  ', 1)[1]: line.split('  ', 1)[0] for line in inputs_path.read_text().splitlines()}
paths = {R / 'ops/codex-ops-learn.py'}
for module in list(sys.modules.values()):
    p = getattr(module, '__file__', None)
    if p:
        p = Path(p).resolve()
        if p.is_relative_to(R) and p.suffix == '.py':
            paths.add(p)
rows = []
for p in sorted(paths):
    name = str(p.relative_to(R))
    current = H(p.read_bytes())
    committed = subprocess.run(['git', 'show', head + ':' + name], capture_output=True)
    rows.append(dict(path=name, current_sha256=current,
        head_sha256=H(committed.stdout) if committed.returncode == 0 else None,
        full_input_sha256=inputs.get(name),
        exact=current == inputs.get(name) == (H(committed.stdout) if committed.returncode == 0 else None)))
result = dict(at=at, head=head, root=str(R), directory=str(R / 'ops/codex-ops'),
    main_guarded_finish_module_loaded=True,
    entry_modules_imported=['issue_session', 'issue_session_support', 'learner_tui', 'learner_tabs', 'codex-ops-learn'],
    modules=rows, all_imported_project_sources_equal_head_and_full_input=all(x['exact'] for x in rows),
    full_input_list_sha256=H(inputs_path.read_bytes()),
    no_finish_recheck_retirement_or_apply_invoked=True,
    original_native_loaded_code_not_proven=True, live_entry_or_candidate_verified=False,
    new_full_runs=0, applies_authorized=0)
(M / 'main-recovery-deployment-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'modules'}, ensure_ascii=False))
print(json.dumps(dict(project_modules=len(rows), mismatches=[x['path'] for x in rows if not x['exact']]), ensure_ascii=False))
