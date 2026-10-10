"""Record exact publication receipts, or an explicit live blocker; never claim shipped."""
import fcntl
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
TASK = '20261010-221308-silent-boss-calibration'

def git(*args):
    return subprocess.check_output(['git', '-C', str(LIVE), *args], text=True).strip()

def read(name):
    return json.loads((HERE / name).read_text())

def suite(label):
    content = (HERE / (label + '.log')).read_text()
    files = re.findall(r'Test Files\s+(\d+) passed', content)
    cases = re.findall(r'Tests\s+(\d+) passed', content)
    return {'exit': int((HERE / (label + '.exit')).read_text()),
            'files': sum(map(int, files)), 'cases': sum(map(int, cases))}

source = (HERE / 'source-commit.txt').read_text().strip()
assert (HERE / 'source-gitleaks.exit').read_text().strip() == '0'
assert (HERE / 'source-sandbox.exit').read_text().strip() == '0'
assert (HERE / 'python-fixed.exit').read_text().strip() == '0'
assert (HERE / 'dispatch-fixed.exit').read_text().strip() == '0'
ledger = (HERE / 'ledger-id.txt').read_text().strip()
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
state = read('live-release-state.json')
published = bool(state.get('publication') and state.get('sandbox_exit') == 0 and not state.get('rolled_back'))
receipts = []
if published:
    for commit in (source, state['merged'], state['publication'], state['implementation']):
        subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', commit, 'HEAD'], check=True)
    for path in state['paths']:
        assert git('rev-parse', source + ':' + path) == git('rev-parse', state['publication'] + ':' + path), path
    assert git('rev-parse', state['publication'] + '^{tree}') == state['publication_tree']
    commits = [source, state['merged'], state['publication']]
    status_note = f'实际live合入{state["merged"]}，发布{state["publication"]}/{state["version"]}；合后沙箱0，shipped由运维确认。'
else:
    commits = [source]
    status_note = '源码候选已提交且固定自测通过；live尚未合入，阻塞：' + state.get('blocked', state.get('rolled_back', 'publisher failed; original logs retained'))
update = {'id': ledger, 'by': 'learner:fix-batch', 'status': 'proposed',
          'where': {'commits': commits}, 'note': status_note}
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'update'],
                   input=json.dumps(update, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-publication-update.json').write_text(json.dumps(update, ensure_ascii=False) + '\n')
(HERE / 'ledger-publication-update.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
if published:
    stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
    changed = []
    for use in ('b2', 'b3'):
        old, new = set(previous['trusted_' + use]), set(trust['trusted_' + use])
        changed.append(f'{use.upper()}：原可信{sorted(old)}；新可信{sorted(new)}；新增{sorted(new-old)}，退出{sorted(old-new)}。')
    runs = sorted({r['run_id'] for r in read('new-fights.json')})
    notice = (f'\n- {stamp} Codex学习者 / {TASK}：Roy已授权新功能静默boss模拟校准刷新实际上线。'
              f'来源{source}→实际{state["merged"]}→发布{state["publication"]}，固定树{state["publication_tree"]}，'
              f'唯一版本{state["version"]}；账本{ledger}为fight/proposed，shipped待运维确认。\n'
              '  旧规则、新规则：' + ' '.join(changed) + '\n'
              f'  证据/任务：{runs}，24新增实际boss结局；107调参与切点/Platt不动，验证257→281；'
              '固定7e1193cef模型，210输入SHA和4控制起点等价。完整逐boss指标/失败/来源在'
              f'paper/materials/silent/boss-sim-calibration.md及experiments/boss-sim/silent/{trust["refresh"]["artifact"]}/。\n'
              f'  A10残差：B2 {trust["residuals"]["t1"]["val"]["A10"]["gap"]}，B3 {trust["residuals"]["pre"]["val"]["A10"]["gap"]}；'
              '低阶两段各0验证、各缺10；F49独立限制保持，未验证双boss联合通关率。\n'
              '  预期影响：依原四门槛更新首次尝试B2信息范围与B3低信度标记，不宣称胜率收益；'
              '费用/药水/保血/目标/SL阈值与铁甲行为保持。源/合后沙箱0，Python12/调度8例0；完整外部检查交原完成事件调度器。\n'
              f'  回退：持live-merge.lock核当前校准版本，对{state["merged"]}相对第一父提交的boss-trust/report差异反向三方应用，'
              '仅回退两文件，保留实验档案和后续刷新；自测后追加回退记录及唯一版本。\n')
    for name in ('notes/for-roy.md', 'ops/inbox-dev.md'):
        path = PROJECT / name
        with path.open('a+', encoding='utf8') as out:
            fcntl.flock(out, fcntl.LOCK_EX)
            out.seek(0)
            old = out.read()
            assert TASK not in old, 'avoid duplicate notifications'
            out.seek(0, 2)
            out.write(notice)
        assert path.read_text().startswith(old)
        receipts.append({'path': str(path), 'appended': True,
                         'previous_prefix_sha256': hashlib.sha256(old.encode()).hexdigest()})
    (HERE / 'roy-notification.md').write_text(notice)
    (HERE / 'roy-notification-receipts.json').write_text(json.dumps(receipts, ensure_ascii=False, indent=1) + '\n')
source_suite = suite('source-sandbox')
extraction = read('dataset/extraction.json')
skipped = [{'item': 'A0–4、A5–9独立验证', 'reason': '两段各0验证，各缺10；固定切点不移动。'},
           {'item': 'F49联合通关率', 'reason': '只按独立战及实际进场资源验证，联合通关率未验证。'},
           {'item': '当前生产模型后续数值变化全量验证', 'reason': '本批固定上一发布模型；首次当前模型回放130和局部结果保留。'}]
if not published:
    skipped.append({'item': 'live发布、eval版本和shipped', 'reason': status_note})
result = {'task': 'fix-batch', 'character': 'silent', 'base': (HERE / 'base.txt').read_text().strip(),
          'fixes': [{'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'commit': source,
                     'kind': 'authorized-feature-calibration-refresh',
                     'implementation_commit': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
                     'test': '固定沙箱tsc+vitest、Python校准12例、调度8例、固定模型/来源/切分/幂等审计',
                     'fails_without_fix': False, 'actual_merge': state.get('merged') if published else None,
                     'publication': state.get('publication') if published else None,
                     'publication_tree': state.get('publication_tree') if published else None,
                     'version': state.get('version') if published else None, 'ledger': [ledger]}],
          'skipped': skipped, 'merged': state.get('merged') if published else None,
          'tests': {'tsc': 0, 'vitest': source_suite['exit'], 'source': source_suite,
                    'live_merged': suite('live-merged-sandbox') if published else None,
                    'python_calibration_cases': 12, 'dispatch_cases': 8, 'gitleaks': 0,
                    'external': 'pending_scheduler' if published else 'blocked_until_live_merge'},
          'code_proposals': [], 'implementation_domains': [], 'ledger_status': 'proposed',
          'all_commits': {'base_main_merge': (HERE / 'base.txt').read_text().strip(),
                          'reused_implementation': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
                          'source': source, 'saved_live_refresh': state.get('refresh_commit'),
                          'actual_merge': state.get('merged') if published else None,
                          'publication': state.get('publication') if published else None},
          'fixed_publication_tree': state.get('publication_tree') if published else None,
          'source_tree': subprocess.check_output(['git', 'rev-parse', source + '^{tree}'], cwd=ROOT, text=True).strip(),
          'boss_trust_table': trust['bosses'], 'trusted_b2': trust['trusted_b2'], 'trusted_b3': trust['trusted_b3'],
          'a10_residuals': {s: trust['residuals'][s]['val']['A10'] for s in ('t1', 'pre')},
          'f49': {'metrics': trust['stage_metrics'], 'low': trust['stage_low']},
          'extraction': {k: extraction[k] for k in ('finished_runs', 'attempts', 'written', 'exclusions')},
          'split': {k: trust['split'][k] for k in ('tune_n', 'val_n', 'cutoff_ts')},
          'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py',
          'refresh_trigger': '升阶或20次新增实际boss结局；调度每小时:13/:43及学习完成事件',
          'calibration_report': str(ROOT / 'paper/materials/silent/boss-sim-calibration.md'),
          'report': str(HERE / 'report.md'), 'archive': 'experiments/boss-sim/silent/' + trust['refresh']['artifact'],
          'live_receipt': state, 'roy_notifications': receipts}
(HERE / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n')
report = (ROOT / 'paper/materials/silent/boss-sim-calibration.md').read_text()
report += '\n## 最终发布状态\n\n' + status_note + '\n\n'
report += f'源固定沙箱 {source_suite["files"]} 文件、{source_suite["cases"]} 例退出0；Python校准12/调度8例0。\n\n'
report += '```json\n' + json.dumps(state, ensure_ascii=False, indent=1) + '\n```\n'
(HERE / 'report.md').write_text(report)
print(json.dumps({'source': source, 'merged': result['merged'], 'publication': state.get('publication'),
                  'version': state.get('version'), 'ledger': ledger, 'blocked': state.get('blocked')}, ensure_ascii=False))
