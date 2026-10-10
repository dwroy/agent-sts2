"""Archive the fixed experiment and append a fight/proposed finding through the ledger CLI."""
import collections
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
artifact = trust['refresh']['artifact']
generated = HERE / artifact
archive = ROOT / 'experiments/boss-sim/silent' / artifact
assert not archive.exists(), 'old archives must never be overwritten'
sources = [json.loads(line) for line in (generated / 'sources.jsonl').open()]
added = json.loads((HERE / 'new-fights.json').read_text())
counts = dict(collections.Counter(r['outcome'] for r in added))
f49 = [r for r in sources if r.get('floor') == 49]
actual_f49 = sum(r.get('outcome') in ('won', 'died') for r in f49)
usable_f49 = sum(not r.get('excluded') for r in f49)
report = (generated / 'report.md').read_text()
report = report.replace('没有实际结局的房间', '没有可用实际结局开场的房间')
old_sentence = f'F49 实际结局 {usable_f49} 场；这个数量不足单独验证第二场 boss 的可靠性，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。'
new_sentence = (f'F49 实际结局 {actual_f49} 次、可用开场 {usable_f49} 场；'
                '数量缺口与失败指标分别报告。每场仍按实际进入时的资源评估，未验证 F48→F49 联合通关率。')
assert old_sentence in report
report = report.replace(old_sentence, new_sentence)
report += ('\n## 本批固定模型验证刷新\n\n'
           f'21次新增实际结局触发（{counts}），194完局、919次尝试、364可用开场；'
           '固定107调参和UTC切点，新样本只把验证236扩至257，整体Platt与进阶项选择逐项保持。\n\n'
           '模型固定为上次发布的7e1193cef9467416bc10c8e344a49f4fd98390c7；'
           '209个Git输入及game-data共210项SHA全部匹配，343历史开场与回合输入等价。'
           '其中2战作控制重放，4起点结果除耗时外逐项等同；341战复用原封存结果，'
           '21新战用相同模型、200样本、原始全数据行号种子重放。'
           '当前生产代码/知识刷新与此旧固定模型的差异另存model-changes.json，'
           '本批不宣称当前生产模型的全部数值变化已重新验证，不覆盖这些并行刷新。'
           '首次按标准入口启动的当前模型全量回放被本任务执行会话中断（exit130），原始结果/来源/日志保留。\n\n'
           '917个有开场帧的来源核对原始states的offset/len/SHA和SILENT身份；'
           '无开场的2项仍保留排除原因。A0–4和A5–9各0场验证，各还需10场才能独立验证，'
           '不能移动切点补数。F49与A10按下面原门槛报告；缺级数值和无伤害记录在输入审计中明列。\n\n'
           'Roy授权的是角色隔离、固定时间切分、整体校准、原准入标准和周期刷新架构；'
           '样本/结局/残差/可信结论来自静默实战。只更新静默统计校准数据，未新增出牌/药水/SL/终局策略规则，'
           '费用/药水/保血/目标/SL阈值均未改。复用实际live祖先实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36；'
           'code_proposals=[]、implementation_domains=[]，账本kind=fight/status=proposed，shipped由运维核实际发布登记。\n')
first = min(added, key=lambda r: r['first_ts'])
claim = (f'Roy授权静默boss固定模型定期刷新，新增21实结局{counts}；194完局/919尝试/364可用，'
         f'调参107/切点/Platt保持，验证236→257。B2/B3 Brier '
         f"{trust['overall']['t1']['brier']}/{trust['overall']['pre']['brier']}，可信"
         f"{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}，全部按原四门槛。"
         f'F49实际{actual_f49}/可用{usable_f49}，独立失败与低阶验证0限制保留；'
         '只验证固定7e1193cef模型，不把现行生产模型后续变化冒报已验证。未改策略阈值。')
item = {'character':'silent', 'by':'learner:fix-batch', 'kind':'fight', 'claim':claim,
        'first_run':first['run_id'], 'prior':'unknown', 'status':'proposed',
        'prior_note':'统计校准刷新；不由这批动作推断agent已理解打法，授权不是游戏事实。',
        'evidence':[{'run':r['run_id'], 'floor':r['floor'], 'turn':1, 'role':'support',
                     'note':f"A{r['asc']} {r['encounter']} 尝试{r['attempt']}、{r['turns']}回合、实际{r['outcome']}；{r['key']}"} for r in added],
        'where':{'knowledge':['knowledge/characters/silent/boss-trust.json'],
                 'proposal':[str(HERE/'report.md')],
                 'changelog':['paper/materials/silent/boss-sim-calibration.md',f'experiments/boss-sim/silent/{artifact}']},
        'note':'来源任务20261010-132512-silent-boss-calibration；Roy已授权新功能周期刷新，非bug-infra；proposed，实际发布/shipped待运维核实。'}
payload = json.dumps(item,ensure_ascii=False)
(HERE/'ledger-proposal.json').write_text(payload+'\n')
date = subprocess.run(['date'],capture_output=True,text=True,check=True)
(HERE/'ledger-date.log').write_text(date.stdout)
r = subprocess.run(['python3',str(PROJECT/'learner/ledger.py'),'add'],input=payload,capture_output=True,text=True)
(HERE/'ledger-add.log').write_text(r.stdout+r.stderr)
(HERE/'ledger-add.exit').write_text(str(r.returncode)+'\n')
assert r.returncode == 0, r.stderr
ledger = r.stdout.strip()
assert re.fullmatch(r'silent-\d{4,}',ledger)
(HERE/'ledger-id.txt').write_text(ledger+'\n')
report += f'\n本批账本 `{ledger}`（fight/proposed）；封存目录 `experiments/boss-sim/silent/{artifact}/`；发布回执见本任务scratch/report.md。\n'
(ROOT/'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE/'report.md').write_text(report+'\n## 发布状态\n\n候选与固定测试已完成；锁内live合入/合后检查尚未执行，此稿不登记shipped。\n')
shutil.copytree(generated,archive)
copy_names = ['previous-live-trust.json','cadence-before.json','model-changes.json',
    'previous-base-input-check.json','pinned-input-integrity.json','pinned-replay-audit.json',
    'control-replay-comparison.json','idempotency-audit.json','opening-audit.json','model-input-audit.json',
    'input-audit-summary.json','first-hit-identifiers.json','opening-source-integrity.json',
    'opening-audit.log','opening-audit.exit','opening-audit-initial-failure.json',
    'initial-interruption.json','refresh.stdout.log','refresh.stderr.log','refresh-initial.exit',
    'prepare-pinned.py','prepare-pinned-draft.py','prepare-pinned.log','prepare-pinned.exit',
    'prepare-pinned-v2.log','prepare-pinned-v2.exit','finish-pinned.py','finish-pinned.log','finish-pinned.exit',
    'prepare-records.py','publish-live.py','new-fights.json','replay-identifiers.json',
    'pinned-replay-0.log','pinned-replay-0.exit','pinned-replay-1.log','pinned-replay-1.exit',
    'source-sandbox.log','source-sandbox.exit','python-fixed.log','python-fixed.exit',
    'dispatch-fixed.log','dispatch-fixed.exit','dispatch-fixed-initial.log','dispatch-fixed-initial.exit','test-dispatch-fixtures.py',
    'ledger-proposal.json','ledger-date.log','ledger-add.log','ledger-add.exit','ledger-id.txt']
for name in copy_names:
    shutil.copyfile(HERE/name,archive/name)
initial = HERE/'0b63fbe082b1192d5088a387f47f653894a5ef1b2df756ecf9ec9c0d2b0cceba'
for src,dst in [('provenance.json','initial-provenance.json'),('backtest.log','initial-backtest.log'),
                ('results/results-0.jsonl','initial-interrupted-results.jsonl')]:
    shutil.copyfile(initial/src,archive/dst)
game=Path('/home/dw/Projects/agent-sts2/data/game-data.json')
assert hashlib.sha256(game.read_bytes()).hexdigest()==trust['source']['input_files'][str(game)]
shutil.copyfile(game,archive/'game-data-input.json')
shutil.copyfile(ROOT/'paper/materials/silent/boss-sim-calibration.md',archive/'published-report.md')
subprocess.run(['git','show','HEAD:paper/materials/silent/boss-sim-calibration.md'],cwd=ROOT,check=True,
               stdout=(archive/'previous-published-report.md').open('w'))
(archive/'README.md').write_text('# 静默boss固定模型验证刷新\n\n任务20261010-132512-silent-boss-calibration；21新增实际结局，107调参/257验证。'
    '固定模型及输入见provenance/pinned-input-integrity，4控制结果等价。completed.json封存生成结果；published-report.md补充口径/限制。'
    '脚本原运行位置为任务scratch，pinned-model-v2可由prepare-pinned.py从固定Git提交复原；node_modules复用现有目录，依赖未安装。'
    '原首次全量回放中断130、路径错误和tar目录检查失败均留原件；旧指纹目录未覆盖。\n')
(archive/'audit-manifest.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()
    for p in archive.iterdir() if p.is_file() and p.name!='audit-manifest.json'},ensure_ascii=False,indent=1)+'\n')
print(json.dumps({'artifact':artifact,'ledger':ledger,'archive':str(archive)},ensure_ascii=False))
