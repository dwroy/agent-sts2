import hashlib
import difflib
import importlib.util
import json
from pathlib import Path
import re
import subprocess

ROOT = Path('/home/dw/Projects/agent-sts2')
TREE = Path.cwd()
OUT = TREE / 'learner/runs/20261012-140819-fix-batch'
PRIOR = ROOT / 'paper/materials/20261012-1301-ops/fix-original'


def git(*args, cwd=TREE):
    return subprocess.check_output(['git', '-C', str(cwd), *args], text=True).strip()


def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


audit = json.loads((OUT / 'queue-commits.json').read_text())
base = audit['base']
assert git('rev-parse', 'HEAD') == base
assert not git('status', '--porcelain', '--untracked-files=all')
queue = (ROOT / 'notes/fix-queue-v4.md').read_bytes()
latest_queue_sha = hashlib.sha256(queue).hexdigest()
assert latest_queue_sha == '9d6fa7b6115f58898dc283813cac22f0a42a1cafa13666cfc303c7197c9a3830'
assert queue.startswith((OUT / 'queue-snapshot.md').read_bytes())
(OUT / 'queue-final-snapshot.md').write_bytes(queue)
(OUT / 'queue-late-addition.diff').write_text(''.join(difflib.unified_diff(
    (OUT / 'queue-snapshot.md').read_text().splitlines(True), queue.decode().splitlines(True),
    fromfile='initial-queue', tofile='final-queue')))
late_receipt = ROOT / 'paper/materials/20261012-1411-ops/host-failure-decision.json'
(OUT / 'late-item-host-failure-decision.json').write_bytes(late_receipt.read_bytes())
save('finalization-history.json', {
    'initial_guard_result': 'failed: queue changed during validation; no report was emitted',
    'initial_queue_sha256': audit['queue_sha256'], 'final_queue_sha256': latest_queue_sha,
    'new_item': 'ops-stall-recovery-test-subprocess-timeout',
    'source_receipt': str(late_receipt), 'source_receipt_sha256': hashlib.sha256(late_receipt.read_bytes()).hexdigest(),
    'review': '仅追加一项；原宿主4175过/2败/2跳过，同树定向3过；明确下一原槽承接，根因未证。',
})
assert (OUT / 'targeted-tests.exit').read_text().strip() == '0'
log = (OUT / 'targeted-tests.log').read_text()
files = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed', log)]
cases = [int(n) for n in re.findall(r'Tests\s+(\d+) passed', log)]
assert files == [7, 8] and cases == [60, 71], (files, cases)
report = json.loads((PRIOR / 'report.json').read_text())
report.update(base=base, fixes=[], merged=None, code_proposals=[], implementation_domains=[],
              tests={'tsc': 0, 'vitest': 0, 'cases': 71, 'files': 8, 'scope': 'fixed-targeted'},
              report=str(OUT / 'report.md'))
report['skipped'][2]['reason'] = ('证据不足：队列的VAC6Z1PZ1QJG/64VJC5XT2AT2 A10 F47证据未附可重放触发样本；'
                                '当前源码已保存分支/seed/资源诊断，沿原策略提案核实，不猜填HP/药水。')
report['skipped'].append({
    'item': 'ops-stall-recovery-test-subprocess-timeout（收尾时新增）',
    'reason': '证据不足：原宿主两项status=null超时，同树定向3项通过，负载根因未证；队列及原回执明确由本活批结束后的下一原槽承接，保留失败，不重复派发。',
})
save('report.json', report)

spec = importlib.util.spec_from_file_location('empty_fix_audit', TREE / 'ops/learner_checks.py')
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
live = git('rev-parse', 'HEAD', cwd=ROOT / '.worktrees/live')
differences = git('diff', '--name-only', base, live, '--', *checks.SOURCE_PATHS).splitlines()
empty = checks.verify_empty_fix(report, {'task': 'fix-batch', 'worktree': str(TREE)}, str(ROOT))
save('no-change-proof.json', {
    'base': base, 'head': git('rev-parse', 'HEAD'), 'live_readonly': live,
    'status': git('status', '--porcelain', '--untracked-files=all'),
    'diff_from_base': git('diff', '--name-only', base, 'HEAD'),
    'main_live_source_differences': differences, 'empty_fix_verification': empty,
})
save('test-receipt.json', {
    'command': 'SANDBOX_WORKERS=1 nice -n 19 bash agent/tools/test-sandbox.sh '
               'tests/compute-memo.test.ts tests/multi-character.test.ts tests/rollout-best-added.test.ts '
               'tests/blocked-experience-repair.test.ts tests/unassigned-proposal-resolution.test.ts '
               'tests/strategy-research-scheduling.test.ts tests/continuation-diagnostics.test.ts',
    'tmpdir': str(OUT), 'exit': 0, 'tsc': 0, 'threads': {'files': 7, 'cases': 60},
    'forks': {'files': 8, 'cases': 71}, 'unique': {'files': 8, 'cases': 71},
    'failure_retries': [], 'log_sha256': hashlib.sha256((OUT / 'targeted-tests.log').read_bytes()).hexdigest(),
    'note': '原沙箱入口fork阶段会重复传入的七文件过滤，另加paths；不重复计数，非失败重跑。',
})

review = f'''# 队列核对

基线：{base}。只读 live 祖先切点：{audit['live_readonly']}。
开工队列 SHA256：{audit['queue_sha256']}，与前批完整审计原件一致。收尾时追加ops-stall-recovery-test-subprocess-timeout，最终SHA256为{latest_queue_sha}；原快照、增量和新条目回执均保存。

历史159条来源记录均重新核为上述live祖先，149条也是本基线祖先；另外10条保留原源身份，main的等价集成沿原回执。全部映射见queue-commits.json，继承审计原件及SHA见prior-audit-reference.json。

当前24个关联路径去重后23个与前次审计字节相同；唯一变化的ops/codex-ops-learner.sh只新增roy-20261012-concrete-core-decklists白名单，相关research注册与29项固定Python测试已在源e28eeda814df8f6443a3b6f44f0fd3ab209732e9/等价main集成中交付。源差异与当前路径指纹均保存，不将该入口当牌表研究已完成。

本批直接核对：受阻零产出经验仍保留failed/retry但不误派补链；普通策略批回写仍验证角色、来源指纹、报告和实际live源码并保留租约；compute-memo父线程与真实worker使用固定知识；multi-character缺表/已有表场景使用固定隔离数据；rollout最佳线路使用固定模型/时钟且预算不变；额度恢复仍需窗口推进和两次稳定采样；升阶只采实际ascension；会话前恢复限定无输出/纯ENOENT与原租约。原诊断源码仍拒绝伪造接续资源，队列原证据缺触发样本，沿既有提案处理。

本批没有发现可新增实现的纯bug，不撤销已上线修复制造红绿结果。既有策略及独立功能沿原队列，未重复登记提案或派下级agent。没有更改队列、学习账本、版本、上线记录或live，也没有源码提交；所有新文件仅在指定scratch。

收尾新增条目：当前ops-stall-recovery.test.ts确有spawnSync的5000ms期限。原回执记录宿主两次status=null，同树单worker三项全过，未证明负载根因；回执next_owner明确为current batch之后的existing ordinary fix queue，队列点名当前140741活批不抢占。本批仅核源码和回执，按该明确归属交下一原槽，不放宽断言、生产轮询或篡改失败历史。它不计入本批八文件验证结果。

测试用原test-sandbox.sh带七文件过滤，SANDBOX_WORKERS=1、nice、指定TMPDIR与离线npm。tsc0，threads七文件60例，forks八文件71例，去重八文件71例；后段重复是入口原行为，不是失败重跑。测试使用固定夹具，不连接LLM/网络。未运行完整套件，未改代码所以不存在提交前完整自测或撤码验证。本批首次README读取前沙箱构建遇到并行消失目录ENOENT；同一只读命令重试成功，未放宽权限。

HEAD仍等于base且工作树干净。严格空批验收返回{json.dumps(empty)}；只读比较发现本基线/live有{len(differences)}处既有源码路径差异，保存在no-change-proof.json。这个事实不伪装成已合入，不修改验收门槛或调度状态。
'''
(OUT / 'queue-review.md').write_text(review)
lines = ['## 修 bug 回报', '', f'- 合并基线：main → {base}',
         '- 修复（每条一行）：无新增纯 bug 修复；撤掉修复的红绿验证不适用。']
for item in audit['items']:
    note = '' if item['base_ancestor'] else '；原源为live祖先，main沿既有等价集成记录'
    lines.append(f"- 已被别人修掉的：{item['item']} — {item['commit']}{note}")
for item in report['skipped']:
    lines.append(f"- 没修的：{item['item']} — {item['reason']}")
lines += ['- 测试：tsc退出码0；定向vitest去重8文件/71用例/退出码0。无失败重跑，非完整套件；入口两阶段累计执行131例。',
          f'- 合入：未合入（无新增源码；严格空批核验仍因既有{len(differences)}处main/live差异返回null，未伪造合并）。',
          '- 需要 Roy 定的事（没有写「无」）：无', '', '```json', json.dumps(report, ensure_ascii=False, indent=2), '```', '']
(OUT / 'report.md').write_text('\n'.join(lines))
print(json.dumps({'report': report['report'], 'tests': report['tests'],
                  'empty_fix_verification': empty, 'existing_source_differences': len(differences)}, ensure_ascii=False))
