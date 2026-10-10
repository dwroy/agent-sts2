"""Archive the frozen validation extension and register evidence through the ledger CLI."""
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

def rows(path):
    return [json.loads(line) for line in path.open() if line.strip()]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name in ('source-sandbox', 'python-fixed', 'dispatch-fixed', 'finish-pinned', 'opening-audit'):
    assert (HERE / (name + '.exit')).read_text().strip() == '0', name
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-live-trust.json').read_text())
artifact = trust['refresh']['artifact']
generated = HERE / artifact
archive = ROOT / 'experiments/boss-sim/silent' / artifact
assert not archive.exists(), 'never overwrite a previous fingerprint directory'
extraction = json.loads((generated / 'extraction.json').read_text())
sources = rows(generated / 'sources.jsonl')
added = json.loads((HERE / 'new-fights.json').read_text())
counts = dict(collections.Counter(r['outcome'] for r in added))
f49 = [r for r in sources if r.get('floor') == 49]
actual_f49 = sum(r.get('outcome') in ('won', 'died') for r in f49)
usable_f49 = sum(not r.get('excluded') for r in f49)
integrity = json.loads((HERE / 'opening-source-integrity.json').read_text())
report = (generated / 'report.md').read_text().replace('没有实际结局的房间', '没有可用实际结局开场的房间')
old_sentence = (f'F49 实际结局 {usable_f49} 场；这个数量不足单独验证第二场 boss 的可靠性，'
                '仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。')
assert old_sentence in report
report = report.replace(old_sentence, f'F49 实际结局 {actual_f49} 次、可用开场 {usable_f49} 场；'
                        '数量缺口与失败指标分别报告。每场按实际进场资源评估，未验证 F48→F49 联合通关率。')
report += ('\n## 本批固定模型验证刷新\n\n'
           f'{len(added)} 次新增实际结局触发（{counts}）；{extraction["finished_runs"]} 完局、'
           f'{extraction["attempts"]} 次尝试、{extraction["written"]} 可用开场。'
           f'固定 {trust["split"]["tune_n"]} 调参与 UTC 切点，新样本只把验证 '
           f'{previous["split"]["val_n"]} 扩至 {trust["split"]["val_n"]}；整体 Platt 与进阶项选择逐项保持。\n\n'
           f'模型固定为上次发布的 {trust["source"]["simulator_base"]}；210 项输入 SHA 全匹配，'
           '364 个历史开场/回合输入等价。2 战控制重放的 4 起点结果除耗时外全等；'
           '362 战复用封存结果，23 新战以相同模型、200 样本、原始全数据行号种子重放。'
           '当前生产模型与此固定模型的差异见 model-changes.json，本批不宣称后续生产数值变化已验证。'
           '首次指定入口完成提取后，当前模型全量回放经自身执行会话中断（exit 130）；原始来源、局部结果和日志保持。\n\n'
           '固定模型单路回放完成6战后也经自身会话中断（130），12起点结果保留；'
           '仅剩余19战改为两路分片，直接exec的两个Node/转译器对子总计4进程、nice19。'
           '既有结果不覆盖，分片仍使用原全数据行号种子；完整50起点合并后才准许生成候选。\n\n'
           f'{integrity["verified_openings"]} 个来源开场核对原始 states offset/len/SHA 与 SILENT 身份；'
           f'{len(integrity["missing_openings"])} 个无开场来源保留排除原因。'
           'A0–4、A5–9 各 0 场验证，各缺 10 场独立验证，不移动切点补数。'
           'A10 与 F49 按原门槛报告；缺级数值和无伤害记录在输入审计列出。\n\n'
           'Roy 授权的是角色隔离、固定时间切分、整体校准、原准入标准和定期刷新架构；'
           '样本、结局、残差和可信结论来自静默对局。费用/药水/保血/目标/SL 策略阈值未改。'
           '复用实际 live 祖先实现 cdf75af64fb5b118a5a808ecb3b05e2a05991c36，'
           '本批没有新增策略源码或机制提案，code_proposals=[]、implementation_domains=[]。\n')
versions = json.loads((HERE / 'new-run-code-provenance.json').read_text())
assert not versions['missing']
report += ('\n## 新验证局实际代码来源补充\n\n'
           'runs.jsonl 的新增局版本字段均为 `current`，原提取值保持。逐局核对 run-config.jsonl，'
           '以下是当时进程记录的实际启动提交；offset/len/SHA 留 new-run-code-provenance.json。'
           '这些记录均为 dirty，完整当时未提交源码/知识字节未由此恢复，不能把 HEAD 当成完整运行树。\n\n'
           '| 局号 | run-config 时间（UTC） | 实际启动提交 | dirty |\n|---|---|---|---|\n')
for record in versions['records']:
    assert record['character'] == 'SILENT'
    code = record['code']
    report += f'| {record["run_id"]} | {record["ts"]} | {code["commit"]} | {code["dirty"]} |\n'
first = min(added, key=lambda r: r['first_ts'])
claim = (f'Roy授权静默boss固定模型周期刷新，新增23实际结局{counts}；212完局/963尝试/387可用，'
         f'调参107/切点/Platt保持，验证257→280。B2/B3 Brier '
         f'{trust["overall"]["t1"]["brier"]}/{trust["overall"]["pre"]["brier"]}，'
         f'可信{len(trust["trusted_b2"])}/{len(trust["trusted_b3"])}，仍用原四门槛；'
         f'F49实际{actual_f49}/可用{usable_f49}，低阶验证0及失败指标保留。'
         '只验证固定7e1193cef模型，未改策略阈值。')
item = {'character': 'silent', 'by': 'learner:fix-batch', 'kind': 'fight', 'claim': claim,
        'first_run': first['run_id'], 'prior': 'unknown', 'status': 'proposed',
        'prior_note': '统计校准刷新，授权不提供游戏事实，不据此认定agent理解打法。',
        'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                      'note': f'A{r["asc"]} {r["encounter"]} 尝试{r["attempt"]}，{r["turns"]}回合，实际{r["outcome"]}；{r["key"]}'} for r in added],
        'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'],
                  'proposal': [str(HERE / 'report.md')],
                  'changelog': ['paper/materials/silent/boss-sim-calibration.md', f'experiments/boss-sim/silent/{artifact}']},
        'note': '来源任务20261010-214307-silent-boss-calibration；Roy已授权新功能周期刷新，非bug-infra；shipped由运维核实际发布登记。'}
payload = json.dumps(item, ensure_ascii=False)
(HERE / 'ledger-proposal.json').write_text(payload + '\n')
(HERE / 'ledger-date.log').write_text(subprocess.check_output(['date'], text=True))
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'add'], input=payload, capture_output=True, text=True)
(HERE / 'ledger-add.log').write_text(r.stdout + r.stderr)
(HERE / 'ledger-add.exit').write_text(str(r.returncode) + '\n')
assert r.returncode == 0, r.stderr
ledger = r.stdout.strip()
assert re.fullmatch(r'silent-\d{4,}', ledger)
(HERE / 'ledger-id.txt').write_text(ledger + '\n')
report += f'\n本批账本 `{ledger}`（fight/proposed）；封存目录 `experiments/boss-sim/silent/{artifact}/`；发布回执见本任务 scratch/report.md。\n'
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(report)
(HERE / 'report.md').write_text(report + '\n## 发布状态\n\n固定自测已完成；锁内 live 合入和合后检查尚未执行，未登记 shipped。\n')
shutil.copytree(generated, archive)
names = ['previous-live-trust.json', 'cadence-before.json', 'model-changes.json',
         'pinned-input-integrity.json', 'pinned-replay-audit.json', 'control-replay-comparison.json',
         'idempotency-audit.json', 'opening-audit.json', 'model-input-audit.json',
         'input-audit-summary.json', 'first-hit-identifiers.json', 'opening-source-integrity.json',
         'new-run-code-provenance.json', 'early-live-observation.json',
         'opening-audit.log', 'opening-audit.exit', 'initial-interruption.json',
         'refresh-requested.log', 'refresh-requested.exit', 'prepare-pinned.py',
         'prepare-pinned.log', 'prepare-pinned.exit', 'finish-pinned.py', 'finish-pinned.log',
         'finish-pinned.exit', 'prepare-records.py', 'publish-live.py', 'new-fights.json',
         'replay-identifiers.json', 'pinned-replay.log', 'pinned-replay.exit',
         'replay-resume.json', 'completed-prefix-results.jsonl', 'remaining-replay-identifiers.json',
         'remaining-replay-0.log', 'remaining-replay-0.exit',
         'remaining-replay-1.log', 'remaining-replay-1.exit',
         'source-sandbox.log', 'source-sandbox.exit', 'python-fixed.log', 'python-fixed.exit',
         'dispatch-fixed.log', 'dispatch-fixed.exit', 'test-dispatch-fixtures.py',
         'ledger-proposal.json', 'ledger-date.log', 'ledger-add.log', 'ledger-add.exit', 'ledger-id.txt']
for name in names:
    shutil.copyfile(HERE / name, archive / name)
initial = HERE / json.loads((HERE / 'initial-interruption.json').read_text())['artifact']
for src, dst in [('provenance.json', 'initial-provenance.json'), ('backtest.log', 'initial-backtest.log'),
                 ('results/results-0.jsonl', 'initial-interrupted-results.jsonl')]:
    shutil.copyfile(initial / src, archive / dst)
game = PROJECT / 'data/game-data.json'
assert sha(game) == trust['source']['input_files'][str(game)]
shutil.copyfile(game, archive / 'game-data-input.json')
shutil.copyfile(ROOT / 'paper/materials/silent/boss-sim-calibration.md', archive / 'published-report.md')
with (archive / 'previous-published-report.md').open('w') as out:
    subprocess.run(['git', 'show', 'HEAD:paper/materials/silent/boss-sim-calibration.md'], cwd=ROOT, check=True, stdout=out)
(archive / 'README.md').write_text('# 静默 boss 固定模型验证刷新\n\n任务20261010-214307-silent-boss-calibration；23新增实际结局，107调参/280验证。固定模型、输入及控制重放审计在同目录；completed.json封存生成结果，published-report.md补充来源口径。首次当前模型回放中断130保留。旧指纹目录未覆盖；脚本原运行位置为本任务scratch，依赖复用已有环境。\n')
(archive / 'audit-manifest.json').write_text(json.dumps({p.name: sha(p) for p in archive.iterdir()
                                                       if p.is_file() and p.name != 'audit-manifest.json'}, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({'artifact': artifact, 'ledger': ledger, 'archive': str(archive)}, ensure_ascii=False))
