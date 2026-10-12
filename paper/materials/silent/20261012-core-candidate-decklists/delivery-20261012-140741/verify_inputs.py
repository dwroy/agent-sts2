import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
WORKTREE = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
BATCH = '20261012-140741-strategy-proposal'
request = json.loads((ROOT / 'notes/strategy-research-core-decklists-silent.json').read_text())
manifest_path = ROOT / request['input_manifest']
manifest = json.loads(manifest_path.read_text())
ids = [row['run_id'] for row in manifest['runs']]
assert len(ids) == len(set(ids)) == manifest['run_count'] == 28
assert set(request['dispatch_runs']) <= set(ids)
assert request['required_sections'] == manifest['required_sections']
assert len(set(manifest['required_sections'])) == len(manifest['required_sections'])
assert request['batch'] == BATCH and request['state'] == 'running'
assert request['worktree'] == str(WORKTREE)
receipts = []
for artifact in manifest['frozen_artifacts']:
    path = (ROOT / artifact['path']).resolve()
    assert path.is_relative_to(ROOT)
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    assert digest == artifact['sha256'], artifact['path']
    assert len(data) == artifact['bytes']
    receipts.append(dict(path=artifact['path'], bytes=len(data), sha256=digest, verified=True))
runs = []
for row in manifest['runs']:
    source = row['inventory_source']
    with (ROOT / source['path']).open('rb') as handle:
        handle.seek(source['offset'])
        data = handle.read(source['bytes'])
    assert hashlib.sha256(data).hexdigest() == source['sha256']
    original = json.loads(data)
    assert original['character'].lower() == 'silent' and original['run_id'] == row['run_id']
    assert original['ascension'] == row['ascension']
    runs.append(dict(run_id=row['run_id'], ascension=row['ascension'], inventory_verified=True,
                     inventory_source=source))
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=WORKTREE, text=True).strip()
assert head == request['dispatch_base']
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=WORKTREE, text=True)
receipt = dict(base=head, request_id=request['request_id'],
               input_sha256=hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
               work_spec_sha256=request['work_spec_sha256'], artifacts=receipts, runs=runs,
               initial_validation_notes=[
                   '首次校验脚本误将runs对象列表视作字符串列表，TypeError后按run_id核对。',
                   '第二次严格大小写断言遇到原始角色SILENT，改用规范化silent核对；28局SHA和角色均匹配。',
                   '没有输入身份或SHA失配。'])
(OUT / 'input-verification.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
(OUT / 'request-snapshot.json').write_text(json.dumps(request, ensure_ascii=False, indent=2) + '\n')
print('VERIFIED', len(receipts), 'artifacts', len(runs), 'silent runs', head)
