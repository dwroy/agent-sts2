"""Verify the immutable release and write the learner completion handoff."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
state = json.loads((HERE / 'live-release-state.json').read_text())
release = state['publication']

def git(*args):
    return subprocess.check_output(['git', *args], cwd=LIVE)

def blob(path, commit=release):
    return git('show', commit + ':' + path)

def tree(commit):
    return {line.split('\t', 1)[1]: line.split('\t', 1)[0]
            for line in git('ls-tree', '-r', commit).decode().splitlines()}

def receipt(name):
    return int((HERE / (name + '.exit')).read_text().strip())

assert state['sandbox_exit'] == 0
assert git('rev-parse', release + '^{tree}').decode().strip() == state['publication_tree']
for commit in (state['source'], state['merged'], state['implementation'], state['refresh_commit']):
    git('merge-base', '--is-ancestor', commit, release)
owned = set(state['paths'])
before, after = tree(state['before_code']), tree(release)
changed = sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p))
metadata = ['eval/versions.json', 'paper/materials/decision-log.md']
assert sorted(set(changed) - owned) == metadata
for path in owned:
    assert blob(path) == blob(path, state['source']), path
for path, digest in state['refresh_before_sha256'].items():
    assert hashlib.sha256(blob(path)).hexdigest() == digest, path

trust = json.loads(blob('knowledge/characters/silent/boss-trust.json'))
artifact = trust['refresh']['artifact']
archive = 'experiments/boss-sim/silent/' + artifact + '/'
manifest = json.loads(blob(archive + 'audit-manifest.json'))
for path, digest in manifest.items():
    assert hashlib.sha256(blob(archive + path)).hexdigest() == digest, path
completed = json.loads(blob(archive + 'completed.json'))
for path, digest in completed['files_sha256'].items():
    assert hashlib.sha256(blob(archive + path)).hexdigest() == digest, path
versions = json.loads(blob('eval/versions.json'))['versions']
entries = [entry for entry in versions if entry['name'] == state['version']]
assert len(entries) == 1 and entries[0]['commit'] == state['merged']
assert state['source'].encode() in blob('paper/materials/decision-log.md')
ledger = json.loads((HERE / 'ledger-final.json').read_text())
assert ledger['status'] == 'proposed' and ledger['kind'] == 'fight'
assert state['source'] in ledger['where']['commits']
for name in ('source-sandbox', 'live-sandbox', 'source-python-fixed', 'source-dispatch-fixed',
             'source-final-gitleaks', 'live-publish', 'live-preflight'):
    assert receipt(name) == 0, name
scan_receipts = list(HERE.glob('live-*-gitleaks.exit'))
assert len(scan_receipts) == 3
assert all(int(path.read_text()) == 0 for path in scan_receipts)
test_counts = {}
for name in ('source-sandbox', 'live-sandbox'):
    text = (HERE / (name + '.log')).read_text()
    counts = {'files': sum(map(int, re.findall(r'Test Files\s+(\d+) passed', text))),
              'cases': sum(map(int, re.findall(r'\bTests\s+(\d+) passed', text)))}
    assert counts == {'files': 251, 'cases': 2627}, counts
    test_counts[name] = counts

check = subprocess.run(['nice', '-n', '19', 'python3', '/home/dw/Projects/agent-sts2/learner/ledger.py', 'check'],
                       text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
(HERE / 'ledger-final-check.log').write_text(check.stdout)
(HERE / 'ledger-final-check.exit').write_text(str(check.returncode) + '\n')
assert check.returncode == 0
audit = {'release': release, 'release_tree': state['publication_tree'],
         'source_and_implementation_ancestors': True, 'task_paths_equal_source': len(owned),
         'only_other_changed_paths': metadata, 'refresh_blobs_preserved': len(state['refresh_paths']),
         'archive_hashes_verified': len(manifest), 'sealed_result_hashes_verified': len(completed['files_sha256']),
         'version_unique': True, 'ledger_status': ledger['status'], 'ledger_check': 0,
         'sandbox': test_counts, 'live_gitleaks_scans_passed': len(scan_receipts),
         'actual_publisher_sha256': hashlib.sha256((HERE / 'publish-live.py').read_bytes()).hexdigest(),
         'archived_original_publisher_sha256': manifest['publish-live.py']}
(HERE / 'release-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')

table = []
for boss, data in sorted(trust['bosses'].items()):
    table.append({'boss': boss, 'n': data['t1']['n'], 'missing': data['t1']['missing'],
                  'B2': 'trusted' if not data['t1']['failed'] else ','.join(data['t1']['failed']),
                  'B3': 'trusted' if not data['pre']['failed'] else ','.join(data['pre']['failed'])})
new = json.loads((HERE / 'new-fights.json').read_text())
f49 = {}
for label, start in [('B2', 't1'), ('B3', 'pre')]:
    metrics = trust['stage_metrics'][start]['F49']['val']
    f49[label] = {'predicted': metrics['mean_pred'], 'actual': metrics['actual_win'],
                 'brier': metrics['brier'], 'leak_ratio': metrics['leak']['enemy_ratio'],
                 'failed': ['brier', 'gap', 'leak'] if label == 'B2' else ['gap', 'leak']}
final = {
 'task': 'fix-batch', 'base': state['base'],
 'fixes': [{'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'commit': state['source'],
            'source_code': state['implementation'],
            'test': ['agent/tools/boss-sim/test_silent_calibration.py',
                     'agent/tests/silent-boss-calibration.test.ts',
                     'agent/tests/silent-boss-calibration-cli.test.ts',
                     'ops/tests/test_silent_calibration_dispatch.py', 'agent/tools/test-sandbox.sh'],
            'fails_without_fix': None,
            'fails_without_fix_note': '复用已上线实现的授权校准刷新；未执行撤源对照，不能声称真红。',
            'ledger_id': state['ledger'], 'ledger_kind': 'fight', 'ledger_status': 'proposed'}],
 'skipped': [{'item': '未达标 boss / F49 准入', 'reason': '样本已满10仍有失败指标，保留低信度，详见boss_table与F49。'},
             {'item': 'A0–4 / A5–9 独立验证', 'reason': '固定时间切分后两段验证均0，不能声称样本外可靠性。'}],
 'merged': state['merged'], 'publication': release, 'publication_tree': state['publication_tree'],
 'tested_tree': state['tested_tree'], 'version': state['version'],
 'commits': {'existing_implementation': state['implementation'], 'source': state['source'],
             'saved_refresh': state['refresh_commit'], 'actual_merge': state['merged'], 'publication': release},
 'tests': {'tsc': 0, 'vitest': 0, 'files': 251, 'cases': 2627,
           'source_sandbox': 0, 'live_sandbox': 0, 'python_fixed': {'exit': 0, 'cases': 12},
           'dispatch_fixed': {'exit': 0, 'cases': 45}, 'gitleaks': 0, 'ledger_check': 0,
           'full_external': '交调度器，尚未执行'},
 'samples': {'finished_silent_runs': 166, 'attempts_including_sl': 760, 'usable': 301,
             'sl_censored_excluded': 458, 'missing_opening_actual_excluded': 1,
             'new_actual_outcomes': 20, 'new_won': 13, 'new_died': 7,
             'fixed_tune_keys': 107, 'successful_tune_each': 106, 'validation_each': 194,
             'cutoff_utc': trust['split']['cutoff_ts'],
             'reuse': '281旧场输入/回合/数值等价且3条历史重放核实；复用562旧结果，完整重放20新场/40结果。'},
 'boss_table': table,
 'A10': {'validation': 194, 'B2_gap_pp': 7.7, 'B3_gap_pp': 8.0,
         'B2_brier': 0.1211, 'B3_brier': 0.1227, 'B2_leak_ratio': 1.255, 'B3_leak_ratio': 1.28,
         'ascension_term_selected': False, 'nearest_A9_damage': 'TEST_SUBJECT BIG_POUNCE',
         'F49': {'actual_events': 13, 'usable': 12, 'validation': 10, 'missing': 0,
                 'trust': 'low', **f49, 'scope': '仅单战；F48→F49联合通关率未验证'}},
 'refresh': {'entry': 'agent/tools/boss-sim/refresh-silent.py',
             'when': '每小时:13/:43及学习完成事件检查；升阶或新增20次实际结局触发；SL截断不计数',
             'fixed_split': True, 'idempotent_skips_verified': True,
             'archive': archive.rstrip('/'), 'old_archive_preserved': True},
 'reports': ['paper/materials/silent/boss-sim-calibration.md', str(HERE / 'report.md')],
 'report': str(HERE / 'report.md'), 'logs': str(HERE),
 'release_audit': str(HERE / 'release-audit.json'),
 'limitations': ['验证只针对封存模型；合入保存的后续知识刷新未冒称同批校准。',
                 '历史A1 K3676LU8B0UH一次开场两个起点模拟失败，保留错误，拟合106/107。',
                 '原始重放130、日志空行检查2、首次发布辅助脚本1的原记录均保留；最终检查与发布0。'],
 'code_proposals': [], 'implementation_domains': []}
for name in ('final.json', 'report.json'):
    (HERE / name).write_text(json.dumps(final, ensure_ascii=False, indent=2) + '\n')

header = f'''Roy 已授权新功能：静默 boss 模拟校准定期刷新已上线 {state['version']}。

任务 20261009-114303-silent-boss-calibration；只处理本功能，未修其他队列。只读取已结束静默局，未运行play、真实LLM或联网，未修改策略阈值。本批复用已上线源码 {state['implementation']}，新增20次实际结局触发，固定切分与调参keys，仅扩验证并发布新准入名单。

发布链：base {state['base']}；数据/来源提交 {state['source']}；live原提交 {state['initial_live']}；8项刷新保存 {state['refresh_commit']}；实际合入 {state['merged']}；测试树 {state['tested_tree']}；发布 {release}；固定发布树 {state['publication_tree']}。发布时间 {state['date']}，先date再追加decision-log并登记唯一eval版本。源/现实现/刷新/合入均已核实为发布祖先；75任务路径和来源提交逐blob相同；除decision-log/eval两记录外，所有非任务路径保持合前值；8项刷新逐hash保留。完整审计 release-audit.json。

账本 silent-0337 为fight/proposed，仅经根目录CLI追加提案及来源提交，337条目检查0问题；未冒标shipped，交运维核实后登记。没有新增出牌/药水/SL/终局规则或结构不一致结论，code_proposals=[]，implementation_domains=[]。

源与合后均按固定数据运行sandbox：tsc0、vitest0、251文件2627例；Python校准固定夹具12例0；调度固定夹具45例0；源最终及live三次提交gitleaks0。原日志均在本scratch。完整外部检查由调度器执行，尚未执行，不冒报通过。

发布辅助脚本首次在任何live改动前因git status前导空格被strip丢失而退出1；原publish-live-v1.py/live-publish-v1.log/.exit保留。仅纠正scratch辅助脚本，成功发布执行的是本目录publish-live.py，原封存目录仍保留最初脚本及其哈希，不回写历史。最初全量重放主动中断130、原始日志空行检查退出2均保留；其后数值等价审计/增量重放/非日志内容检查/源与合后测试通过。没有回滚此次成功发布。

运维交接：固定树/版本/源码和actual merge已提供；请核实后登记shipped并由调度器补完整外部检查。回退如确需执行，应在live锁内仅恢复上一版静默boss-trust.json（从合前 {state['before_code']}），保留刷新与全部新旧实验来源，测试并新增回退版本/记录；不能撤销刷新保存提交。本批未执行回退。

校准来源清单760行、完整残差/逐boss数值/不足与架构边界见下附正式报告（与发布blob相同）；运维原件另见live-release-state.json、release-audit.json、live-sandbox.log/.exit、ledger-final.json、ledger-final-check.log/.exit与final.json。

'''
(HERE / 'report.md').write_text(header + blob('paper/materials/silent/boss-sim-calibration.md').decode())
operation_files = [p for p in HERE.iterdir() if p.is_file() and
                   (p.name.startswith('live-') or p.name.startswith('publish-live')
                    or p.name.startswith('ledger-') or p.name in
                    ('report.md', 'report.json', 'final.json', 'release-audit.json', 'finalize.py', 'preserved-live-tree.txt'))]
(HERE / 'completion-manifest.json').write_text(json.dumps(
    {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(operation_files)}, indent=2) + '\n')
print(json.dumps(audit, ensure_ascii=False))
