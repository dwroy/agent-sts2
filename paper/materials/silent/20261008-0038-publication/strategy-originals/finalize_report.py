import json
import re
import subprocess
from pathlib import Path

p = Path(__file__).resolve().parent
tree = p.parents[2]
root = Path('/home/dw/Projects/agent-sts2')
base = 'd4ec5b6d867bbc11e38cc336e54081569e20f223'
source = (p / 'source-commit.txt').read_text().strip()
assert source != base and re.fullmatch('[0-9a-f]{40}', source)
assert (p / 'pre-commit-sandbox.rc').read_text().strip() == '0'
assert (p / 'accounting-withdrawn.rc').read_text().strip() == '1'
assert (p / 'accounting-restored.rc').read_text().strip() == '0'
assert (p / 'resources-restored.rc').read_text().strip() == '0'
assert (p / 'live-merge-preview.rc').read_text().strip() == '1'
assert subprocess.check_output(['git', '-C', str(tree), 'status', '--porcelain'], text=True).strip() == ''
rows = json.loads((p / 'proposal-results-draft.json').read_text())
for row in rows:
    if row['id'] == 'silent-proposal-5a40291d1a3e80ca':
        row.update(state='waiting', reason=f'离线分账源码已提交{source}，撤源码7错误/恢复15例与原沙箱tsc/vitest通过；锁内整枝预检有20个并行记录冲突，按要求停止，尚无实际live祖先及合后检查证据。保留源码，交运维兜底后再登记implemented/shipped。', source_commit=source)
queue = json.loads((p / 'dispatched-proposals.json').read_text())
ids = sorted(set(i for item in queue.values() for i in item['ledger']))
updates = []
for ident in ids:
    update = {'id': ident, 'by': 'learner:strategy-proposal', 'status': 'proposed',
              'where': {'proposal': [str(p / 'proposal.md'), str(p / 'report.md')]},
              'note': '本次20261008-000408逐项处置及限制见report.md；本地1项离线源码、1项实际live重复、8项证据不足。尚未新合入live，不登记shipped，保留旧首证/先验/支持/重复与既往上线历史。'}
    if ident == 'silent-0039':
        update['where']['commits'] = [source]
        update['note'] += ' 本批源码只补离线HP分账，固定F31 T8只见34下限/净差35，最后1血死亡帧缺失；不是改变杀序或模拟机制。'
    updates.append(update)
(p / 'ledger-updates.jsonl').write_text(''.join(json.dumps(u, ensure_ascii=False) + '\n' for u in updates))
conflict_lines = (p / 'live-merge-preview.txt').read_text().splitlines()
conflicts = sorted({line.split('\t', 1)[1] for line in conflict_lines if line.startswith('100644 ') and '\t' in line})
assert len(conflicts) == 20
before = (p / 'live-before-merge.txt').read_text().strip()
after = (p / 'live-after-preflight.txt').read_text().strip()
assert before == after
assert (p / 'knowledge-overlap.txt').read_text() == ''
refresh = (p / 'live-refresh-commit.log').read_text().strip() if (p / 'live-refresh-commit.log').exists() else '没有待提交的知识刷新'
log = (p / 'pre-commit-sandbox.log').read_text()
file_counts = [int(s) for s in re.findall(r'Test Files\s+(\d+) passed', log)]
test_counts = [int(s) for s in re.findall(r'Tests\s+(\d+) passed', log)]
report = {'task': 'strategy-proposal', 'base': base,
          'runs': ['CA5KE8GFJ9X2', '61E2QS63Y9WU', '5PM6JAQG6FNQ', 'DUZUBAJ3A8GP',
                   '8JRE1C4H4Z2W', 'YF0LXT1QSTGG', 'XP2SL33HT0D9'],
          'fixes': [{'id': 'silent-proposal-5a40291d1a3e80ca', 'ledger': ['silent-0039'],
                     'commit': source, 'description': '离线可见扣血、净活敌血差与新增/复活HP分账，缺帧保留未知；源码已提交，待实际live合入。'}],
          'skipped': [r for r in rows if r['id'] != 'silent-proposal-5a40291d1a3e80ca'],
          'commit': source, 'merged': None, 'version': None,
          'tests': {'tsc': 0, 'vitest': 0, 'cases': 15, 'sandbox': 0,
                    'sandbox_files': sum(file_counts), 'sandbox_cases': sum(test_counts),
                    'new_cases': 8, 'withdrawn': 1, 'restored': 0, 'post_merge': None},
          'code_proposals': list(queue), 'implementation_domains': ['combat'],
          'proposal_results': rows, 'merge_blocked': {'live': before, 'conflicts': conflicts,
                                                     'actual_merge_executed': False},
          'report': str(p / 'report.md')}
(p / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(p / 'proposal-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
table = '\n'.join(f"| {r['id']} | {r['state']} | {r.get('commit', r.get('source_commit', '—'))} | {r['reason']} |" for r in rows)
stamp = (p / 'report-time.txt').read_text().strip()
text = f'''# 静默猎手策略任务回报

生成时间：{stamp}。调度batch 20261008-000408；任务scratch 20261008-000409。工作树：{tree}。完整base：{base}。

完成1项离线源码、1项实际live重复核验；8项因逐项列明的证据/记录缺口保留waiting。新源码已提交但整枝合入受20个并行记录冲突阻挡，按任务要求停止，merged=null。未执行live merge，未造eval版本、未写虚假上线记录、未标shipped；没有合后测试或完整沙箱外结果。本批不会声称已发布。工作树提交后干净。

## 源码与证据

- 提案silent-proposal-5a40291d1a3e80ca，账本silent-0039，证据XP2SL33HT0D9 / A10 / F31 / T1—8。源码提交：{source}。
- T1实见扣血25、净活敌血差4、新增HP21；T4实见42、净差21、观察到0→21复活。T3/T5缺中间死亡帧，完整伤害未知，下限28/27和观测增量18/17分开。T8主怪1血直接退场，保守下限34、净差35、最后1血缺帧；不以推演补齐。玩家48→25净损23与原空药栏保持。
- 43帧逐一核对原日志；新增审计仅进入已存在的离线resource_chain.py，在线源码没有引用该工具。唯一类型按类型/最大血量对齐索引重排，同类型多实体保留数组并标未知；全部damage_total=null，保持资源原字段和其他角色输出。
- 详细提案、每项来源任务、证据、反例、拟合/时间切分限制、验证及回退见proposal.md；保存原稿见saved-proposal-manifest.json，原件未重写。发现样本1局，不推整战胜率或未观察机制。

## 验证

- 固定Python新增8例：撤生产源码7错误、1通过、exit1；恢复8例通过，原资源7例也通过，共15例，exit0。红/绿日志完整保留。初次观察数量40写错导致1失败，按实际窗口止于278009更正为39；原日志accounting-first.log保留，其他资源/扣血断言未放宽。
- 原入口agent/tools/test-sandbox.sh，SANDBOX_WORKERS=1，tsc/vitest/总退出0；两阶段共{sum(file_counts)}文件、{sum(test_counts)}例。日志pre-commit-sandbox.log与rc原件保留。未超时，无超时重跑。不把沙箱选定套件冒称沙箱外完整检查。
- 与base版比较，silent原资源字段全部相同；只改角色元数据的结构夹具上ironclad完整输出相同，未读取其他角色知识。见resource-field-equivalence.json。
- 提交前gitleaks扫描暂存diff无泄漏；未联网、未调用LLM/游戏、未安装依赖、未推送。

## 合入受阻与运维交接

按live-merge.lock锁内流程等知识刷新，先提交已刷新的知识数据，刷新数据与本次3文件源码无重叠。刷新提交回执如下（保留所有刷新，提交前gitleaks无泄漏）：

```
{refresh}
```

记下刷新之后、合入之前live={before}，整枝merge-tree预检exit1，20个记录文件冲突，未执行git merge，live随后仍{after}。没有MERGE_HEAD、没有回退操作，也没有覆盖并行复盘/台账/论文数据。原预检live-merge-preview.txt、冲突路径和live状态均保存。合后沙箱与版本登记因未合入而未执行。

可兜底的独立源码范围只有learner/resource_chain.py、learner/tests/test_enemy_hp_audit.py、learner/tests/silent-summon-hp-evidence.json。运维需保留当前live记录，在独立集成流程实际吸收本提交并补合后检查，核真实源码祖先后才登记implemented/shipped。纯离线工具不改变对局行为，无需新eval行为版本或Roy规则变更双通知。proposal.md与本报告是给运维的完整交接；未调用消息发送工具或修改运维prompt。

学习账本更新请求ledger-updates.jsonl仅经根目录learner/ledger.py update追加：by=learner:strategy-proposal、status=proposed；不直接改账本。CLI回执和check结果另存本目录，旧首证/先验/证据/重复/历史版本不改。专用提案沿原CLI登记ID消费，不重复登记相同请求；最终队列处置交标准完成验收，源码未成为live祖先之前5a40保持waiting。

## 每个派发ID的最终处置

| ID | 状态 | 源码提交 | 理由与限制 |
|---|---|---|---|
{table}

## 冲突文件

''' + '\n'.join('- ' + path for path in conflicts) + '\n\n最终结构化回报：report.json。所有源码、失败日志、初稿与缺数据均保留。\n'
(p / 'report.md').write_text(text)
(p / 'handoff-ops.md').write_text(f'源码已提交{source}，自测0，20个整枝记录冲突使merge=null；请保留并行记录兜底，不先标implemented/shipped。\n\n提案：{p / "proposal.md"}\n\n报告：{p / "report.md"}\n\n独立源码：3文件；证据XP2SL33HT0D9 A10 F31 T1—8、账本silent-0039。纯离线工具无eval行为版本。逐项10提案处置在report.json。\n')
print(json.dumps({'source_commit': source, 'merged': None, 'proposal_results': len(rows),
                  'ledger_updates': len(updates), 'report': str(p / 'report.md')}, ensure_ascii=False))
