"""Verify actual source, calibration, current live objects and real consumer before delivery."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
PAPER = WORK / 'paper/materials/20261017-human-pace-h0/test-subject-phase-repair'


def load(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(entry):
    return hashlib.sha256(json.dumps(entry, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def counts(path):
    text = path.read_text()
    files = [int(x) for x in re.findall(r'Test Files\s+(\d+) passed', text)]
    tests = [int(x) for x in re.findall(r'\bTests\s+(\d+) passed', text)]
    assert len(files) == len(tests) == 2, (path, files, tests)
    return {'files': sum(files), 'tests': sum(tests), 'log': str(path), 'sha256': sha(path)}


pub = load(HERE / 'publication.json')
assert pub['publication'] and pub['merged'] and not pub.get('error')
for commit in [pub['source'], pub['merged'], pub['receipt_source'], pub['publication']]:
    assert re.fullmatch('[a-f0-9]{40}', commit)
    subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', commit, 'HEAD'], check=True)
tree = subprocess.check_output(['git', '-C', str(LIVE), 'rev-parse', pub['publication'] + '^{tree}'], text=True).strip()
assert tree == pub['fixed_release_tree']
guard = load(HERE / 'current-consumer-guard.json')
ref = guard['consumer_receipt']
assert sha(Path(ref['path'])) == ref['sha256']
receipt = load(Path(ref['path']))
assert receipt['status'] == 'passed' and receipt['kind'] == 'fixed-consumer' and receipt['character'] == 'silent'
assert receipt['request_id'] == 'roy-20261017-human-pace-h0' and receipt['revision'] == 1
for item in receipt['evidence']:
    assert sha(Path(item['path'])) == item['sha256'], item['path']
current = load(LIVE / 'knowledge/characters/silent/experience.json')
assert current['version'] == receipt['experience_version'], 'A new real current-version consumer is required.'
entries = {e['id']: e for e in current['entries']}
refs = {r['id']: r for r in receipt['entries']}
assert len(refs) == 10
for ident, item in refs.items():
    assert canonical(entries[ident]) == item['sha256'], ident
qualification = load(HERE / 'source-qualification.json')
assert qualification['status'] == 'passed' and qualification['exit_code'] == 0 and qualification['sources_unchanged']
assert sha(Path(qualification['log']['path'])) == qualification['log']['sha256']
assert sha(Path(qualification['history_restore']['path'])) == qualification['history_restore']['sha256']
assert load(Path(qualification['history_restore']['path']))['restored']
assert load(OUT / 'test-history-restored-h0-ts-phase.json')['restored']
assert pub['live_sandbox_exit'] == 0
assert load(HERE / 'phase-probe-output.json')['status'] == 'passed'
assert load(HERE / 'adapter-probe-output.json')['status'] == 'passed'
assert load(HERE / 'observed-transition-probe-output.json')['status'] == 'passed'
assert load(HERE / 'negative-exit.json')['exit_code'] != 0
assert load(HERE / 'check-experience.json')['missing'] == []
notice = load(HERE / 'notification.json')
assert notice['status'] == 'appended-and-read-back' and len(notice['evidence']) == 2
for item in notice['evidence']:
    with Path(item['path']).open('rb') as handle:
        handle.seek(item['offset'])
        raw = handle.read(item['bytes'])
    assert hashlib.sha256(raw).hexdigest() == item['sha256']
done = load(HERE / 'calibration-completed.json')
archive = Path(done['archive'])
assert sha(archive / 'completed.json') == done['receipt_sha256']
for name, digest in done['receipt']['files_sha256'].items():
    assert sha(archive / name) == digest, name
metrics = load(archive / 'boss-trust-candidate.json')
comparison = load(archive / 'before-after.json')
assert done['receipt']['new_prediction_rows'] == 62 and done['receipt']['reused_prediction_rows'] == 1114
assert done['receipt']['validation_fit_performed'] is False and done['receipt']['production_trust_replaced'] is False
new_proposal = (HERE / 'proposal-implemented.log').read_text().strip()
assert re.fullmatch('silent-proposal-[0-9a-f]{16}', new_proposal)
boss_ids = ['silent-g1a-test-subject-calibration-boundary', 'silent-g1a-aeonglass-calibration-boundary',
            'silent-g1a-queen-calibration-boundary', 'silent-h0-kaiser-crab-calibration-boundary',
            'silent-h0-knowledge-demon-calibration-boundary', 'silent-h0-insatiable-calibration-boundary']
fixed = 'silent-g1a-fixed-production-boundary'
measurement = 'silent-h0-end-turn-measurement-boundary'
phase = 'silent-test-subject-phase-reset'
paper = 'silent-paper-krane-weak-multihit'
coverage = {
    'h0-target-boss-mechanism-evidence': [refs[i] for i in boss_ids] + [refs[phase]],
    'h0-frozen-inputs-and-residual-diagnosis': [refs[fixed], refs[measurement]],
    'h0-evidence-backed-model-repair': [refs[phase]],
    'h0-fixed-split-recalibration-and-gates': [refs[fixed]] + [refs[i] for i in boss_ids],
    'h0-live-experience-source-consumer': [refs[i] for i in refs],
    'h0-limitations-and-objections': [refs[fixed], refs[measurement], refs[phase]],
}
source_counts = counts(Path(qualification['log']['path']))
live_counts = counts(Path(pub['attempt']) / 'live-sandbox.log')
ledgers = load(HERE / 'delivery-ledger.json')['ids']
boss_table = {}
for boss, starts in comparison.items():
    boss_table[boss] = {}
    for start, row in starts.items():
        m = row['after_phase_repair']
        boss_table[boss][start] = {'independent_n': row['independent_runs'], 'candidate_n': row['candidate_runs'],
                                 'missing_simulations': row['candidate_runs'] - m['n'], 'quantity_deficit': m['missing'],
                                 'brier_before': row['before_v2']['brier'], 'brier_after': m['brier'],
                                 'prediction_gap_before': round(row['before_v2']['mean_pred'] - row['before_v2']['actual_win'], 3),
                                 'prediction_gap': round(m['mean_pred'] - m['actual_win'], 3),
                                 'leak_before': row['before_v2']['leak_ratio'], 'leak_after': m['leak_ratio'],
                                 'failed': m['failed'], 'quality_sample_deficit': 'unknown'}
tests = {'source_sandbox': {'exit': 0, 'includes_tsc': True, 'workers': qualification['workers'], **source_counts},
         'first_source_full': qualification['first_full'],
         'actual_live_sandbox': {'exit': 0, 'includes_tsc': True, 'workers': pub['sandbox_workers'], 'commit': pub['merged'],
                                 'tree': pub['preflight_tree'], **live_counts},
         'negative_regression': {'exit': load(HERE / 'negative-exit.json')['exit_code'],
                                 'expected': 'Old phase retains Enrage and creates false later-Skill Strength.'},
         'phase_probe': {'status': 'passed', 'transitions': 2, 'isolation_groups': 7},
         'adapter_probe': {'status': 'passed', 'B2': True, 'B3': True, 'synthetic_role_variants': 3},
         'actual_transition_probe': {'status': 'passed', 'windows': 2, 'independent_tuning_runs': 1},
         'fixed_calibration': {'tuning_keys': 107, 'validation_keys': 481, 'new_rows': 62, 'reused_rows': 1114,
                               'samples': 200, 'validation_fit': False, 'criteria_changed': False},
         'consumer': {'passed_objects': 10, 'kind': 'fixed-consumer', 'natural_effect': None},
         'external_full': 'Pending original scheduler on this exact new publication tree; no borrowed release checks.'}
questions = load(HERE / 'questions.json')
assert questions[:3] == load(OUT / 'questions.json')
result = {'task': 'strategy-proposal', 'character': 'silent', 'base': '8544db04cfd497fecfa9427c7c1c0c7362077cc3',
          'fixes': [{'item': 'Roy 已授权 H0：静默实验体阶段能力状态修正及原固定切分增量校准',
                     'commit': pub['source'], 'merged_commit': pub['merged'], 'fails_without_fix': True,
                     'test': '真实阶段原帧；旧编译负向失败、新编译两次换相及隔离通过，源与实际live组合tsc+sandbox、10对象固定消费者通过。',
                     'ledger': ledgers}],
          'merged': pub['merged'], 'publication': pub['publication'], 'fixed_release_tree': pub['fixed_release_tree'],
          'experience_version': receipt['experience_version'], 'version': pub['version'], 'release_id': pub.get('release_id'),
          'release_id_status': pub['release_id_status'],
          'commits': {k: pub.get(k) for k in ['source', 'refresh_commit', 'before_code', 'merged', 'receipt_source', 'publication']},
          'tests': tests, 'code_proposals': ['silent-proposal-2d57d88e790a9bf3', new_proposal,
                                            'silent-proposal-7b0badc658e4fb1b'],
          'implementation_domains': ['combat', 'structure'],
          'proposal_results': [{'id': 'silent-proposal-2d57d88e790a9bf3', 'status': 'implemented', 'commit': pub['source'],
                                'reason': '实际live祖先；CLI以附implemented_commit的新内容身份追加，原队列/稿件保留。'},
                               {'id': new_proposal, 'status': 'implemented', 'commit': pub['source']},
                               {'id': 'silent-proposal-7b0badc658e4fb1b', 'status': 'waiting',
                                'reason': '原固定验证已完成；更宽assay/量测时点/组合挡和完整长程资源未隔离，不能冒整项实现。'}],
          'report': str(HERE / 'completion-report.md'), 'calibration_report': str(PAPER / 'report.md'),
          'artifact': done['artifact'], 'model_sha256': done['receipt']['model_sha256'],
          'boss_trust_fixed_only': boss_table, 'trusted_b2_fixed_only': metrics['trusted_b2'],
          'trusted_b3_fixed_only': metrics['trusted_b3'], 'production_trust_replaced': False,
          'A10_validation_residuals': {s: metrics['residuals'][s]['val']['A10'] for s in ['t1', 'pre']},
          'F49_single_fight_fixed_only': {s: {'n': metrics['stage_metrics'][s]['F49']['val']['n'], 'brier': metrics['stage_metrics'][s]['F49']['val']['brier'], 'prediction_gap': round(metrics['stage_metrics'][s]['F49']['val']['mean_pred'] - metrics['stage_metrics'][s]['F49']['val']['actual_win'], 3), 'leak_ratio': metrics['stage_metrics'][s]['F49']['val']['leak']['enemy_ratio'], 'joint_probability': None} for s in ['t1', 'pre']},
          'learning_result': {'request_id': 'roy-20261017-human-pace-h0', 'revision': 1,
                              'input_sha256': '982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54',
                              'outcome': 'complete', 'coverage': coverage, 'consumer_receipt': ref, 'questions': questions},
          'delivery_limits': ['学习者六项经验/源码/固定校准与真实消费者交付完成；正式completed及通知ACK由ops/watcher原链核实。',
                              '四闸结果只适用于冻结full200样本对象，当前生产H1有限前缀及刷新输入不同，未替换生产trust。',
                              '其他五目标未隔离新的可修A10机制；失败质量项/无解/完整Wound资源/F49联合率/自然效果保留未知。',
                              '不关闭silent-0332、H1或human-pace宽父；不冒shipped、正式发布号或其他角色ACK。']}
report = (PAPER / 'report.md').read_text() + '\n## 本阶段实际发布与读回\n\n' + (
    f"源码 `{pub['source']}` → live `{pub['merged']}` → 固定publication `{pub['publication']}` / tree `{pub['fixed_release_tree']}`。"
    f"实际源sandbox {source_counts['files']}文件/{source_counts['tests']}测试、live组合 {live_counts['files']}文件/{live_counts['tests']}测试均通过且含tsc；旧负向实际失败保留。"
    f"经验 `{receipt['experience_version']}`，专题 `{pub['version']}`；10对象真实生产load/render/query读取通过，receipt `{ref['path']}` SHA `{ref['sha256']}`。固定读回不充自然效果。\n\n"
    f"账本 {ledgers} 仅CLI追加来源；原0500/0501 shipped记录未改，新账本shipped与正式release_id/唯一新组合外部检查由ops核。"
    f"implemented新CLI身份 `{new_proposal}` 只在源码实际live祖先后登记。原三异议原文和第四项phase-reset消费缺口已双追加并逐offset读回；没有代写下游ACK。"
    "六项学习者交付已入live并有canonical SHA/消费者证据，固定四闸失败与生产输入差仍保留，不能用完成事件关闭0332/H1/宽父或宣布全部Boss可信。\n")
for name, value in [('completion-report.md', report), ('completion.json', json.dumps(result, ensure_ascii=False, indent=2) + '\n')]:
    path = HERE / name
    assert not path.exists(), path
    path.write_text(value)
print(json.dumps({'outcome': 'complete', 'completion': str(HERE / 'completion.json'),
                  'sha256': sha(HERE / 'completion.json'), 'report': str(HERE / 'completion-report.md')}, ensure_ascii=False))
