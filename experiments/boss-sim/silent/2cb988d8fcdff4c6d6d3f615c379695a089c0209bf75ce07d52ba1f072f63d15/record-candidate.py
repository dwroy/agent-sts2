"""Archive a fixed-model candidate and register only its evidence, never a release."""
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

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
extraction = read('dataset/extraction.json')
added, new = read('new-since-live.json'), read('new-fights.json')
artifact = trust['refresh']['artifact']
generated = HERE / artifact
archive = ROOT / 'experiments/boss-sim/silent' / artifact
assert not archive.exists(), 'Retain all existing artifacts'
for name in ('finish-pinned', 'python-fixtures', 'dispatch-fixtures'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
sources = [json.loads(line) for line in (generated / 'sources.jsonl').read_text().splitlines()]
f49 = [r for r in sources if r['floor'] == 49]
actual_f49 = sum(r.get('outcome') in ('won', 'died') for r in f49)
usable_f49 = sum(not r.get('excluded') for r in f49)
report = (generated / 'report.md').read_text().replace('没有实际结局的房间', '没有可用实际结局开场的房间')
old = (f'F49 实际结局 {usable_f49} 场；这个数量不足单独验证第二场 boss 的可靠性，'
       '仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。')
assert old in report
report = report.replace(old, f'F49 实际结局 {actual_f49} 次、可用开场 {usable_f49} 场；数量缺口与失败指标分别报告。每场按实际进场资源评估，未验证 F48→F49 联合通关率。')
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
reuse = trust['source']['result_reuse']
integrity = read('opening-source-integrity.json')
changed = read('model-changes.json')['changed']
report += f'''
## 本批固定模型验证刷新（{HERE.name}）

相对实际 live 新增 {len(added)} 次 boss 实际结局，达到20次阈值；最高已结束进阶仍A10。
严格SILENT已结束{extraction['finished_runs']}局，{extraction['attempts']}次尝试、{extraction['written']}个可用开场，
{extraction['boss_rooms']}个boss房间。SL预测必死截断不补造败局；来源与排除原因逐行保留。
107个调参keys、UTC切点{trust['split']['cutoff_ts']}、Platt与模型选择保持，验证{previous['split']['val_n']}→{trust['split']['val_n']}，
其中B2/B3各{b2['n']}/{b3['n']}场成功预测；历史3场各两起点no-solve保留（1调参、2验证）。

先用现有character_extract.py冻结日志，指定refresh-silent.py入口额外传--dataset、--results、--provenance，
保持已发布模型{trust['source']['simulator_base']}，不用当前生产模型重新拟合该实验。
210项固定模型输入SHA逐项核实；缓存{reuse['cache_artifact']}的{reuse['historical_fights']}场及回合完全一致，
复用{reuse['reused_fights']}场，重放2控制场和{len(new)}新场，控制战4起点除耗时外完全一致。
每起点200样本、seed=1和全量原始行号保持。同内容重跑/更新previous后的门槛跳过均不启动模拟或拟合子进程。
已核{integrity['verified_openings']}个开场原始offset/len/SHA、SILENT与进阶；缺开场{len(integrity['missing_openings'])}条保留排除。

| 新增缓存外证据 | A | Boss | F | 尝试 | 回合 | 实际 | 进场/结算HP |
|---|---|---|---|---|---|---|---|
'''
for r in new:
    report += f"| {r['run_id']} | {r['asc']} | {r['encounter']} | {r['floor']} | {r['attempt']} | T1–{r['turns']} | {r['outcome']} | {r['entry_hp']}/{r['end_hp']} |\n"
report += f'''
相对live的全部{len(added)}场见new-since-live.json。B2/B3 Brier {b2['brier']}/{b3['brier']}，
可信分别{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}项；名单仍须同时满足四指标。
相对live新增候选B2：{sorted(set(trust['trusted_b2']) - set(previous['trusted_b2']))}；
B3：{sorted(set(trust['trusted_b3']) - set(previous['trusted_b3']))}，未实际发布前不得称已准入。
A0–4、A5–9各0场独立验证，各距10场还差10；固定切点不移动。
F49验证{trust['stage_metrics']['t1']['F49']['val']['n']}场，数量缺口0，误差和打穿比仍失败；F48→F49联合通关率未验证。
生产树相对固定模型有{len(changed)}项输入不同，本实验不验证这些后续变化，也不证明胜率收益。

Roy授权角色隔离、时间切分、整体Platt、原四门槛与定期刷新架构；提取数、实际胜败、残差和名单由静默对局核实。
复用源码cdf75af64fb5b118a5a808ecb3b05e2a05991c36；本批不新增机制或生产代码，不改费用/药水/保血/目标/SL策略阈值。
code_proposals=[]、implementation_domains=[]；没有需另立策略实现的规则变更。

定期入口agent/tools/boss-sim/refresh-silent.py（--previous实际live静默boss-trust.json）。
ops/learner_jobs.py:calibration_job于每小时:13/:43及learner完成事件检查；升阶或新增20次已完局boss实际won/died触发，
不足幂等跳过，不造空版本。新样本只延伸验证，固定模型/切点/调参keys保留，新达标自动入候选名单。
生产发布仍须锁内保存刷新、检查重叠、预检、合入、合后测试和唯一版本；仅同步静默数据。

## 新验证局启动代码来源

runs索引current以run-config的offset/len/SHA补核；dirty不表示完整源码快照已恢复。

| 局号 | 时间UTC | 启动提交 | dirty |
|---|---|---|---|
'''
for r in read('new-run-code-provenance.json')['records']:
    report += f"| {r['run_id']} | {r['ts']} | {r['code']['commit']} | {r['code']['dirty']} |\n"
first = min(new, key=lambda r:r['first_ts'])
item = {'character':'silent', 'by':'learner:fix-batch', 'kind':'fight',
        'claim':f"Roy授权静默boss固定模型周期刷新：相对live新增{len(added)}实际结局，{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用；107调参、切点和Platt不动，验证{previous['split']['val_n']}→{trust['split']['val_n']}（成功{b2['n']}）；B2/B3 Brier {b2['brier']}/{b3['brier']}，可信{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}。F49低可信、低阶各0验证；仅固定7e1193cef模型，不改策略阈值。",
        'first_run':first['run_id'], 'prior':'unknown', 'status':'proposed',
        'prior_note':'统计校准；Roy架构授权不是游戏事实，不据此认定已理解打法。',
        'evidence':[{'run':r['run_id'],'floor':r['floor'],'turn':1,'role':'support',
                     'note':f"A{r['asc']} {r['encounter']} 尝试{r['attempt']} T1–{r['turns']} 实际{r['outcome']}；{r['key']}"} for r in new],
        'where':{'knowledge':['knowledge/characters/silent/boss-trust.json'], 'proposal':[str(HERE/'report.md')],
                 'changelog':['paper/materials/silent/boss-sim-calibration.md',str(archive.relative_to(ROOT))]},
        'note':f'来源任务{HERE.name}；全量重提取、固定模型控制核验；授权新功能非bug-infra，只proposed，shipped由运维核实际发布登记。'}
assert not (HERE/'ledger-id.txt').exists()
write('ledger-proposal.json',item)
(HERE/'ledger-date.log').write_text(subprocess.check_output(['date'],text=True))
r = subprocess.run(['python3',str(PROJECT/'learner/ledger.py'),'add'],input=json.dumps(item,ensure_ascii=False),capture_output=True,text=True)
(HERE/'ledger-add.log').write_text(r.stdout+r.stderr)
assert r.returncode == 0,r.stderr
ledger = r.stdout.strip(); assert re.fullmatch(r'silent-\d{4,}',ledger)
(HERE/'ledger-id.txt').write_text(ledger+'\n')
report += f'\n本批账本{ledger}（fight/proposed）；实际发布状态与测试回执在scratch/report.md。\n'
(ROOT/'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE/'report.md').write_text(report)
shutil.copytree(generated,archive)
names = ['previous-live-trust.json','cached-trust.json','cadence-before.json','model-changes.json',
         'pinned-input-integrity.json','pinned-replay-audit.json','control-replay-comparison.json','idempotency-audit.json',
         'opening-audit.json','model-input-audit.json','input-audit-summary.json','opening-source-integrity.json','opening-state-equality.json',
         'new-run-code-provenance.json','new-fights.json','new-since-live.json','replay-identifiers.json',
         'initial-prepare-failure.json','extract.log','extract.exit','prepare-pinned-initial.py','prepare-pinned-initial.log','prepare-pinned-initial.exit','prepare-pinned.py','prepare-pinned.log','finish-pinned.py','finish-pinned.log','finish-pinned.exit',
         'audit-sources.py','audit-sources.log','record-candidate.py','pinned-replay.log','pinned-replay.exit',
         'ledger-proposal.json','ledger-add.log','ledger-id.txt','ledger-date.log']
for name in names:
    shutil.copyfile(HERE/name,archive/name)
(archive/'candidate-report.md').write_text(report)
(archive/'audit-manifest.json').write_text(json.dumps({p.name:sha(p) for p in sorted(archive.iterdir()) if p.is_file()},indent=1)+'\n')
write('artifact-integrity.json',{'artifact':artifact,'files':len(list(archive.iterdir())),
                              'sha256':{p.name:sha(p) for p in sorted(archive.iterdir()) if p.is_file()}})
write('boss-trust-table.json',trust['bosses'])
write('candidate-vs-live.json',{'new_outcomes':len(added),'new_cache_fights':len(new),
    'added_b2':sorted(set(trust['trusted_b2'])-set(previous['trusted_b2'])),
    'added_b3':sorted(set(trust['trusted_b3'])-set(previous['trusted_b3']))})
print(json.dumps({'ledger':ledger,'artifact':artifact,'new':len(added)},ensure_ascii=False))
