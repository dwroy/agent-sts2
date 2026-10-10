"""Preserve this validation candidate and register evidence through the ledger CLI."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')

def read(name):
    return json.loads((HERE / name).read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
artifact = trust['refresh']['artifact']
generated = HERE / artifact
archive = ROOT / 'experiments/boss-sim/silent' / artifact
assert not archive.exists(), 'Never overwrite an older artifact'
added = read('new-since-live.json')
new = read('new-fights.json')
extraction = read('dataset/extraction.json')
report = (generated / 'report.md').read_text().replace('没有实际结局的房间', '没有可用实际结局开场的房间')
sources = [json.loads(line) for line in (HERE / 'dataset/sources.jsonl').read_text().splitlines()]
f49 = [r for r in sources if r.get('floor') == 49]
actual_f49 = sum(r.get('outcome') in ('won', 'died') for r in f49)
usable_f49 = sum(not r.get('excluded') for r in f49)
sentence = (f'F49 实际结局 {usable_f49} 场；这个数量不足单独验证第二场 boss 的可靠性，'
            '仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。')
assert sentence in report
report = report.replace(sentence, f'F49 实际结局 {actual_f49} 次、可用开场 {usable_f49} 场；'
                        '数量缺口与失败指标分别报告。每场按实际进场资源评估，未验证 F48→F49 联合通关率。')
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
reuse = trust['source']['result_reuse']
report += f'''
## 本批固定模型验证刷新（{HERE.name}）

相对实际 live 新增 {len(added)} 次有实际结局的 boss 尝试，达到20次阈值，最高已结束进阶仍A10。
{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用；调参107 keys、UTC切点
{trust['split']['cutoff_ts']}与Platt逐项保持，验证{previous['split']['val_n']}→{trust['split']['val_n']}，
成功验证{b2['n']}场。三场各两起点的旧no-solve缺预测继续保留，不伪造输出或实胜败。

本次先用同一character_extract.py冻结日志，再向指定refresh-silent.py入口提供--dataset、--results、--provenance，
确保仍验证已发布的固定模型{trust['source']['simulator_base']}，不把当前生产模型混进该实验。
210项模型输入SHA全部核实。缓存{reuse['cache_artifact']}的{reuse['historical_fights']}个开场与回合逐项一致，
复用{reuse['reused_fights']}场、重放2控制场及{len(new)}新场，四个控制起点除耗时外输出完全相同。seed=1、每起点200样本、原始全数据行号保持。
已核同内容重跑跳过、更新previous后阈值跳过，均不启动模拟子进程且输出字节不变。

新增缓存外证据：{new[0]['run_id']} A{new[0]['asc']} F{new[0]['floor']} {new[0]['encounter']}，
第{new[0]['attempt']}试，T1–{new[0]['turns']}，实际{new[0]['outcome']}，进场{new[0]['entry_hp']}血、结算{new[0]['end_hp']}血。
相对live的全部{len(added)}场证据在new-since-live.json，来源原始offset/len/SHA见sources.jsonl及opening-source-integrity.json。
已核964个开场的严格SILENT/进阶和原始字节SHA；另2条缺开场保留排除原因。392个房间的初试/SL分母见提取表。

B2/B3校准Brier为{b2['brier']}/{b3['brier']}，可信各{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}项。
相对live知识恶魔新增达标；这仅是候选准入，是否实际发布以本批发布回执为准。
A0–4及A5–9各0场验证，各缺10场独立验证；不移动切点补样本。A10、F49和逐boss失败指标见上表。
F49独立验证17场，数量缺口0，仍因误差及打穿比超标保持低可信，未验证F48→F49联合通关率。
生产树相对固定模型有69项输入不同，本批不声称后续模型变化已被验证，也不据此声称胜率收益。

Roy授权角色隔离、固定时间切分、整体Platt及四门槛、定期刷新架构；样本、胜败、残差、可信名单来自静默对局。
复用实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36；没有新增生产代码、机制或策略阈值，
code_proposals=[]、implementation_domains=[]。本批不修其他队列，也不混入铁甲数据或参数。

定期入口agent/tools/boss-sim/refresh-silent.py，传--previous实际live静默boss-trust.json；
ops/learner_jobs.py:calibration_job在每小时:13/:43学习tick及批次完成事件检查。
升阶或20次新的已完局SILENT boss实际won/died事件触发；未达阈值幂等跳过，无空版本。
新样本只延伸验证，调参keys/切点/模型冻结。新达标项按原四标准自动生成，发布仍需原锁内流程。
'''
records = read('new-run-code-provenance.json')
assert not records['missing']
report += '\n## 新验证局启动代码来源\n\nruns索引current以run-config原始offset/len/SHA补核；dirty不等于恢复完整源码快照。\n\n| 局号 | 时间UTC | 启动提交 | dirty |\n|---|---|---|---|\n'
for r in records['records']:
    report += f'| {r["run_id"]} | {r["ts"]} | {r["code"]["commit"]} | {r["code"]["dirty"]} |\n'
first = min(added, key=lambda r: r['first_ts'])
item = {'character': 'silent', 'by': 'learner:fix-batch', 'kind': 'fight',
        'claim': f'Roy授权静默boss固定模型周期刷新：相对live新增26实际结局，215完局/966尝试/390可用；107调参、切点和Platt不动，验证257→283（成功281）；B2/B3 Brier {b2["brier"]}/{b3["brier"]}、各7可信。F49低可信、低阶各0验证；仅固定7e1193cef模型，不改策略阈值。',
        'first_run': first['run_id'], 'prior': 'unknown', 'status': 'proposed',
        'prior_note': '统计校准；Roy架构授权不是游戏事实，不据此认定理解打法。',
        'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                      'note': f'A{r["asc"]} {r["encounter"]} 尝试{r["attempt"]} T1–{r["turns"]} 实际{r["outcome"]}；{r["key"]}'} for r in added],
        'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'], 'proposal': [str(HERE / 'report.md')],
                  'changelog': ['paper/materials/silent/boss-sim-calibration.md', str(archive.relative_to(ROOT))]},
        'note': f'来源任务{HERE.name}，继承上批未发布25场缓存并新增1场；全量重提取及固定模型控制核验。新功能非bug-infra；只proposed，shipped由运维核实际发布登记。'}
assert not (HERE / 'ledger-id.txt').exists()
(HERE / 'ledger-proposal.json').write_text(json.dumps(item, ensure_ascii=False, indent=1) + '\n')
(HERE / 'ledger-date.log').write_text(subprocess.check_output(['date'], text=True))
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'add'], input=json.dumps(item, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-add.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
ledger = r.stdout.strip()
assert re.fullmatch(r'silent-\d{4,}', ledger)
(HERE / 'ledger-id.txt').write_text(ledger + '\n')
report += f'\n本批账本{ledger}（fight/proposed）；实际发布状态与测试回执在scratch/report.md。\n'
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE / 'report.md').write_text(report + '\n## 发布状态\n\n候选已生成；尚未实际合入，不登记版本或shipped。\n')
shutil.copytree(generated, archive)
names = ['previous-live-trust.json', 'cached-trust.json', 'cadence-before.json', 'model-changes.json',
         'pinned-input-integrity.json', 'pinned-replay-audit.json', 'control-replay-comparison.json',
         'idempotency-audit.json', 'opening-audit.json', 'model-input-audit.json', 'input-audit-summary.json',
         'first-hit-identifiers.json', 'opening-source-integrity.json', 'new-run-code-provenance.json',
         'prepare-pinned.py', 'prepare-pinned.log', 'finish-pinned.py', 'finish-pinned.log', 'finish-pinned.exit',
         'prepare-records.py', 'audit-sources.py', 'audit-sources.log', 'new-fights.json', 'new-since-live.json',
         'replay-identifiers.json', 'pinned-replay.log', 'pinned-replay.exit', 'python-fixtures.log',
         'python-fixtures.exit', 'dispatch-fixtures.log', 'dispatch-fixtures.exit', 'test-dispatch-fixtures.py',
         'ledger-proposal.json', 'ledger-date.log', 'ledger-add.log', 'ledger-id.txt']
for name in names:
    shutil.copyfile(HERE / name, archive / name)
shutil.copyfile(HERE / 'pinned-results/results-0.jsonl', archive / 'control-and-new-results.jsonl')
shutil.copyfile(ROOT / 'paper/materials/silent/boss-sim-calibration.md', archive / 'candidate-report.md')
shutil.copyfile(PROJECT / '.worktrees/live/paper/materials/silent/boss-sim-calibration.md', archive / 'previous-published-report.md')
shutil.copyfile(PROJECT / 'data/game-data.json', archive / 'game-data-input.json')
(archive / 'README.md').write_text(f'# 静默boss固定模型刷新\n\n任务{HERE.name}；26新实际结局，107调参/283验证。completed.json封存原生成结果，candidate-report.md补充审计口径。387场缓存复用、2控制+1新增重放；旧目录和原失败保持。\n')
(archive / 'audit-manifest.json').write_text(json.dumps({p.name: sha(p) for p in sorted(archive.iterdir()) if p.is_file()}, indent=1) + '\n')
print(json.dumps({'artifact': artifact, 'ledger': ledger, 'archive': str(archive)}, ensure_ascii=False))
