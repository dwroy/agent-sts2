import json
import re
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
SCRATCH = ROOT / 'learner/runs/20261007-024302-fix-batch'
LIVE = ROOT / '.worktrees/live'
BASE = '9b134d61e7cf4b4be2af6bbb51a57f72e315242b'
REPLAY = '1ab1ba8dc446e5a12dec0396528c9b2a5b478fe8'
META = '129853b817c0e985e222b09385a9bfeb0562ec7f'

subprocess.run(['date'], check=True)
release = json.loads((SCRATCH / 'live-result.json').read_text())
assert not release.get('error') and release['sandbox_exit'] == 0 and release['merged']
for commit in [REPLAY, META, release['merged'], release['release']]:
    subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', commit, 'HEAD'], check=True)
log = SCRATCH / ('live-suite-retry.txt' if release.get('timeout_retry') else 'live-suite.txt')
text = log.read_text()
files = sum(map(int, re.findall(r'Test Files\s+(\d+) passed', text)))
cases = sum(map(int, re.findall(r'Tests\s+(\d+) passed', text)))
assert files > 0 and cases > 0
fixes = [
    {'item': '重放附魔的额外打出漏入跨回合凋萎累计（silent-0199；DPYF2BAA3DKT F48末次T1/T7）',
     'commit': REPLAY, 'test': 'agent/tests/silent-wither-replay.test.ts', 'fails_without_fix': True},
    {'item': '羽化生成到抽牌堆被误算为即时抽牌（silent-0202；C48LLXBGKXQ9 F24 T1/HUVEPWQAHWFU F35 T2）',
     'commit': META, 'test': 'agent/tests/silent-metamorphosis.test.ts', 'fails_without_fix': True},
]
skipped = json.loads((SCRATCH / 'skipped.json').read_text())
report = {'task': 'fix-batch', 'base': BASE, 'fixes': fixes, 'skipped': skipped,
          'merged': release['merged'], 'tests': {'tsc': 0, 'vitest': 0, 'cases': cases}}
(SCRATCH / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
lines = ['## 修 bug 回报', '', f'- 合并基线：main → {BASE}',
         f'- 修复：{fixes[0]["item"]} — {REPLAY} — 测试 agent/tests/silent-wither-replay.test.ts:F48 final T7: Skewer reaches the thirtieth play and the complete loss is thirty-five, not twenty-six — 去掉修复时失败：是（9失败/1通过，恢复相关50例通过）',
         f'- 修复：{fixes[1]["item"]} — {META} — 测试 agent/tests/silent-metamorphosis.test.ts:$run: generated attacks are not three immediate draws — 去掉修复时失败：是（2失败/2通过，恢复4例通过）；台账占位提交已追补正式提交勘误',
         f'- 已被别人修掉的：永冻首次能力7挡 — 157d635c；收场使用条件 — 62b0e23f；其余126项及各提交见 [128项核对清单]({SCRATCH}/already-fixed.md)',
         '- 没修的：mod请求超时自愈 — 证据不足，根因未定位；Codex缓存实测 — 证据不足，离线无法受控实测；boss模拟性能/样本不足 — 太大，需独立专项；策略取舍 — 策略类',
         f'- 测试：源及合后tsc退出码0；最终沙箱vitest {files}文件/{cases}用例/退出码0。羽化源自测213文件2279例；最终源自测214文件2289例。初稿卡牌索引及复活损伤字段断言修正后重跑通过；' + ('合后超时同树重跑一次，详见live-suite-retry.txt' if release.get('timeout_retry') else '无超时重跑') + '。沙箱外完整套件交调度器补跑',
         f'- 合入：live发布 {release["release"]}（代码合入 {release["merged"]}；{release["version"]}；运维交接已落盘）',
         '- 需要Dai定的事：保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息回血或锻造、小偷优先级、A10第三幕第二boss、无色牌估值、懒惰平均出牌估值']
(SCRATCH / 'report.md').write_text('\n'.join(lines) + '\n\n```json\n' + json.dumps(report, ensure_ascii=False, indent=2) + '\n```\n')
handoff = (f'本批20261007-024302-fix-batch完成，来源分支{release["branch"]}。\n\n'
           f'- 源码：羽化 {META}；重放累计 {REPLAY}。\n'
           f'- 实际代码合入：{release["merged"]}；固定发布：{release["release"]}；树：{release["release_tree"]}；版本：{release["version"]}。\n'
           f'- 原始证据：0199＝DPYF2BAA3DKT SILENT A10 F48末次T1/T7；0202首证＝C48LLXBGKXQ9 SILENT A0 F24 T1，支持HUVEPWQAHWFU A10 F35 T2。\n'
           f'- 源每提交及合后沙箱tsc/vitest0，合后{files}文件{cases}例；红绿与初稿错误原日志均保留。\n'
           '- 仅CLI/by=learner:fix-batch追加silent-0199/silent-0202 proposed及真实源码提交；请运维根据fix-done核实际合入后CLI登记shipped与本版本。\n'
           '- 0202第一次where.commits误写a-placeholder，已CLI明确占位无效并追加正式提交，原历史保留，请勿把占位当源码提交。0200/0203等独立机制条目与既有首证/先验/历史不重置。\n'
           '- 请调度器对固定发布树补跑沙箱外完整tsc+vitest并发learner-checks；不把沙箱通过当完整外部结案。\n'
           f'- 刷新提交：{release.get("refresh_commit") or "本轮无新增刷新需提交"}；合前/回退目标：{release["rollback_target"]}；知识重叠：{release["knowledge_overlap"]}；已提交知识blob保持；无生成器修改，不重建。\n'
           '- 仅decision-log并行追加冲突已保留双方全部非空行及重复次数；队列未修改，不停对局、不运行play、不推送。\n')
(SCRATCH / 'handoff-ops.md').write_text(handoff)
tests = json.loads((SCRATCH / 'tests.json').read_text())
tests['live'] = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases, 'timeout_retry': bool(release.get('timeout_retry'))}
(SCRATCH / 'tests.json').write_text(json.dumps(tests, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'merged': release['merged'], 'release': release['release'], 'version': release['version'], 'files': files, 'cases': cases}, ensure_ascii=False))
