from pathlib import Path
import hashlib, json, subprocess

R = Path('/home/dw/Projects/agent-sts2')
A = Path(__file__).resolve().parent
M = R / 'paper/materials/20261024-issue37-20-r434-integrator'
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*args):
    return subprocess.check_output(['git', '-C', str(R), *args])
def save(name, value):
    (M / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

s = json.loads((M / 'full-state.json').read_bytes())
t = json.loads((M / 'full-terminal-verification.json').read_bytes())
assert s['phase'] == 'full-passed' and s['failed'] == 0 and s['rc'] == 0
assert all(s[k] for k in ['inputs_unchanged','dependencies_unchanged','tree_unchanged','index_entries_unchanged','index_flags_unchanged','check_lock_released'])
assert t['worker_absent'] and t['check_lock_independently_acquired']
a = json.loads((M / 'assembly.json').read_bytes())
W = Path(a['worktree'])
files = {}
source_rows = []

def add_source(n, b, before, provenance, mode):
    assert n not in files
    files[n] = b
    source_rows.append(dict(path=n, sha256=sha(b), preimage_sha256=before,
                            provenance=provenance, mode=mode))

for x in json.loads((M / 'source37-integration-plan.json').read_bytes()):
    n = x['path']; b = git('show', x['source'] + ':' + n)
    assert sha(b) == x['sha256']
    mode = git('ls-tree', x['source'], '--', n).decode().split()[0]
    add_source(n, b, x['preimage_sha256'], x['source'], mode)
    if n in json.loads((A / 'sources.json').read_bytes())['test37_paths']:
        assert (W / n).read_bytes() == b
source20 = a['source20']
for x in json.loads((R / 'paper/materials/20261024-issue20-channel-integrator/source-leaves.json').read_bytes()):
    n = x['path']; b = git('show', source20 + ':' + n)
    assert sha(b) == x['sha256'] and (W / n).read_bytes() == b
    mode = git('ls-tree', source20, '--', n).decode().split()[0]
    add_source(n, b, sha(git('show', source20 + '^:' + n)), source20, mode)
assert len(source_rows) == 29
assert a['old51_included'] is False and a['excluded_old51_leaves'] == 8
save('source-integration-plan.json', source_rows)

raw_manifests = []
for n in ['inputs-before.json', 'dependencies-before.json']:
    b = (M / n).read_bytes(); rows = json.loads(b)
    output = n.replace('.json', '.sha256')
    (M / output).write_text(''.join(x['sha256'] + '  ' + x['path'] + '\n' for x in rows))
    raw_manifests.append(dict(path=str((M / n).relative_to(R)), sha256=sha(b), rows=len(rows),
                              committed_sha_first_manifest=output))
save('original-manifest-checksums.json', raw_manifests)
artifacts = []
for p in sorted(A.iterdir()):
    if p.is_file() and not p.name.endswith('-context.json'):
        artifacts.append(dict(path=str(p.relative_to(R)), bytes=p.stat().st_size, sha256=sha(p.read_bytes())))
save('original-artifact-manifest.json', artifacts)
now = subprocess.check_output(['date', '-Iseconds'], text=True).strip()
drift = json.loads((M / 'knowledge-drift-at-integration.json').read_bytes())
forensics = json.loads((M / 'full-index-forensics.json').read_bytes())
report = f'''# R434 与 #37＋#20 唯一完整核验

核验时间：{now}。本次唯一 full {s['files']} 文件、{s['passed']} 过、{s['failed']} 败、{s['skipped']} 历史跳过，生产与 tools/v6 两套 tsc 均为 0；独立 issue_session Python 62 项通过。单 worker、forks、nice19，无模型、游戏或生产 tick 调用。

冻结来自实际 R434 `{a['live_base']}` 与宿主基线 `{a['host_head']}`；anchor `{a['validation_anchor']}`，tree `{a['validation_tree']}`。{a['inputs']} 份输入、{a['dependencies']} 份依赖、tree、完整 index 条目及标志前后核同。index 原始字节相同：{s['index_unchanged']}；前后原字节独立留档，语义条目/标志是本次事前明确的冻结门，字节差异另作诊断，不倒改旧 full 的字节守卫终态。worker 已退出，原检查锁已独立取得并释放。独立原字节解析共{forensics['before_entries']}条，仅{forensics['stat_cache_only_changed_count']}条stat缓存变化，语义/标志差异{len(forensics['semantic_or_flags_changed'])}；样本{forensics['stat_cache_sample']}，具体写入者未知。实际知识 {a['game_knowledge']} 叶，另 {a['fixed_test_data']} 份固定测试数据只用于验证，不部署。完整原始结果 SHA256 `{s['result_sha256']}`。

首次定向13文件113过/1败及收尾ENOBUFS原件保留。目录固定负/正例证明导入扫描也要求new URL指向的.cache目录存在，补生成缓存后实际扫描归零；候选源码不变。收尾Git完整索引捕获扩大到64MiB，定向复验13文件114项全过，全部输入/依赖/tree及索引语义/标志/原字节均同，独立核worker退/原锁释放；见directed-harness-correction.md及cache-precondition-probe.json。两次结果各保原件，不将首次改写为通过。

#37 九产品叶沿已合 main 的070cac9b；累积补交266ff2af的五测试/助手及17证据文件，保留原请求/计划合并、调用次数、零错误及独立证据分母断言，不增加运行逻辑或游戏经验。#20 40357759七叶按可靠分配通道边界核历史采用：分配前旧live叶及旧完整补丁两负例保留、分配后两正例放行，旧无边界实例保守保留；不靠Git时间。独立原反例及真实24h父窗沿原材料，不执行生产complete/reclaim。

本组合明确剔除旧 #51 八叶。八路径与当前宿主基线逐字节一致，与废止候选各不相同，见 excluded-old51-leaves.json。Roy6382974399/6382976033已覆盖旧3:1调度授权，旧R433组合full6600/0/2及index守卫失败原件保留，只支持原冻结。本轮不修改或验收新四类别/独立自有槽；#51的A181311/C182343 native/high/原沙箱回执、fast请求与未知实际tier另沿原owner，不冒四道已验。

本报告只覆盖明示冻结组合，不能冒整个变化中的main通过。合入后交原ops核真实宿主源码加载、自然边界新事务精确发布九游戏叶及首个自然Jev无开卷/无调用错误。保留R430–R434、刀刃新版、R434实际47策略/91rk及全部后续刷新；19:10只读观察当前live `{drift['live_head_after']}`，相对冻结有{len(drift['changed'])}知识叶变化，读取中不稳定叶{len(drift['unstable_during_read'])}；见knowledge-drift-at-integration.json。R437及全部后续知识另保，不将只读观察冒原子冻结或精确复用。任何知识漂移另列不回刷。本full期间原ops另发R435与R436；R436六情境2新4同ID更/4独立支持局/6描述rk、Plan缺和科学父已沿原链转Roy并留本角色接收及用户可见回执，见notice51/；main/live数据SHA与ops核验同，R435六文字/六rk对各通道原发布提交逐项核同。此核收不代Roy本人确认、不伪造manual-notice或其他角色ACK；本冻结不冒覆盖R435/R436消费者或自然收益。091302 source=null/failed/净12/.2排除，005failed/008旧描述候选、可执行谓词缺口、#20原真实24h/kit/39/43、#27正式ACK/自然采用与科学父保持，未用本测试代替父验收。
'''
(M / 'report.md').write_text(report)
for material in [M]:
    for p in material.rglob('*'):
        if p.is_file() and p.name not in ['inputs-before.json', 'dependencies-before.json']:
            files[str(p.relative_to(R))] = p.read_bytes()
payload = A / 'final-payload'
payload.mkdir(exist_ok=False)
for n, b in files.items():
    p = payload / n; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(b)
plan = dict(at=now, sources=source_rows, files=[dict(path=n, bytes=len(b), sha256=sha(b)) for n,b in sorted(files.items())])
(A / 'final-integration-plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(dict(files=len(files), source_paths=len(source_rows), report=str(M / 'report.md'))))
