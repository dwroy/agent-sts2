from pathlib import Path
import hashlib, json, os, shutil, subprocess

R = Path('/home/dw/Projects/agent-sts2')
B = Path(__file__).resolve().parent
W = R/'.worktrees/integrator36-44-main-20261023'
M = Path('paper/materials/20261023-issue36-44-r414-integrator')
OLD = Path('paper/materials/20261022-issue36-r414-integrator')
LEDGER = 'paper/materials/decision-log.md'
HANDOFF = 'handoff/integrator-20261022-codex3.md'

def git(*args, cwd=R, data=None):
    return subprocess.check_output(['git', *args], cwd=cwd, input=data)

def sha(b):
    return hashlib.sha256(b).hexdigest()

def put(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

full = json.loads((B/'full/checks.json').read_text())
maincheck = json.loads((B/'main-selfcheck.json').read_text())
assembly = json.loads((B/'assembly.json').read_text())
ma = json.loads((B/'main-assembly.json').read_text())
r415 = json.loads((B/'r415-readback.json').read_text())
assert r415['release_id'] == 'V6-R415' and all(v['same_as_inflight_full'] for v in r415['three_prerequisites'])
assert full['state'] == maincheck['state'] == 'passed'
assert full['inputs_unchanged'] and full['tree'] == assembly['tree']
assert maincheck['tree'] == ma['tree']
assert git('write-tree', cwd=W).decode().strip() == ma['tree']
targeted = json.loads((B/'main-selfcheck/vitest.json').read_text())
assert targeted['success']
assert not (W/M).exists()

# This directory contains the new attempt only; old failed evidence is copied verbatim elsewhere.
dest = W/M
dest.mkdir(parents=True)
for p in B.iterdir():
    if p.name in ('issue36-comments.json', 'issue44-comments.json') or p.suffix == '.index':
        continue
    if p.is_file():
        shutil.copy2(p, dest/p.name)
    elif p.name in ('full', 'selfcheck', 'main-selfcheck', 'source-originals'):
        shutil.copytree(p, dest/p.name)
for n in (36, 44):
    comments = json.loads((B/f'issue{n}-comments.json').read_text())
    if isinstance(comments, dict):
        comments = comments.get('comments', [])
    selected = [c for c in comments if c.get('id') in (6345466773, 6345549699, 6344459640)]
    put(dest/f'issue{n}-authority-and-delivery.json', selected)

old_delivery = json.loads((W/OLD/'delivery.json').read_text())
feature = [v['path'] for v in old_delivery['paths'] if v['category'] == 'issue36']
fix_paths = [p for v in assembly['test_fixes'].values() for p in v['test_paths']]
prerequisites = [v['path'] for v in old_delivery['paths'] if v['category'] != 'issue36']
paths = []
for p in feature + fix_paths + prerequisites:
    base = subprocess.run(['git', 'rev-parse', assembly['live_base']+':'+p], cwd=R, capture_output=True)
    raw = git('show', full['tree']+':'+p)
    mode, _, blob = git('ls-tree', full['tree'], '--', p).decode().split(maxsplit=3)[:3]
    paths.append({'path':p, 'category':'issue36' if p in feature else 'test-fix' if p in fix_paths else 'hotfix40-prerequisite',
        'base_blob':base.stdout.decode().strip() if base.returncode == 0 else None,
        'tested_blob':blob, 'sha256':sha(raw), 'mode':mode})

patch = git('diff', '--binary', assembly['live_base'], full['tree'], '--', *feature, *fix_paths)
(dest/'r414-issue36-and44-tests.patch').write_bytes(patch)
shutil.copy2(W/OLD/'r414-hotfix40-prerequisite.patch', dest/'r414-hotfix40-prerequisite.patch')
shutil.copy2(W/OLD/'deferred-six-consumers-source.patch', dest/'deferred-six-consumers-source.patch')
delivery = {'actual_R414_base':assembly['live_base'], 'source_R3':assembly['original_R3'],
    'test_fixes':assembly['test_fixes'], 'tested_tree':full['tree'], 'full_results':full['vitest'],
    'input_count':full['input_count'], 'inputs_unchanged':True, 'paths':paths,
    'r414_patch':'r414-issue36-and44-tests.patch', 'hotfix40_prerequisite_patch':'r414-hotfix40-prerequisite.patch',
    'deferred_paths':old_delivery['deferred_paths'], 'deferred_in_shared_files':old_delivery['deferred_in_shared_files'],
    'main_base':ma['base'], 'main_targeted_tree':maincheck['tree'],
    'main_targeted_tests':{'files':len(targeted['testResults']), 'passed':targeted['numPassedTests'], 'pending':targeted['numPendingTests']},
    'unique_full_scope':'actual R414 precise composition; main has targeted compatibility checks only',
    'forbid_frozen_knowledge_overlay':True, 'knowledge_snapshot_count':assembly['knowledge_count'],
    'ops_must_preserve_latest_live_and_recheck_consumers':True,
    'old_failed_candidate':'35be70748e6a0c866f630e02b0cef54eb1139ec5',
    'old_failed_material':str(OLD), 'old_failure_and_logs_unchanged':True,
    'production_written_by_integrator':False, 'natural_game_and_learner_receipts':'pending original ops natural boundaries',
    'authority':'https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6345466773'}
delivery['actual_R415_compatibility'] = r415
delivery['hotfix40_prerequisites_already_live'] = True
delivery['R415_publication_instruction'] = 'Apply only 31 R3 and 12 test-fix leaves after checking exact preimages; three hotfix40 prerequisites are already live. Preserve all latest natural knowledge and release registration; never overlay frozen data.'
put(dest/'delivery.json', delivery)

v = full['vitest']
at = subprocess.check_output(['date', '-Is'], text=True).strip()
report = f'''# #36 R414 R3 与 #44 测试修复集成

{at}。按主管 6345466773，实际 R414 `{assembly['live_base']}` 上组合原 R3、Boss-home 测试夹具 `f0a967266` 和 #44 测试修复 `110cbd8e`，唯一完整检查通过。原失败候选 `35be70748`、原两项失败与日志在 `{OLD}` 原样保留。新结果不改写历史，也不声称历史首败只有一个原因或已证明长期稳定。

唯一 full 受测树 `{full['tree']}`：tsc 0，无筛选 Vitest {v['files']} 文件、{v['passed']} 通过、{v['pending']} 跳过、{v['failed']} 失败；随后 Python view 15+1 skip、TUI 18、独立生产入口 2 项通过。{full['input_count']} 枚举输入前后逐 SHA 相同，nice 19、单 fork、禁止文件并行。先行自查 19 文件/214 项与 boss-home Python 6 项通过；嵌套 Python 不重复计数。

main 保留原 #33 MCP/Board 消费者和原断言、最新 #27 数据。兼容候选树 `{maincheck['tree']}` 另做 tsc 与 {len(targeted['testResults'])} 文件/{targeted['numPassedTests']} 项定向检查，Python boss 6、view 15、TUI 18、shell 4 通过；没有第二轮 full，也不把 R414 full 当 main full。main 的额外消费者随原发布顺序待完整 #33+#26，不混入本次精确 R414 补丁。

12 个修复测试的 R414 前像与源 SHA 已核同；相对旧失败树只有测试修复和 56 份自然刷新知识变化，R3 运行代码保持不变。#44 固定计算时钟与真实宿主性能分开，450ms 真实预算反例与 204 行业务断言保留；原历史失败缺少内层异常，仍不宣称唯一根因。Boss-home 只修 open-pane/Popen 夹具与计数，未改变交互启动协议。原 R3 的 exec 回退 viewer 两项红绿反例及生命周期四反例保留。

`delivery.json` 列 R414 原像/受测 blob/SHA、#40 三叶最小前件、完整 #33 待接六叶和共享协议差异。468 份知识只供固定检查；ops 发布必须保当前最新 live 知识/策略/catalog、核实际消费者，禁止覆盖冻结知识或 whole-main。#40 wrapper 必须保 R414 原 12 项，只新增独立入口项；先前错误包装器失败记录保留。

本角色只合 main 和交付原 ops，不改 live、不分发布号。发布后由 ops 在原自然边界启用 brain view 与 learner 交互，验实际 session/high、实时滚动/换局标题、下一原学习任务 TUI/线程/产物/处置权与退场；失权或不确定仍 75/stopped=false。#27 五条待 live/首自然命中/父验收与正式 ACK CLI 阻塞、#40 自然刷新资源/训练/模型消费者和各科学父要求保持。
'''
report += f"\n在途期间 #40 已由 ops 发布 V6-R415 `{r415['actual_live']}`，三叶前件与本轮受测树逐字节同；最新快照另记 `r415-readback.json`，其中 {len(r415['changed_knowledge'])} 份自然知识与冻结副本不同。保留这个差异，不改写 full 输入、不给 R415 新数据冒称 full0。发布时只接 R3/测试叶并保实际最新知识与 R415 编号；#40 三叶已 live，无须重放。\n"
(dest/'report.md').write_text(report)

# Select only our newly appended log lines; unrelated dirty historical edits stay outside this commit.
base_ledger = git('show', ma['base']+':'+LEDGER)
root_lines = (R/LEDGER).read_bytes().splitlines(keepends=True)
markers = [b'#36', b'#27']
own = [l for l in root_lines if l.startswith(b'- 2026-10-23') and b'[watcher]' in l and any(m in l for m in markers) and l not in base_ledger.splitlines(keepends=True)]
assert len(own) >= 3
new_line = (f'- {at} [watcher] #36按主管6345466773合测试夹具f0a967266及#44测试110cbd8e，实际R414树{full["tree"]}唯一tsc/full0（{v["files"]}文件/{v["passed"]}过{v["pending"]}跳0败），{full["input_count"]}输入同；main仅兼容定向{len(targeted["testResults"])}文件/{targeted["numPassedTests"]}项及Python/shell过。旧失败35be70748/原件不变，精确补丁/前像/延期消费者见{M}/delivery.json；合main交原ops保最新live知识按原序发布，未动生产/分号，36自然TUI及session/40刷新训练/27实际发布与CLI/科学父待验。\n').encode()
(W/LEDGER).write_bytes(base_ledger+b'\n'+b'\n'.join(own)+b'\n'+new_line)
root_handoff = (R/HANDOFF).read_bytes()
(W/HANDOFF).parent.mkdir(parents=True, exist_ok=True)
(W/HANDOFF).write_bytes(root_handoff+b'\n'+new_line)
put(B/'record-plan.json', {'base':ma['base'], 'ledger_selected_lines':[l.decode() for l in own],
    'new_line':new_line.decode(), 'root_handoff_sha256':sha(root_handoff), 'root_handoff_preimage':root_handoff.decode(),
    'ledger_path':LEDGER, 'handoff_path':HANDOFF, 'at':at})

stage = ma['paths']+[str(M),str(OLD),'paper/materials/20261023-issue27-batch2-watcher',
    'paper/materials/20261022-issue40-hotfix-full-integrator/delivery.json',LEDGER,HANDOFF]
git('add', '--sparse', '-f', '--', *stage, cwd=W)
assert not git('diff', '--name-only', cwd=W).strip()
assert not git('diff', '--cached', ma['tree'], '--', 'agent', 'ops', 'learner', 'knowledge', 'eval', 'tools', '.agents', cwd=W).strip()
files = git('diff','--cached','--name-only',cwd=W).decode().splitlines()
raw = b'\n'.join((W/p).read_bytes() for p in files)
scan = subprocess.run(['gitleaks','stdin','--redact','--no-banner'], input=raw, capture_output=True,
    env={**os.environ,'GOMAXPROCS':'1'})
(B/'candidate-gitleaks.log').write_bytes(scan.stdout+scan.stderr)
assert scan.returncode == 0
message = 'Integrate #36 R3 and #44 test fixes after one R414 full\n\nPreserve failed originals, current main consumers and #27 queued data.\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n'
git('commit','-F','-',cwd=W,data=message.encode())
candidate = git('rev-parse','HEAD',cwd=W).decode().strip()
put(B/'candidate.json',{'candidate':candidate,'base':ma['base'],'tested_tree':full['tree'],
    'main_targeted_tree':maincheck['tree'],'material':str(M),'paths':files})
print(candidate, flush=True)
