import hashlib
import json
import pathlib
import subprocess

OUT = pathlib.Path(__file__).parent
ROOT = pathlib.Path('/home/dw/Projects/agent-sts2')
SOURCE = ROOT / '.worktrees/codex-dev'
LIVE = ROOT / '.worktrees/live'
META = json.loads((OUT / 'live-merge.json').read_text())
assert META['test_rc'] == 0 and META['release_commit'] and META['eval_version']
subprocess.run(['date'], check=True)
subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', META['merged'], 'HEAD'], check=True)
assert not subprocess.check_output(['git', '-C', str(SOURCE), 'status', '--porcelain'], text=True)
for name in ['gitleaks-source.log', 'gitleaks-live-merge-history.log', 'gitleaks-live-release.log']:
    assert 'no leaks found' in (OUT / name).read_text()

BASE = 'e45aa0e18c164308fcce0efd7ae0410b6eef7751'
TEST = 'agent/tests/silent-finale-selection.test.ts'
ITEM = '生成牌即时评分遗漏华丽收场的空抽牌堆条件（silent-0197）'
report = {'task': 'fix-batch', 'base': BASE,
          'fixes': [{'item': ITEM, 'commit': META['source_commit'], 'test': TEST, 'fails_without_fix': True}],
          'skipped': json.loads((OUT / 'skipped.json').read_text()), 'merged': META['merged'],
          'tests': {'tsc': 0, 'vitest': 0, 'cases': META['live_tests']['cases']}}
(OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
text = (f'## 修 bug 回报\n\n- 合并基线：main → {BASE}\n'
        f'- 修复（每条一行）：{ITEM} — {META["source_commit"]} — 测试 {TEST}: VPW F39 T1: the generated-card pick no longer auto-selects the unusable 60-damage offer — 去掉修复时失败：是（撤源4失败/5通过，恢复新9例和相关3文件189例通过）；证据Y6GM2CHWJBEY F17第二次T1、VPW8YH7A4QFM F39 T1。\n'
        f'- 已被别人修掉的：126项 — 已修，逐项提交见 {OUT}/already-fixed.md；全部为基线/main/live祖先，本批未重复修复。\n'
        '- 没修的：永冻首次能力7挡（silent-0172） — 太大，跨帧/续行/重启/SL状态专项；mod超时和Codex缓存实测 — 证据不足；boss模拟性能 — 太大；策略项 — 策略类。\n'
        f'- 测试：源与合后tsc退出码0；vitest各{META["live_tests"]["files"]}文件 / {META["live_tests"]["cases"]}用例 / 退出码0，沙箱套件首轮通过、无超时重跑。新测试初稿断言错误两次修正重跑，原失败日志保留。\n'
        f'- 合入：{META["merged"]}；发布{META["release_commit"]} / {META["eval_version"]}，决策日志双方追加原文保留、知识blob保持，运维交接handoff-ops.md。\n'
        '- 需要 Dai 定的事：保血、留药、boss时钟校准、路线预估、休息点选择、小偷优先、A10第三幕第二boss、无色牌估值；全死排序/巨兽拖延、SL范围、懒惰估值沿原专项。\n')
(OUT / 'report.md').write_text(text + '\n```json\n' + json.dumps(report, ensure_ascii=False, indent=2) + '\n```\n')
handoff = (f'# 收场即时评分修复运维交接\n\n任务20261007-011302-fix-batch；来源fix-queue-v4 2026-10-07 01:07、notes/lessons.md:5186及勘误、账本silent-0197。'
           f'源码{META["source_commit"]}（{META["branch"]}），实际live代码{META["merged"]}，发布{META["release_commit"]}，唯一eval {META["eval_version"]}。\n\n'
           '请据fix-done完成事件确认实际合入，再经learner/ledger.py/by=ops仅登记silent-0197 shipped及对应版本。学习者只追加proposed和提交去向；first_run=Y6GM2CHWJBEY/A0、prior=no、claim/support/历史保持。'
           '旧0110/0111机制与0198联合遗物观察独立，不混记本项，不重复登记其他旧shipped。完整沙箱外tsc + vitest由本批调度器补跑，沙箱通过不冒报完整通过。\n\n'
           '固定日志：Y6GM2CHWJBEY F17第二次T1，15:00:33.366Z选择/15:00:50.668Z入手不可打；VPW8YH7A4QFM F39 T1，16:17:39.441Z选择/16:17:41.620Z入手不可打。'
           '当前堆16/33张，旧群伤评分180/60；后者猎杀者评分15，收场实际0行动伤害。修复只给静默战内选择传空/非空事实，非空收场伤害0；保留所有Jev选项，空堆/未知及铁甲/其他牌沿旧行为，未声称替代整场能赢。\n\n'
           f'撤两处源码4失败5通过/exit1，恢复新9例及相关3文件189例通过。源及合后沙箱tsc0/vitest0，各{META["live_tests"]["files"]}文件{META["live_tests"]["cases"]}例首轮通过，无高负载超时重跑。'
           '初稿误用ranking字段及空弃牌堆断言的两次失败、首次预合并因追加日志冲突停止的历史全部归档；不把初稿失败改写成通过。\n\n'
           f'锁内合前{META["base"]}，本批没有新知识刷新待提交；上一经验发布的知识逐blob保持，知识重叠0，无生成器改动无需重建。'
           'decision-log冲突仅共同前缀后的追加，保留main与live每个原始字节并已核对；未丢经验.2/版本/历史记录或后台未提交notes。四个修复源码/测试blob与已测源一致；gitleaks源、合并历史、发布扫描均0。\n\n'
           '126项旧修复见already-fixed.md/json；永冻0172跨帧/续行/重启/SL首次触发专项，mod/Codex实测证据不足、模拟性能专项及Dai策略项保持，队列未修改。'
           '修复工作树干净，live后台notes原样保留；未停止对局、未运行play、未推送。全部原始证据、测试、预检、发布元数据、核对与回报在本目录。\n')
(OUT / 'handoff-ops.md').write_text(handoff)
tests = json.loads((OUT / 'tests.json').read_text())
tests['live'] = META['live_tests']
tests['complete_external_checks'] = '由调度器在沙箱外补跑，未冒报通过'
(OUT / 'tests.json').write_text(json.dumps(tests, ensure_ascii=False, indent=2) + '\n')
manifest = {}
for path in sorted(OUT.iterdir()):
    if path.is_file() and path.name != 'manifest.json':
        data = path.read_bytes()
        manifest[path.name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('回报与运维交接已保存：' + str(OUT))
