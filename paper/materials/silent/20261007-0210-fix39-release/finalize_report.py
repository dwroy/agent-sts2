import json
import pathlib
import subprocess

OUT = pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-014302-fix-batch')
SOURCE = pathlib.Path('/home/dw/Projects/agent-sts2/.worktrees/codex-dev')
LIVE = pathlib.Path('/home/dw/Projects/agent-sts2/.worktrees/live')
BASE = '1ad74473cf57b59da149661ea116fcae0803d497'
m = json.loads((OUT / 'live-merge.json').read_text())
assert m['test_rc'] == 0 and m['merged'] and m['release_commit']
assert m['refreshed_blobs_preserved'] and m['untouched_knowledge_blobs_preserved']

def git(*args, cwd=SOURCE):
    return subprocess.check_output(['git', '-C', str(cwd), *args], text=True).strip()

paths = git('diff', '--name-only', BASE, m['source_commit']).splitlines()
assert len(paths) == 9 and all(p.startswith('agent/') for p in paths)
assert not git('status', '--porcelain'), 'source worktree must be clean'
for path in paths:
    assert git('rev-parse', m['source_commit'] + ':' + path) == git('rev-parse', m['release_commit'] + ':' + path, cwd=LIVE), path
versions = json.loads((LIVE / 'eval/versions.json').read_text())['versions']
entries = [v for v in versions if v['name'] == m['eval_version']]
assert len(entries) == 1 and entries[0]['commit'] == m['merged'] and entries[0]['family'] == 'Silent'
assert subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', m['source_commit'], m['release_commit']]).returncode == 0
assert subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', m['base'], m['release_commit']]).returncode == 0
assert git('diff', '--name-only', m['base'], m['release_commit'], '--', 'knowledge', cwd=LIVE) == ''
old = json.loads((OUT / 'already-fixed.json').read_text())
for entry in old:
    assert subprocess.run(['git', 'merge-base', '--is-ancestor', entry['commit'], m['source_commit']]).returncode == 0, entry['item']
cli = ['python3', '/home/dw/Projects/agent-sts2/learner/ledger.py']
ledger = json.loads(subprocess.check_output(cli + ['show', 'silent-0172']))
assert ledger['status'] == 'proposed' and m['source_commit'] in ledger['where']['commits']
assert subprocess.check_output(cli + ['show', 'silent-0173']) == (OUT / 'silent-0173-before.json').read_bytes()
(OUT / 'verification.json').write_text(json.dumps({
    'base': BASE, 'source': m['source_commit'], 'merged': m['merged'], 'release': m['release_commit'],
    'version': m['eval_version'], 'source_clean': True, 'source_paths': paths,
    'source_release_blobs_equal': True, 'refresh_preserved': True, 'already_fixed': len(old),
    'ledger_0172': 'proposed', 'ledger_0173_unchanged': True,
    'source_tests': m['source_tests'], 'live_tests': m['live_tests'],
    'live_uncommitted': git('status', '--porcelain', cwd=LIVE)
}, ensure_ascii=False, indent=2) + '\n')
fix = {'item': '永冻首次能力7挡未进入模型（silent-0172）', 'commit': m['source_commit'],
       'test': 'agent/tests/silent-permafrost.test.ts', 'fails_without_fix': True}
report = {'task': 'fix-batch', 'base': BASE, 'fixes': [fix],
          'skipped': json.loads((OUT / 'skipped.json').read_text()), 'merged': m['merged'],
          'tests': {'tsc': 0, 'vitest': 0, 'cases': m['live_tests']['cases']}}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(OUT / 'handoff-ops.md').write_text(f"""# 永冻首次能力格挡修复运维交接

任务20261007-014302-fix-batch，来源fix-queue-v4 2026-10-06 11:33、账本silent-0172；独立机制0173保持原shipped/S1.exp42。
源码{m['source_commit']}（fix-batch-20261007-014302），实际live代码{m['merged']}，固定发布{m['release_commit']}，唯一eval {m['eval_version']}。

请据fix-done完成事件核实实际合入及版本，再经learner/ledger.py/by=ops仅将silent-0172登记shipped，并追加实际live/发布提交去向。学习者仅追加proposed和源码提交。0172 first_run=25226ZFLNR1J/A10、prior=no、claim/evidence/原历史均保持。0173 first_run=10GPK5XGHCK3/A3、prior=yes及旧shipped/S1.exp42完全未改，不混登记。完整沙箱外tsc + vitest由本批调度器补跑；此处只声明沙箱套件通过。

证据25226ZFLNR1J SILENT A10 F29 T1首次Footwork 0→7挡；PJ2LL9KU7FHD SILENT A10 F17第3次T4首次Phantom Blades 0→7，敏捷药水后两防御各7，共21抵21、57HP不变。测试夹具为这两局18帧，固定知识和模型数据；不依赖刷新的knowledge。跨帧、续行、日志回放、SL重置及跨回合rollout携带首次触发状态；续行不重算已有格挡。历史不完整/计数缺失/跨过未观察回合时不给未验证奖励，重放触发显式列未知。未验证重复触发和整场转胜，不添加自己的游戏知识或策略。

最终撤掉6处生产接线及推演源码后6失败6通过/exit1；恢复新12例及相关3文件28例通过。源码与合后沙箱tsc0/vitest0，各{m['live_tests']['files']}文件{m['live_tests']['cases']}例首轮通过（若发生超时重跑，以live-merge.json为准）。初稿类型导入、断言字段及抽牌夹具错误、第一轮红5失败和最终红6失败日志原样保留；未把初稿失败报成通过。

锁内先提交刷新{m['refresh_commit']}，合前{m['base']}，incoming knowledge为空、重叠0，知识所有blob保持，无生成器改动不重建。合入无冲突，live后台notes未覆盖。9个修复源码/夹具/测试blob与已测发布完全相同；gitleaks源码/刷新/发布均0。铁甲与无遗物数值保持等价，不修改保血、留药、时钟、路线、休息、SL策略、选项过滤或最优/并列规则。

127项旧修复逐项提交见already-fixed.md/json；其余mod自愈与缓存实测证据不足、boss性能太大及策略事项见skipped.json，交调用方处理。队列未编辑；git合入的队列历史仅来自授权main基线。工作树干净，不停对局、不运行play、不推送。源码、红绿、沙箱、刷新、合入、上线记录、eval版本、账本核对和原历史均保存在本任务目录。
""")
summary = f"""## 修 bug 回报
- 合并基线：main → {BASE}
- 修复（每条一行）：永冻首次能力漏7挡（0172；25226ZFLNR1J F29 T1、PJ2LL9KU7FHD F17第3次T4） — {m['source_commit']} — 测试 agent/tests/silent-permafrost.test.ts:PJ2 F17 attempt 3 T4: Phantom Blades and two potion-adjusted Defends give 21 Block and zero loss — 去掉修复时失败：是（6失败；恢复12通过）
- 已被别人修掉的：127项 — 已修，逐条提交见[核查清单]({OUT}/already-fixed.md)
- 没修的：mod超时自愈、Codex缓存实测 — 证据不足；boss模拟性能 — 太大；策略项 — 策略类
- 测试：源码及live各tsc退出码0；vitest {m['live_tests']['files']}文件/{m['live_tests']['cases']}用例/退出码0，首轮通过
- 合入：{m['merged']}；发布{m['release_commit']} / {m['eval_version']}；0172待运维登记shipped
- 需要 Roy 定的事：保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第三幕第二boss、无色牌估值、懒惰平均出牌估值

```json
{json.dumps(report,ensure_ascii=False,indent=2)}
```
"""
(OUT / 'report.md').write_text(summary)
print('固定发布核对通过；运维交接、回报和验证数据已落盘。')
