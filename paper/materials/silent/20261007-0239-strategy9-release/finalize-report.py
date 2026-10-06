import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
SCRATCH = ROOT / 'learner/runs/20261007-021220-strategy-proposal'
DEV = ROOT / '.worktrees/codex-dev'
LIVE = ROOT / '.worktrees/live'
SOURCE = 'b66dd5514d48ee7b430e0d4cf5ea9449106d94d8'
BASE = '7d2fd04143226df74f2d4b77cf18764c1fe801ac'
RUNS = '5X2GHKJ89PN1 TCFAHJ9K19VY LS8035TB32P3 L704TLETMZBM KUZVERN40NGK BVF22RSFVBS9 ZVYUL2YP3518 VPW8YH7A4QFM DPYF2BAA3DKT CRK2HNYKSCZC'.split()

result = json.loads((SCRATCH / 'live-result.json').read_text())
assert result['merged'] and result['version'] and result['tests']['sandbox_exit'] == 0
assert result['source_blobs_equal'] and result['knowledge_blobs_equal_after_tests']
paths = ['agent/src/sim/build-sim-facts.ts', 'agent/tests/silent-rest-sim-hp.test.ts', 'agent/tests/silent-rest-sim-hp-evidence.json']
def git(cwd, *args):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()
for path in paths:
    assert git(DEV, 'rev-parse', f'{SOURCE}:{path}') == git(LIVE, 'rev-parse', f"{result['release']}:{path}")
assert git(DEV, 'status', '--porcelain') == ''
subprocess.run(['git', 'merge-base', '--is-ancestor', SOURCE, result['release']], cwd=DEV, check=True)
versions = json.loads((LIVE / 'eval/versions.json').read_text())['versions']
matching = [v for v in versions if v['name'] == result['version']]
assert len(matching) == 1 and matching[0]['commit'] == result['merged']

def counts(name):
    assert (SCRATCH / (name + '.exit')).read_text().strip() == '0'
    text = (SCRATCH / (name + '.log')).read_text()
    files = sum(int(n) for n in re.findall(r'Test Files\s+(\d+) passed', text))
    cases = sum(int(n) for n in re.findall(r'Tests\s+(\d+) passed', text))
    assert files and cases
    return dict(tsc=0, vitest=0, files=files, cases=cases)
source_tests = counts('source-suite')
live_tests = counts('live-suite')
assert source_tests == live_tests
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
update = dict(id='silent-0201', status='proposed', by='learner:strategy-proposal',
    where=dict(commits=[SOURCE, result['source'], result['merged'], result['release']]),
    note=f"实际live合入{result['merged']}、发布{result['release']}／{result['version']}；源与合后固定沙箱tsc/vitest0，各{live_tests['files']}文件{live_tests['cases']}例首过。撤源码6失败3通过／恢复9通过。首次仅decision-log预检冲突且未合源码，原件initial-live保留；正常同步main后无冲突。七项刷新2ab4b349逐blob保持、知识重叠空，无生成器改动。0201保持proposed，交运维据strategy-done及handoff-ops.md核实际合入后CLI shipped，完整外部交调度器。")
(SCRATCH / 'ledger-final-update.json').write_text(json.dumps(update, ensure_ascii=False) + '\n')
completed = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'update'], input=json.dumps(update, ensure_ascii=False), text=True, capture_output=True, check=True)
(SCRATCH / 'ledger-final-update.log').write_text(completed.stdout + completed.stderr)
completed = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'show', 'silent-0201'], text=True, capture_output=True, check=True)
(SCRATCH / 'ledger-final.json').write_text(completed.stdout)
assert json.loads(completed.stdout)['status'] == 'proposed'
completed = subprocess.run(['python3', str(ROOT / 'learner/ledger.py'), 'check'], text=True, capture_output=True, check=True)
(SCRATCH / 'ledger-check.log').write_text(completed.stdout + completed.stderr)

skipped = [
  '整体保血／全死权重、固定击杀顺序、巨兽拖延、SL范围及探索阈值、统一路线／休息血线、完整输出／存活时钟校准：缺受控替代或阈值证据。',
  '其他遗物联动和未模拟休息动作：缺本项验证证据，不扩展；药水不加入提前或留药代码规则。',
]
report = dict(task='strategy-proposal', base=BASE, runs=RUNS,
    fixes=[dict(id='silent-0201', proposal=str(SCRATCH / 'proposal.md'), commit=SOURCE,
        evidence=[dict(run='LS8035TB32P3', floor=40, turn=None), dict(run='LS8035TB32P3', floor=16, turn=None), dict(run='LS8035TB32P3', floor=42, turn=8)])],
    skipped=skipped, merged=result['merged'], tests=dict(tsc=0, vitest=0, cases=live_tests['cases']),
    version=result['version'], release=result['release'], commit=SOURCE,
    source_tests=source_tests, live_tests=live_tests,
    source_withdrawal=dict(exit=1, failed=6, passed=3), source_restored=dict(exit=0, passed=9),
    proposal=str(SCRATCH / 'proposal.md'), handoff=str(SCRATCH / 'handoff-ops.md'), external_checks='pending scheduler')
(SCRATCH / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
body = f"""# 静默猎手策略上线交接

{stamp}（写入前已执行date）。本任务自行执行，不派下级agent。

提案silent-0201：休息题分列即时HP、路线首次中位耗尽节点与boss模拟输入HP；相同模拟输入HP仅按该指标并列。LS8035TB32P3 SILENT A10 F40及F16（休息题，回合不适用）、F42末试T8；既有0019／0020／0139保持。F40实回4→28，两线首次耗尽F42／F45、未下限投影−18.5／−27.9均按1血模拟；F16正常42／65。没有替代路线或升级的整战胜例，不声称改善胜率。

独立源码{SOURCE}；正常同步main到{result['source']}；实际live合入{result['merged']}；固定发布{result['release']}／树{result['release_tree']}，唯一版本{result['version']}指向实际合入。三个源码／测试／证据blob与已测独立源码逐字一致，开发工作树干净。

撤完整生产源码：6失败3通过exit1；恢复9通过exit0。提交前与合后固定沙箱tsc0/vitest0，各{live_tests['files']}文件{live_tests['cases']}例全部通过；均首轮，无高负载超时或测试重跑。固定输入不读刷新知识、不调LLM／网络；原日志source-withdrawn.log、source-restored.log、source-suite.log、live-suite.log保持。gitleaks-source／refresh／release均exit0。没有知识生成器改动，不重建。

首次正式锁内先保存七份刷新2ab4b34936832755f1af95b371f296452cbe6438；knowledge incoming／重叠空，唯一decision-log追加历史预检exit1，停下且未实际合源码、未跑合后套件或登记版本。initial-live/原件保持。只读main预检0后正常merge main无冲突，全部源码／测试／生成器diff为空；再次正式锁内预检0、合入及检查通过。已提交知识逐blob保持，其他后台notes差异保留；没有覆盖刷新、手工拼接记录、回退或伪记首次预检成功。

全部原选项、resolve动作、模拟数字／校准／样本门槛、铁甲行为和药水处理保持；只补本角色HEAL／SMITH条件参考，不定统一血线、提前用药或留药。未实现范围见proposal.md与report.json：保血／全死权重、固定目标、巨兽拖延、SL阈值／范围、路线／休息统一阈值和完整时钟证据不足；其他遗物及未模拟动作不扩展。

运维通知由启动器在本任务完成后发strategy-done（ops/learner_checks.py:80），以及最终JSON和本交接交付。请运维核实际合入、唯一版本与固定发布，经项目根learner/ledger.py/by=ops仅将silent-0201登记shipped，并机械同步main。学习者只经CLI追加proposed；旧0019／0020／0139的首证、先验、状态与版本历史保持。完整沙箱外tsc/vitest待调度器，本回报不冒称外部完整通过。未停对局、未运行play、未推送。

提案路径：{SCRATCH / 'proposal.md'}。
"""
(SCRATCH / 'handoff-ops.md').write_text(body)
(SCRATCH / 'report.md').write_text(body)
with (SCRATCH / 'proposal.md').open('a') as output:
    output.write('\n## 实际上线与最终交接\n\n' + body.removeprefix('# 静默猎手策略上线交接\n\n'))
logs = ['source-withdrawn.log', 'source-restored.log', 'source-suite.log', 'live-suite.log', 'gitleaks-source.log', 'gitleaks-refresh.log', 'gitleaks-release.log']
verification = dict(source_tests=source_tests, live_tests=live_tests,
    source_blobs_equal=True, unique_version=result['version'], source_clean=True,
    knowledge_blobs_equal=True, metadata=result,
    logs={name: dict(bytes=(SCRATCH / name).stat().st_size, sha256=hashlib.sha256((SCRATCH / name).read_bytes()).hexdigest()) for name in logs})
(SCRATCH / 'verification.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(dict(commit=SOURCE, merged=result['merged'], release=result['release'], version=result['version'], tests=live_tests, ledger='silent-0201 proposed'), ensure_ascii=False, indent=2))
