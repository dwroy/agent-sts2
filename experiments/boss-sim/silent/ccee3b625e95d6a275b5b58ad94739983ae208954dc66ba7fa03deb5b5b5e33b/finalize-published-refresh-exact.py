"""Seal a periodic refresh with the previously published model and tuning set."""
import ast
import collections
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
S = Path(__file__).resolve().parent
OLD = ROOT / 'experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b'

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def clean(value):
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items() if key not in ('ms', 'elapsedMs')}
    if isinstance(value, list):
        return [clean(item) for item in value]
    return value

previous = json.loads((S / 'previous-boss-trust.json').read_text())
exits = json.loads((S / 'published-thread-exits.json').read_text())
assert len(exits['exits']) == 4 and all(item['code'] == 0 for item in exits['exits'])
for name, expected in previous['source']['input_files'].items():
    path = Path(name) if name.startswith('/') else S / '.published-model' / name
    assert sha(path) == expected, name
for name in ('split.py', 'character_extract.py', 'refresh-silent.py'):
    relative = 'agent/tools/boss-sim/' + name
    assert sha(ROOT / relative) == previous['source']['input_files'][relative], relative
for filename, functions in {'calib.py': ['fit_platt', 'logit', 'sigmoid'],
    'silent_calibration.py': ['fit', 'prediction', 'mapped', 'select_model', 'residuals', 'frozen_split']}.items():
    def definitions(path):
        return {node.name: ast.dump(node, include_attributes=False) for node in ast.parse(path.read_text()).body
                if isinstance(node, ast.FunctionDef)}
    old_functions = definitions(S / '.published-model/agent/tools/boss-sim' / filename)
    current_functions = definitions(ROOT / 'agent/tools/boss-sim' / filename)
    for function in functions:
        assert old_functions[function] == current_functions[function], (filename, function)
fights = rows(S / 'dataset/fights.jsonl')
historical = rows(OLD / 'fights.jsonl')
assert fights[:len(historical)] == historical
assert rows(S / 'dataset/turns.jsonl')[:len(historical)] == rows(OLD / 'turns.jsonl')
plan = json.loads((S / 'published-reuse-plan.json').read_text())
keys = set(json.loads((S / 'published-replay-keys.json').read_text()))
original = {(r['key'], r['start']): r for r in rows(OLD / 'results.jsonl')}
replayed = [r for path in sorted((S / 'published-results').glob('*.jsonl')) for r in rows(path)]
index = {(r['key'], r['start']): r for r in replayed}
assert len(index) == len(replayed) == len(keys) * 2 == 56
assert set(index) == {(key, start) for key in keys for start in ('t1', 'pre')}
checks = []
for key in plan['control_replays']:
    for start in ('t1', 'pre'):
        assert clean(original[key, start]) == clean(index[key, start]), (key, start)
        checks.append({'key': key, 'start': start, 'identical_except_timing': True})
combined = {key: row for key, row in original.items() if key[0] not in keys}
combined.update(index)
assert set(combined) == {(r['key'], start) for r in fights for start in ('t1', 'pre')}
ordered = [combined[r['key'], start] for r in fights for start in ('t1', 'pre')]
out = S / 'published-combined-results-exact'
out.mkdir(exist_ok=True)
assert not list(out.glob('*.jsonl')), 'retain previous results'
result_path = out / 'results-complete.jsonl'
result_path.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in ordered))
audit = {**plan, 'control_comparisons': checks, 'reused_fights': len(historical) - 2,
         'replayed_fights': 28, 'rows': len(ordered), 'historical_results_sha256': sha(OLD / 'results.jsonl'),
         'combined_results_sha256': sha(result_path), 'all_model_inputs_still_identical': True}
save(S / 'published-reuse-audit.json', audit)
opening = json.loads((S / 'published-opening-audit.json').read_text())
positions = {r['key']: r for r in fights}
hp = collections.Counter()
op = collections.Counter()
for row in opening:
    if positions[row['key']]['asc'] == 10:
        for item in row['source']:
            hp[str(item.get('hpAsc'))] += 1
            op[str(item.get('openingAsc'))] += 1
definitions = json.loads((S / 'published-model-input-audit.json').read_text())
damage = collections.Counter()
missing = []
estimated = []
for item in definitions:
    if item['asc'] == 10:
        for monster in item['monsters']:
            for move in monster['moves']:
                d = move['damage']
                if d is None:
                    missing.append(monster['id'] + ':' + move['move'])
                else:
                    damage[str(d.get('from'))] += 1
                    if d.get('estimated') or d.get('from') != 10:
                        estimated.append({'monster': monster['id'], 'move': move['move'], 'damage': d})
scope = {'openings': len(opening), 'A10_hp_asc_sources': dict(hp),
         'A10_opening_asc_sources': dict(op), 'A10_damage_asc_sources': dict(damage),
         'A10_no_damage_records': missing,
         'A10_estimated_damage_definitions': estimated,
         'F49_actual_attempts': sum(r['floor'] == 49 for r in fights),
         'limit': 'Pinned published monster-db; missing damage definitions do not invent attacks. F49 is a separate actual-outcome fight, not joint F48/F49 clearance.'}
save(S / 'published-input-scope.json', scope)
provenance = {key: previous['source'][key] for key in ('simulator_base', 'model_sha256', 'input_files', 'samples', 'seed')}
provenance.update({'boss_input_scope': scope, 'result_reuse': audit,
    'compiled_replay_sha256': sha(S / 'published-compiled/backtest.mjs'),
    'compiled_metafile_sha256': sha(S / 'published-compiled/metafile.json'),
    'replay_driver_sha256': sha(S / 'run-published-threads.mjs'),
    'sealing_driver_sha256': sha(Path(__file__)),
    'admission_evaluation': {'version': 'unrounded-original-thresholds', 'files': {name: sha(ROOT / 'agent/tools/boss-sim' / name) for name in ('calib.py', 'trust.py', 'silent_calibration.py')}},
    'runtime_source_audit_sha256': sha(S / 'runtime-source-audit.json'),
    'scope': 'Periodic validation extension of exactly the published model; current production model/H0/H1 finite prefixes are not revalidated. Interrupted current-source replays and exploratory tuning are excluded.'})
save(S / 'published-provenance.json', provenance)
command = [sys.executable, str(ROOT / 'agent/tools/boss-sim/refresh-silent.py'), '--scratch', str(S / 'published-sealed-exact'),
    '--logs', '/home/dw/Projects/agent-sts2/logs', '--db', '/home/dw/Projects/agent-sts2/data/logdb',
    '--game-data', str(S / 'frozen-game-data.json'), '--previous', str(S / 'previous-boss-trust.json'),
    '--dataset', str(S / 'dataset'), '--results', str(out / 'results-*.jsonl'),
    '--provenance', str(S / 'published-provenance.json'),
    '--out', str(ROOT / 'knowledge/characters/silent/boss-trust.json'),
    '--report', str(ROOT / 'paper/materials/silent/boss-sim-calibration.md')]
save(S / 'published-seal-command-exact.json', command)
with (S / 'published-seal-exact.log').open('w') as log:
    rc = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT).returncode
assert rc == 0, 'see published-seal.log'
data = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
assert data['split']['tune'] == previous['split']['tune']
assert data['split']['cutoff_ts'] == previous['split']['cutoff_ts']
assert data['split']['tune_n'] == 107 and data['split']['val_n'] == 507
assert data['refresh']['new_completed_boss_attempts'] == 26
assert data['criteria'] == previous['criteria']
for start in ('t1', 'pre'):
    assert data['overall'][start]['platt'] == previous['overall'][start]['platt']
    assert data['selection'][start] == previous['selection'][start]
def contract(value):
    return {'character': value['character'], 'platt': {start: value['overall'][start]['platt'] for start in ('t1', 'pre')},
        **{key: value[key] for key in ('low_trust_b2', 'low_confidence_b3', 'ascension_low', 'stage_low')},
        'completed_max_asc': value['source'].get('completed_max_asc')}
change = {'changed': contract(data) != contract(previous), 'before': contract(previous), 'after': contract(data)}
save(S / 'published-consumer-change.json', change)
identity = data['refresh']['artifact']
archive = S / 'published-sealed-exact' / identity
report_path = archive / 'report.md'
report = report_path.read_text().replace('这个数量不足单独验证第二场 boss 的可靠性，仍只评估',
    '单战必须同时满足场数与质量指标；这里只评估').replace('下一次定期重跑固定当时的模型。',
    '本次定期重跑继续固定已发布模型；换模型须另立实验，不复用本次验证结论。')
report += '\n\n## 本批复用与运行版本审计\n\n'
report += ('沿用已发布模型、107调参keys与切点，588场历史开场/回合逐值一致；复用586场，另重放2场控制及26场新增验证，各起点200样本，完整输入行号种子不变。4条控制结果除耗时外逐值一致。Platt和进阶项选择与旧发布完全相同，未用新增验证样本调参。原误启的当前源码重放、提前拟合及memo试验只保存在scratch，不进入本次校准。\n\n'
           '新增26场的run.code原值均current；按已结束SILENT局号补读启动HEAD、dirty、重启配置，保留原code，不把dirty启动HEAD当作整战已复原源码。完整offset/bytes/SHA在runtime-source-audit.json。\n\n'
           '| 局号 | 新增样本局 | 配置行数 | 启动HEAD | dirty行数 |\n|---|---|---|---|---|\n')
runtime = json.loads((S / 'runtime-source-audit.json').read_text())
for item in runtime['summary']:
    report += f"| {item['run_id']} | {'是' if item['new_run'] else '否'} | {item['config_rows']} | {','.join(item['startup_heads']) or '未知'} | {item['dirty_rows']} |\n"
report += '\n准入精度审计：THE_INSATIABLE/B2未取整Brier=0.14639716573405037，高于整体0.11707407977085513×1.25=0.14634259971356892；保留低信度，不因显示取整提升可信。原四个门槛不变，Ironclad默认统计/准入保持逐值等价；拟合、选择及模拟物理不变。全部boss数量门槛均已达到（数量还差0），质量失败不能承诺再补固定场数即可达标；A0–4和A5–9独立验证均0，各距10场还差10。\n'
report += '\n本批统计量只描述列明固定模型和实际结局尝试。未验证当前H0模型/有限前缀，不关闭H0、0332或其他学习父要求；未观察自然对局消费及胜率改善。\n'
report_path.write_text(report)
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
extra = ['published-reuse-plan.json', 'published-reuse-audit.json', 'published-input-integrity.json',
    'published-input-scope.json', 'published-opening-audit.json', 'published-model-input-audit.json',
    'published-corrected-opening-keys.json', 'published-thread-start.json', 'published-thread-exits.json',
    'restore-published-model.py', 'compile-published-replay.mjs', 'run-published-threads.mjs',
    'finalize-published-refresh-exact.py', 'precision-admission.patch', 'runtime-source-audit.json', 'audit-runtime-sources.py',
    'dataset-delta.json', 'frozen-game-data.json', 'dependency-inputs.json', 'previous-boss-trust.json',
    'previous-report.md', 'published-consumer-change.json']
for name in extra:
    shutil.copyfile(S / name, archive / name)
for name, target in [('published-compiled/backtest.mjs', 'compiled-backtest.mjs'),
    ('published-compiled/metafile.json', 'compiled-metafile.json'), ('published-compiled/compiler.json', 'compiler.json')]:
    shutil.copyfile(S / name, archive / target)
complete = json.loads((archive / 'completed.json').read_text())
complete['report_sha256'] = sha(report_path)
complete['files_sha256'] = {p.name: sha(p) for p in archive.iterdir() if p.is_file() and p.name != 'completed.json'}
save(archive / 'completed.json', complete)
destination = ROOT / 'experiments/boss-sim/silent' / identity
assert not destination.exists(), 'never overwrite old artifacts'
shutil.copytree(archive, destination)
save(S / 'published-artifact-result.json', {'artifact': identity, 'archive': str(destination),
    'consumer_changed': change['changed'], 'trust_sha256': sha(ROOT / 'knowledge/characters/silent/boss-trust.json'),
    **{key: data[key] for key in ('trusted_b2', 'trusted_b3', 'overall', 'residuals', 'bosses', 'stage_metrics', 'stage_low')}})
print(json.dumps({'artifact': identity, 'consumer_changed': change['changed'], 'trusted_b2': data['trusted_b2'], 'trusted_b3': data['trusted_b3']}))
