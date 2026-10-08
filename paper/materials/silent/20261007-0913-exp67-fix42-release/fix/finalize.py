import json
import re
import subprocess
from pathlib import Path

OUT = Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-081302-fix-batch')
SOURCE = Path('/home/dw/Projects/agent-sts2/.worktrees/codex-dev')
commit = (OUT / 'source-commit.txt').read_text().strip()
live = json.loads((OUT / 'live-result.json').read_text())
text = re.sub(r'\x1b\[[0-9;]*m', '', (OUT / 'source-suite-serial.txt').read_text())
files = sum(map(int, re.findall(r'Test Files\s+(\d+) passed', text)))
cases = sum(map(int, re.findall(r'Tests\s+(\d+) passed', text)))
assert (OUT / 'source-suite-serial.exit').read_text().strip() == '0'
assert files == 217 and cases == 2315
skipped = json.loads((OUT / 'skipped.json').read_text())
skipped.extend([
    {'item': '执行期间新增：升级预览丢关键词（silent-0217）', 'reason': '本批启动后入队，证据尚未核验；锁内知识冲突已触发停止，交下一批。'},
    {'item': '执行期间新增：勒紧后续格挡漏算（silent-0218）', 'reason': '本批启动后入队，证据尚未核验；锁内知识冲突已触发停止，交下一批。'},
    {'item': '执行期间新增：蛇咬施毒遗漏（silent-0219）', 'reason': '本批启动后入队，证据尚未核验；锁内知识冲突已触发停止，交下一批。'},
    {'item': '执行期间新增：codex不可用时暂停及引擎统计口径', 'reason': '太大：属于独立已授权架构和统计任务，本批只修纯bug，未混入。'},
])
merged = live.get('merged')
if not merged:
    conflicts = live.get('knowledge_conflicts', [])
    reason = (f"锁内检查发现 {len(conflicts)} 个知识文件双方改动后的 blob 不同，按任务要求停止；保留 live 最新数据。"
              if conflicts else f"合入流程受阻：{live.get('blocked')}；保留 live 数据。")
    skipped.append({'item': '合入 live', 'reason': reason})
report = {'task': 'fix-batch', 'base': '401bce0bdcafdf85983ec01d6e66f951886d4a1e',
          'fixes': [{'item': '已建模中毒仍触发攻击八折（silent-0216）', 'commit': commit,
                     'test': 'agent/tests/silent-poison-coverage.test.ts', 'fails_without_fix': True}],
          'skipped': skipped, 'merged': merged,
          'tests': {'tsc': 0, 'vitest': 0, 'cases': cases}}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
verification = json.loads((OUT / 'verification.json').read_text())
verification['final_source_suite'] = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases, 'file_parallelism': False}
verification['commit'] = commit
verification['source_tree'] = subprocess.check_output(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD^{tree}'], text=True).strip()
verification['live'] = live
(OUT / 'verification.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2) + '\n')
handoff = f'''# 本批纯 bug 修复交接

- 任务：20261007-081302-fix-batch；分支 fix-batch-20261007-081302。
- 基线 main 合并后：{report['base']}；唯一修复提交：{commit}。
- 修复：队列 2026-10-07 08:00 的已建模中毒仍触发攻击八折；仅补 POISON_POWER 模型覆盖声明。
- 证据与账本：silent-0216；K3676LU8B0UH SILENT A1 F17 T2，T3FW7R2R2306 SILENT A10 F8 T3/T4/T5。固定总伤害 23/18/13/23，不声称整场转胜。
- 红绿：撤源码 6 失败/1 通过，恢复 7 通过；相关两文件 17 例通过。未知增益仍保留原折扣，毒结算不变。
- 铁甲影响：共用敌人适配器对同型中毒局面也解除错误折扣，未导入其他角色知识；原因在提交内说明。
- 旧绷带用例的 23 伤害断言混入错误折扣，现限定原本验证的弃牌格挡和损血。原直接伤害观察不改写，新四个固定证据验证总伤害。
- 自测：最终 bash tools/test-sandbox.sh --no-file-parallelism 退出 0；tsc 0，{files} 文件/{cases} 例通过，保留固定排除名单，完整沙箱外检查待实际合入后的调度器。
- 原失败保留：source-suite.txt 两失败；source-suite-retry.txt 重复 maxWorkers 参数未执行测试；source-suite-final.txt 一个 20 秒多敌超时。rollout-load-retry.txt 与 target-options-load-retry.txt 分别单例通过；最终完整顺序套件通过。
- 源提交前 gitleaks 0；工作区干净。没有修改生成脚本，不重建知识数据。
- 账本：仅经项目根 learner/ledger.py/by=learner:fix-batch 给 silent-0216 追加提交号并置 proposed；首证/先验/claim/证据/历史保持，未标 shipped。
- live 流程：{json.dumps(live, ensure_ascii=False)}。
- 实际合入：{merged or '未合入'}；版本：{live.get('version') or '未分配'}。无实际代码上线时不写上线记录、不创建 eval 版本。
- 如未合入，请运维据 fix-done 先处理锁内列出的知识重叠，保留 live 最新经验与刷新表。此前未持锁记录预检还发现 decision-log.md 并行历史冲突；该旧预检不冒称最终锁内结果。按 live 流程兜底时保留双方原记录；实际发布后再经 ledger.py 登记 silent-0216 shipped。
- 旧 131 项提交逐项祖先核验见 already-fixed.json；已测旧发布与本批基线的 agent/src、agent/tests 完全一致，旧修复不重做。
- 队列未修改。独立静默 boss 校准与策略不混批；未补游戏机制或用药规则，未运行 play、停对局或推送。
- 开工队列快照保存在 queue-snapshot.md；执行期间新增的0217/0218/0219未核证，因锁内知识冲突已触发停止，交下一批。08:44 codex暂停和统计口径为独立已授权架构任务，不混本批。

```json
{json.dumps(report, ensure_ascii=False, indent=2)}
```
'''
(OUT / 'handoff-ops.md').write_text(handoff)
print(json.dumps({'commit': commit, 'merged': merged, 'files': files, 'cases': cases, 'version': live.get('version'), 'blocked': live.get('blocked')}, ensure_ascii=False))
