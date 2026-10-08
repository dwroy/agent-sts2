"""Complete fix-batch protocol from actual publication/check records; no publication mutations."""
import json
from pathlib import Path
import re

ROOT = Path('/home/dw/Projects/agent-sts2')
WORK = ROOT / '.worktrees/silent-boss-calibration'
SCRATCH = ROOT / 'learner/runs/20261007-075131-silent-boss-calibration'
pub = json.loads((SCRATCH / 'publication.json').read_text())
if not pub.get('release') or pub.get('rolled_back_to'):
    raise RuntimeError('no verified fixed publication to report')
data = json.loads((WORK / 'knowledge/characters/silent/boss-trust.json').read_text())
ledger = (SCRATCH / 'ledger-id.txt').read_text().strip()

def checks(name):
    text = (SCRATCH / (name + '.log')).read_text()
    files = sum(int(v) for v in re.findall(r'Test Files\s+(\d+) passed', text))
    cases = sum(int(v) for v in re.findall(r'Tests\s+(\d+) passed', text))
    exit_code = int((SCRATCH / (name + '.log.exit')).read_text().strip())
    assert exit_code == 0 and files and cases
    return {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases, 'log': str(SCRATCH / (name + '.log'))}

source = checks('source-sandbox')
live = checks('live-after-merge')
result = {
    'task': 'fix-batch', 'nature': 'Roy-authorized new feature', 'base': pub['base'],
    'fixes': [{'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'kind': 'feature',
               'commit': pub['source'], 'test': 'agent/tests/silent-boss-calibration*.test.ts; agent/tools/boss-sim/test_silent_calibration.py; ops/tests/test_silent_calibration_dispatch.py',
               'fails_without_fix': True, 'red': {'failed': 3, 'passed': 2, 'log': str(SCRATCH / 'ts-without-feature.log')},
               'source_checks': source, 'live_checks': live, 'ledger_id': ledger, 'ledger_kind': 'fight', 'ledger_status': 'proposed'}],
    'skipped': [{'item': 'K3676LU8B0UH F48 A1 attempt2', 'reason': 'existing board solver no solve at both t1/pre; actual won retained, two predictions not invented; fit candidates107/success106'},
                {'item': 'A0–4 / A5–9 independent validation', 'reason': 'fixed late validation consists entirely of A10; both earlier bands n=0'},
                {'item': 'all 12 bosses high trust', 'reason': 'validation2–9 per boss, below10; other failed metrics retained; no threshold changes'},
                {'item': 'F49 high trust', 'reason': 'tune2/val1, needs9 more validation attempts; gap and leak also fail'},
                {'item': 'other queue issues, including silent-0213', 'reason': 'outside this authorized feature batch; not modified'}],
    'merged': pub['merge'], 'publication': {'source': pub['source'], 'pre_merge': pub['pre_merge'],
        'refresh_commit': pub['refresh'], 'code_merge': pub['merge'], 'release': pub['release'], 'tree': pub['tree'],
        'version': pub['version'], 'target': str(ROOT / '.worktrees/live'),
        'preserved_knowledge_blobs': len(pub['preserved_knowledge_blobs']), 'overlap': pub['overlap']},
    'all_commits': [v for v in (pub['source'], pub['refresh'], pub['merge'], pub['release']) if v],
    'tests': {**source, 'source': source, 'live': live, 'python_calibration': 12, 'python_dispatch': 8,
        'gitleaks': 0, 'actual_artifact_idempotence': 'same completed artifact; no refitting',
        'full_external': 'pending scheduler; not claimed passed', 'rerun_due_to_timeout': False},
    'extraction': {'finished_silent_runs': 84, 'with_boss': 75, 'usable_runs': 74, 'attempts': 378,
        'actual_outcomes': 160, 'won': 119, 'died': 41, 'SL_censored': 218, 'usable_simulated_fights': 159,
        'cutoff_UTC': data['split']['cutoff_ts'], 'tune_candidates': 107, 'tune_success': 106, 'validation': 53},
    'calibration': {start: {'platt': data['overall'][start]['platt'], 'brier': data['overall'][start]['brier'],
        'A10_validation': data['residuals'][start]['val']['A10'], 'F49_validation': data['stage_metrics'][start]['F49']['val']}
        for start in ('t1', 'pre')},
    'trusted_b2': data['trusted_b2'], 'trusted_b3': data['trusted_b3'], 'bosses': data['bosses'],
    'refresh': {'entry': 'agent/tools/boss-sim/refresh-silent.py', 'dispatch': 'ops/learner_jobs.py:calibration_job',
        'cadence': ':13/:43 and learner completion events; ascension increase or20 new actual-outcome boss attempts',
        'previous': 'live own-character boss-trust; old tune/cutoff/validation records retained; new data validation only'},
    'report': str(WORK / 'paper/materials/silent/boss-sim-calibration.md'),
    'archive': 'experiments/boss-sim/silent/' + data['refresh']['artifact'],
    'model_sha256': data['source']['model_sha256'],
    'pending_ops': ['verify actual publication and append shipped for ' + ledger,
                    'mechanically synchronize main to activate the published scheduler code',
                    'full external tsc/vitest through existing learner-checks event'],
}
(SCRATCH / 'completion.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
handoff = f'''# 运维交接：Roy 已授权新功能 静默 boss 模拟校准

源 {pub['source']}；实际代码合入 {pub['merge']}；固定发布 {pub['release']}；树 {pub['tree']}；唯一版本 {pub['version']}。合前 {pub['pre_merge']}，刷新保存提交 {pub['refresh']}，改动重叠 {pub['overlap']}。全部提交、实际校验及原失败日志见 completion.json / publication.json。

学习账本 {ledger} 只以 fight/proposed 写入，含160场实际结局来源与SL失败房间说明、来源提交。请据实际发布CLI追加shipped并机械同步main，使周期调度代码生效；完整外部检查走既有learner-checks。学习者没有直接写根目录notes/ops或冒标shipped。

源码 tsc0，Vitest {source['files']}文件/{source['cases']}例；合后 tsc0，Vitest {live['files']}文件/{live['cases']}例；Python12/调度8；撤映射和范围红测试3失败2通过，恢复功能的7项TS夹具纳入套件并通过。原夹具、编译、扫描失败日志均保留；gitleaks初报的是corrected-keys.json校验和，已改为明确file/sha256清单，默认规则最终扫描0，无豁免。未超时重跑，完整沙箱外套件未宣称通过。

严格已结束SILENT84局/378尝试；160实际结局119胜41败，218截断不标死亡。原160×2起点，仅A1 K3676LU8B0UH F48 attempt2的两条no solve排除：拟合106/候选107，验证53。46局调参/28局验证，没有同局或SL跨切分；验证全A10，前两段独立验证n0。12个boss场数2–9且完整四指标判断，全低可信；总数量缺口67（仍须过其余指标）。A10两消费者预测74.9%/实际69.8%残差+5.1pp；F49实际3败、调参2/验证1，还差9，预测36.6%/33.8%对0%、打穿3.70/3.528，低信度。A10血量输入93/93有A10记录，49攻击定义中Queen Execution/TestSubject Big Pounce两项由A9估。

报告：paper/materials/silent/boss-sim-calibration.md；全部来源/固定开场/回合/切分/模型和旧报告：experiments/boss-sim/silent/{data['refresh']['artifact']}。模型固定ff571cf0加本批角色隔离/开场输入适配，实际文件指纹{data['source']['model_sha256']}；发布保留后来别批代码/知识，表格不冒称最新模型独立验证。

周期入口 refresh-silent.py --previous <live静默boss-trust>，调度:13/:43和学习完成事件检查，升阶或20新实结局触发；初始发布后激活，固定切点/旧样本，模型变化重新固定来源和全量预测，旧目录留存，新达标按原四指标自动入名单，仍走锁内自测发布。重复真实输入已跳过拟合。其他角色的{len(pub['preserved_knowledge_blobs'])}个知识Git blob原样保留；未改策略阈值、未修其他队列、未运行play/LLM/联网/推送/停局。原live脏notes保留，工作树源码提交后干净。
'''
(SCRATCH / 'handoff-ops.md').write_text(handoff, encoding='utf8')
print(json.dumps({k: result[k] for k in ('task', 'merged', 'publication', 'all_commits', 'tests')}, ensure_ascii=False))
