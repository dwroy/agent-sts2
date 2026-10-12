import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
WORKTREE = OUT.parents[2]
BATCH = '20261012-140741-strategy-proposal'
BASE = '8216599b032714a88944eec2bb6a0319190a07b0'


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def find_batch(value):
    if isinstance(value, dict):
        if BATCH in value:
            return value[BATCH]
        for nested in value.values():
            found = find_batch(nested)
            if found is not None:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = find_batch(nested)
            if found is not None:
                return found
    return None


at = subprocess.check_output(['date', '-Is'], text=True).strip()
request = read(ROOT / 'notes/strategy-research-core-decklists-silent.json')
row = find_batch(read(ROOT / 'ops/codex-ops/learn.json'))
registration = read(ROOT / f'ops/codex-ops/learner/{BATCH}.research-registration.json')
assert request['request_id'] == row['research_request'] == registration['request_id'] == 'roy-20261012-concrete-core-decklists'
assert request['task'] == row['task'] == 'strategy-proposal'
assert request['character'] == row['character'] == registration['character'] == 'silent'
assert request['state'] == row['state'] == 'running' and row['reason'] == 'ops'
assert request['authorized_by'] == 'Roy'
assert request['batch'] == registration['batch'] == BATCH
assert request['worktree'] == row['worktree'] == registration['worktree'] == str(WORKTREE)
assert request['dispatch_base'] == row['research_dispatch_base'] == registration['dispatch_base'] == BASE
assert registration['status'] == 'registered_bound'
assert not any(key in row for key in ['proposal_ids', 'proposal_repair', 'implementation_request'])
for key in ['work_spec', 'input_manifest']:
    path = (ROOT / request[key]).resolve()
    assert path.is_relative_to(ROOT)
    assert sha(path) == request[key + '_sha256']
manifest = read(ROOT / request['input_manifest'])
input_sha = sha(ROOT / request['input_manifest'])
assert input_sha == row['research_input_sha256'] == registration['input_sha256']
assert manifest['request_id'] == request['request_id'] and manifest['character'] == 'silent'
for artifact in manifest['frozen_artifacts']:
    assert sha(ROOT / artifact['path']) == artifact['sha256']
    assert (ROOT / artifact['path']).stat().st_size == artifact['bytes']
assert set(request['dispatch_runs']) == set(row['runs']) == set(manifest['dispatch_runs'])
assert len(request['dispatch_runs']) == len(set(request['dispatch_runs'])) == 9
assert len(row['runs']) == len(set(row['runs'])) == 9
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=WORKTREE, text=True).strip()
assert head == BASE
status = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all'], cwd=WORKTREE, text=True)
assert not status
changed = subprocess.check_output(['git', 'diff', '--name-only', BASE], cwd=WORKTREE, text=True)
assert not changed
assert subprocess.run(['git', 'diff', '--cached', '--quiet', BASE], cwd=WORKTREE).returncode == 0

sections = request['required_sections']
assert sections == manifest['required_sections'] and len(sections) == len(set(sections)) == 7
report = (OUT / 'report.md').read_text()
assert all('## ' + section + '：' in report for section in sections)
assert '<!-- RUN_COVERAGE_TABLE -->' not in report
for link in re.findall(r'\]\(([^)]+)\)', report + (OUT / 'proposal.md').read_text()):
    if '://' not in link:
        path = OUT / link.split('#', 1)[0]
        if path.name != 'final-verification.json':
            assert path.exists(), path
decks = read(OUT / 'candidate-decklists.json')['candidates']
evidence = {r['ref']['id']: r for r in read(OUT / 'evidence-records.json')}
for deck in decks:
    raw_cards = evidence[deck['source']['id']]['row']['state']['run']['deck']
    assert len(raw_cards) == deck['total_cards']
    assert sum(card['count'] for card in deck['cards']) == len(raw_cards)
    for card in deck['cards']:
        assert card['count'] == len(card['original_indices'])
        for index in card['original_indices']:
            assert {k: v for k, v in raw_cards[index].items() if k != 'index'} == card['raw']
    assert len(deck['variants']) == 5
    assert [v['total_cards'] for v in deck['variants']] == [len(raw_cards), len(raw_cards), len(raw_cards)-1, len(raw_cards)+1, len(raw_cards)-1]
    for variant in deck['variants']:
        assert sum(card['count'] for card in variant['cards']) == variant['total_cards']
        assert variant['simulation_result'] is None
coverage = read(OUT / 'run-coverage.json')
covered = [r['run_id'] for r in coverage]
frozen = [r['run_id'] for r in manifest['runs']]
assert len(covered) == len(set(covered)) == len(frozen) == len(set(frozen)) == 28
assert set(covered) == set(frozen)
assert all(r['covered'] and r['conclusion_used'] and (r['raw_refs'] or r['audit_rows']) for r in coverage)
assert set(request['dispatch_runs']) <= set(covered)
bounded = read(OUT / 'bounded-discard-result.json')
assert read(OUT / 'bounded-discard-verification.json')['original_model_endpoint_matches']
assert [v['result']['actions'][0]['block_gained'] if v['result']['actions'] else None for v in bounded['variants']] == [27, 24, None, 27, 21]
assert all(v['result']['complete_combinations'] is None for v in bounded['variants'])
assert not bounded['variants'][2]['result']['complete_line']
receipt = (OUT / 'ledger-link-receipt.log').read_text().strip().split()
payload = read(OUT / 'ledger-link-payload.json')
assert receipt == [item['id'] for item in payload]
after_ledger = []
before = {item['id']: item for item in read(OUT / 'existing-ledger-items.json')}
before['silent-0194'] = read(OUT / 'ledger-0194-before.json')
ledger_audit = read(OUT / 'ledger-concurrent-status-audit.json')
own_updates = {entry['row']['id']: entry for entry in ledger_audit['own_updates']}
assert len(own_updates) == len(payload) == 8
expected_hashes = {entry['sha256'] for entry in own_updates.values()}
found_hashes = set()
with (ROOT / 'paper/materials/learning/ledger.jsonl').open('rb') as ledger_file:
    for line in ledger_file:
        digest = hashlib.sha256(line).hexdigest()
        if digest in expected_hashes:
            found_hashes.add(digest)
assert found_hashes == expected_hashes
for item in payload:
    result = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'show', item['id'], '--json'], capture_output=True, text=True)
    assert result.returncode == 0
    actual = json.loads(result.stdout)
    assert actual['character'] == 'silent'
    assert actual['claim'] == before[item['id']]['claim']
    own = own_updates[item['id']]['row']
    assert all(own[key] == value for key, value in item.items())
    assert own.get('status') in [None, 'proposed']
    if before[item['id']]['status'] == 'shipped':
        assert 'status' not in own
    assert str(OUT / 'report.md') in actual['where']['proposal']
    assert str(OUT / 'proposal.md') in actual['where']['proposal']
    after_ledger.append(dict(id=item['id'], status=actual['status'], linked=True, claim_unchanged=True,
                            own_row_sha256=own_updates[item['id']]['sha256'],
                            own_status_field=own.get('status'),
                            concurrent_status_change=actual['status'] != before[item['id']]['status']))

limitations = [
    '5套组装目标及25个整牌组对照臂未完成精确同状态整场模拟；完整组合、启动分布和改表净收益仍未知。',
    '历史成功样例来自A1/A4/A6/A8，A10绷带样例失败；不外推未观察进阶或稳定连续boss通关。',
    '新增量化只覆盖L704当步下注手牌条件干预，只有原臂有真实后帧；不能当永久增删牌的整战因果效果。',
    '旧自然题面模拟存在缺模型、缺完整轨迹、资源投影及超时；均值SE与模拟区间不是已校准的真实游戏保证。',
    '覆盖为28局限定原证据/冻结审计复用，未重新全历史研究；新候选未入库、未被自然局采用，量化父请求仍未完成。',
]
evidence_runs = [c['run_id'] for c in decks] + ['HNX4A2WBC34W', '49HL2N70CHMU', '54G5683J0E5S',
    'KV0JHNJCKXLS', 'J8PHG72DGD90', 'C7GNN3DDFUFY', 'F6XY4QJMS5RC', 'CMS8QL9E3C5U', 'PUY011SBWSSU']
assert len(evidence_runs) == len(set(evidence_runs)) and set(evidence_runs) <= set(covered)
result = dict(task='strategy-proposal', character='silent', batch=BATCH, request_id=request['request_id'],
              base=BASE, input_sha256=input_sha, work_spec_sha256=request['work_spec_sha256'],
              runs=request['dispatch_runs'], covered_runs=covered, exclusions=[], evidence_runs=evidence_runs,
              research_complete=True, coverage={section: True for section in sections},
              objective_conclusions='交付5套完整历史牌表、5套组装待验替换方案和25个展开对照臂；保留毒防、叠敏、小刀混合及铜钹/绷带两个不等价抽弃分支。复用原配对结果，并核实L704下注当步九弃27挡、条件少一待弃牌24挡；不把局部收益当整套循环、最佳牌数或A10连续boss通关证明。',
              limitations=limitations, fixes=[], skipped=['按纯研究绑定跳过普通队列、源码提交和live上线。', '精确整牌组五臂量化因归属/模型/反事实资源缺口保留未知。'],
              merged=None, tests=dict(tsc=None, vitest=None, cases=None), code_proposals=[], implementation_domains=[],
              proposal_results=[], parent_complete=False, report=str(OUT / 'report.md'))
save('result.json', result)
sources = ['agent/src/sim/core-realization.ts', 'agent/src/reflex/turn-solver.ts', 'agent/src/reflex/combat-plan.ts',
           'agent/tests/core-realization-observations.json', 'learner/tasks/strategy-proposal.md']
source_hashes = {name: sha(WORKTREE / name) for name in sources}
inventory = [dict(path=str(p.relative_to(OUT)), bytes=p.stat().st_size, sha256=sha(p))
             for p in sorted(OUT.iterdir()) if p.is_file() and p.name not in ['final-verification.json', 'artifact-manifest.json', 'final-verification.log']]
save('artifact-manifest.json', dict(artifacts=inventory))
save('final-verification.json', dict(at=at, request_id=request['request_id'], batch=BATCH, base=BASE, head=head,
      input_sha256=input_sha, work_spec_sha256=request['work_spec_sha256'], registered_binding_unchanged=True,
      frozen_artifacts_verified=33, role_inventory_verified=28, required_sections_verified=sections,
      historical_decks_verified=5, assembled_targets=5, full_variants_verified=25,
      native_questions_reused=4, new_model_window='一个真实动作前缀、五个条件手牌臂；非整牌组模拟',
      original_endpoint_verified=True, code_tests_run=False,
      git_status_clean=True, tracked_source_task_validation_knowledge_diff=[], source_hashes=source_hashes,
      ledger_links=after_ledger, parent_complete=False, report_sha256=sha(OUT / 'report.md'),
      proposal_sha256=sha(OUT / 'proposal.md'), result_sha256=sha(OUT / 'result.json'),
      artifact_manifest_sha256=sha(OUT / 'artifact-manifest.json')))
print(json.dumps(dict(validation='通过', base=head, covered_runs=len(covered), decks=5, variants=25,
                      ledger_links=len(after_ledger), report=str(OUT / 'report.md'), source_changes=0), ensure_ascii=False))
