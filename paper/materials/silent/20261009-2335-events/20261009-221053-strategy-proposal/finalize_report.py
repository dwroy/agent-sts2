import json
from pathlib import Path
import re
import subprocess

OUT = Path(__file__).resolve().parent
TREE = OUT.parents[2]
ROOT = Path('/home/dw/Projects/agent-sts2')
release = json.loads((OUT / 'release.json').read_text())
batch = json.loads((OUT / 'batch.json').read_text())
results = json.loads((OUT / 'proposal-results.json').read_text())
assert set(r['id'] for r in results) == set(batch['proposal_ids'])
assert (OUT / 'source-sandbox-corrected.rc').read_text().strip() == '0'
assert (OUT / 'live-sandbox.rc').read_text().strip() == '0'
assert (OUT / 'accelerant-removed.rc').read_text().strip() == '1'
assert (OUT / 'accelerant-restored.rc').read_text().strip() == '0'
subprocess.run(['git', '-C', str(ROOT / '.worktrees/live'), 'merge-base', '--is-ancestor', release['source'], 'HEAD'], check=True)
status = subprocess.check_output(['git', '-C', str(TREE), 'status', '--short'], text=True)
assert not status, status
subprocess.run(['date', '+%Y-%m-%d %H:%M:%S %Z'], check=True)

def totals(name):
    content = (OUT / name).read_text()
    cases = [int(x) for x in re.findall(r'^\s+Tests\s+(\d+) passed', content, re.M)]
    files = [int(x) for x in re.findall(r'^\s+Test Files\s+(\d+) passed', content, re.M)]
    assert len(cases) == len(files) == 2, name
    return dict(cases=sum(cases), files=sum(files), phases=list(zip(files, cases)))

source_counts = totals('source-sandbox-corrected.log')
live_counts = totals('live-sandbox.log')
report = dict(task='strategy-proposal', base='3db9b61ee8145552b083e7b5ace52a6db09f1893', runs=batch['runs'],
              fixes=[dict(item=release['ledger'], commit=release['source'], proposal=release['code_proposal'],
                          description='静默A10神化触媒1→2的第九配对与同方案/已知抽牌/跨轮传播',
                          evidence=['VLZ6CCT8AQ0A A10 F43T1/T4/T5', 'VLZ6CCT8AQ0A A10 F45T5'])],
              skipped=[r['id'] for r in results],
              merged=release['merged'], release=release['release'], version=release['version'],
              tests=dict(tsc=0, vitest=0, cases=source_counts['cases']),
              code_proposals=batch['proposal_ids'] + [release['code_proposal']], implementation_domains=['combat'],
              proposal_results=results, report=str(OUT / 'report.md'))
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
sections = '\n'.join(f"- `{row['id']}`：waiting；{row['reason']}" for row in results)
text = f'''# 静默策略学习回报：神化触媒有限配对已上线

基线：{report['base']}。来源局：{', '.join(batch['runs'])}，均为SILENT A10。任务全程独立完成，未派子agent；没有联网、调用LLM、运行play、推送或读取游戏二进制/凭证。

## 提案、证据与提交

实际实现范围仅combat：神化第九组触媒普通额外1次→升级额外2次，沿现有同方案、已知抽牌与后续牌堆路径传播，不预支仅持有的收益。证据：VLZ6CCT8AQ0A F43T1施放神化，F43T4 states275698→275700建立2并使12毒扣33，F43T5 states275705→275706的16毒扣45；F45T5 states275750普通端1，未施放神化。无整场反事实/独立盲测，不能承诺胜率。未知牌/属性/重放组合和其他角色/进阶保持原边界，铁甲行为等价。

账本：{release['ledger']}（新有限配对proposed）、silent-0237/0238/0027（既有出处；不重写首证/claim/历史或重复复盘）。代码提案CLI：{release['code_proposal']}，implemented_commit={release['source']}，已由CLI核实际live祖先；学习者不标shipped。

源码提交：{release['source']}。
实际live合入：{release['merged']}。
上线记录提交：{release['release']}。
唯一行为版本：{release['version']}。
提案原件与十项处置：{OUT / 'proposal.md'}。

## 验证及原失败历史

- 六局角色核对；本批10提案Markdown原SHA/角色/账本/证据链接核对通过。3329条保存记录与只读日志逐offset/逐行全等；两份原静默复盘verify.py重执行通过，核20场资源/17次药水与8JRE同盘SL实付血价等。
- 固定新7例：撤生产源码5失败/2通过（accelerant-removed.log，exit1），恢复新7及既有神化6、勒紧6、毒8，共4文件27例通过（accelerant-restored.log，exit0）。发现样本内组合验证与真实T4/T5毒扣分开，不冒称实盘同回合同打神化/触媒。
- 首轮原入口：tsc0/vitest1，253文件中251通过、2625例通过2失败，1063.81秒；失败为我保存的两份.ts备份被导入扫描纳入，以及本工作树缺已有data/logdb-venv运行环境链接。原日志source-sandbox.log与rc1保留，没有策略用例失败，不改断言/生产预算/排除名单。
- 修正环境：备份原字节改.snapshot后缀，补已有共享data运行环境链接；两失败项固定复测2文件2例通过（setup-corrected.log）。未安装依赖。重跑同一入口、使用脚本允许的4workers：源码tsc0/vitest0，{source_counts['files']}文件{source_counts['cases']}例通过（source-sandbox-corrected.log）。
- live合后同一原入口：tsc0/vitest0，{live_counts['files']}文件{live_counts['cases']}例通过（live-sandbox.log）。未放宽测试；沙箱外完整套件交原调度器后续事件，当前不冒报其结果。
- gitleaks源码暂存差异、通知和上线记录扫描均0；源码与记录提交使用全局身份及Codex GPT-6共同作者，无仓库级身份配置。

## 合入和通知

持有ops/live-merge.lock，按原builder等待命令执行；先保存实际知识刷新，交叉路径预检无重叠，merge-tree预检无冲突后正常merge。本次未修改知识生成脚本，无重建。刷新保存提交若存在见refresh-commit.txt；实际合入前基线见live-before.txt，原状态及merge/测试日志保留。合后通过，无回滚。

先date后追加live decision-log与唯一eval版本；根目录notes/for-roy.md和ops/inbox-dev.md同时追加Roy通知，写旧/新规则、证据/账本/任务、预期影响、源码回退和提案路径。账本只经根目录CLI add/update；新{release['ledger']}仍proposed，实际源码祖先及版本交运维核实shipped。

## 本批全部派发id

{sections}

这些宽提案保留waiting。有限触媒实现不等于其余升级真值、完整题面审计、预算对照或整场SL/focus/启动实验已完成；新增有限提案单独用实际源码commit登记implemented，不冒称父项全部实现。

## 机器回报

```json
{json.dumps(report, ensure_ascii=False, indent=2)}
```
'''
(OUT / 'report.md').write_text(text)
print(json.dumps(report, ensure_ascii=False))
