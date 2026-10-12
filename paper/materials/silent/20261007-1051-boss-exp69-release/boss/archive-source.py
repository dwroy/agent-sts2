"""Preserve immutable calibration inputs, intermediate replay history and failed checks in the source tree."""
import hashlib
import json
from pathlib import Path
import shutil

WORK = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
SCRATCH = Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-075131-silent-boss-calibration')

data = json.loads((WORK / 'knowledge/characters/silent/boss-trust.json').read_text())
artifact = data['refresh']['artifact']
target = WORK / 'experiments/boss-sim/silent' / artifact
if target.exists():
    raise RuntimeError('archive already exists; inspect it before attempting another write')
shutil.copytree(SCRATCH / artifact, target)
for name in ('opening-audit.json', 'model-input-audit.json', 'opening-source-integrity.json', 'censor-hp-audit.json'):
    shutil.copyfile(SCRATCH / name, target / name)
history = target / 'history'
history.mkdir()
files = ['results/results-0.jsonl', 'results/results-1.jsonl',
         'corrected-results/results-0.jsonl', 'corrected-results/results-1.jsonl',
         'corrected-keys.json', 'sources-before-censor-hp.jsonl',
         'assemble-results.py', 'backtest-0.log', 'backtest-1.log',
         'corrected-backtest-0.log', 'corrected-backtest-1.log',
         'probe.log', 'probe-2.log', 'python-tests-1.log', 'ts-targeted-1.log',
         'ts-without-feature.log', 'ts-without-feature.exit',
         'tsc-initial.log', 'bytecode-move-initial.log', 'python-tests-final.log',
         'python-tests-isolation-final.log', 'python-tests-frozen-final.log', 'dispatch-tests-final.log']
manifest = {}
for name in files:
    source = SCRATCH / name
    if not source.exists():
        continue
    destination = history / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    manifest[name] = hashlib.sha256(source.read_bytes()).hexdigest()
(history / 'manifest.json').write_text(json.dumps([{'file': name, 'sha256': value}
                                                 for name, value in sorted(manifest.items())], ensure_ascii=False, indent=1) + '\n')
readme = f'''# 固定静默校准批次 {artifact}

核心报告是 report.md，实时消费数据是 boss-trust.json；候选开场 fights.jsonl、来源 sources.jsonl、实际回合 turns.jsonl、角色筛选 extraction.json、固定切分 split.json、原始预测 results.jsonl 与 provenance.json 一同保存。completed.json 固定这些核心文件的 SHA256。run/SL 快照只保留已结束 SILENT，未纳入铁甲样本、角色统计或校准参数。

opening-source-integrity.json 核验160个首回合原帧 SHA256 与全部实际资源。opening-audit.json / model-input-audit.json 固定 monster-db 进阶输入；censor-hp-audit.json 核验218次SL截断最后仍有正血量。sources 中 end_hp 对截断留空，last_logged_hp 与 SL reported_end_hp 分开，不把预测0HP当实败。

history 保存初次320个起点、24场共48个起点的开场公式更正重放、原始错误、首次夹具/编译失败和修改撤回的红测试。更正名单只由第一击数值审计产生，没有查看验证标签选参；逐战行号和种子不变。初次错误分支的两条 no solve 未输出角色标签，合成时以严格提取同key、同局、同层、同进阶的原始 SILENT T1 归属，并保留原文件和逐项说明；没有给失败构造胜率。全部中间产物仍在 {SCRATCH}，旧提取 initial/ 没有删除，未用于拟合。

拟合复现（只读固定数据、不重跑模拟）：

```bash
PYTHONDONTWRITEBYTECODE=1 nice -n 19 python3 agent/tools/boss-sim/trust.py --character silent \\
  --results experiments/boss-sim/silent/{artifact}/results.jsonl \\
  --fights experiments/boss-sim/silent/{artifact}/fights.jsonl \\
  --split experiments/boss-sim/silent/{artifact}/split.json \\
  --turns experiments/boss-sim/silent/{artifact}/turns.jsonl \\
  --provenance experiments/boss-sim/silent/{artifact}/provenance.json --out <本批scratch>/reproduced-trust.json
```

复现输出没有周期调度的 refresh 元信息；overall/selection/residuals/bosses/trusted 和范围判断应一致。固定模型是 ff571cf0049ca3581588f453f8df630af4451b36 加本批角色隔离/开场进阶适配，数值输入版本以 provenance.json 中逐文件 SHA256 为准。发布保留之后其他批次修复和刷新；本次低可信名单不冒称最新模型已验证。

后续重跑使用 agent/tools/boss-sim/refresh-silent.py --previous <live静默boss-trust>；升阶或20次新实际结局触发，固定调参/切点，新数据延伸验证，每批保存新指纹和旧目录。调度检查为 :13/:43 和学习完成事件；新调度代码需运维按完成事件机械同步主检出，学习者没有直接编辑根目录ops或登记shipped。完整外部检查交调度器。
'''
(target / 'README.md').write_text(readme, encoding='utf8')
print(json.dumps({'artifact': artifact, 'archive': str(target), 'history_files': len(manifest)}, ensure_ascii=False))
