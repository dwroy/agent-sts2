import json
import pathlib
import re
import subprocess
import sys

OUT = pathlib.Path(__file__).parent
LIVE = pathlib.Path('/home/dw/Projects/agent-sts2/.worktrees/live')
SOURCE = pathlib.Path('/home/dw/Projects/agent-sts2/.worktrees/codex-dev')
META = {'merged': None, 'test_rc': None}
AUTHOR = ['-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com']
FOOTER = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'


def save():
    (OUT / 'live-merge.json').write_text(json.dumps(META, ensure_ascii=False, indent=2) + '\n')


def git(*args, cwd=LIVE):
    return subprocess.check_output(['git', '-C', str(cwd), *args], text=True).strip()


def scan_staged(name):
    patch = subprocess.check_output(['git', '-C', str(LIVE), 'diff', '--cached', '--binary'])
    (OUT / (name + '.patch')).write_bytes(patch)
    with (OUT / ('gitleaks-' + name + '.log')).open('w') as log:
        subprocess.run(['gitleaks', 'stdin', '--redact', '--no-banner'], input=patch,
                       stdout=log, stderr=subprocess.STDOUT, check=True)


def knowledge_tree():
    entries = git('ls-tree', '-r', 'HEAD', '--', 'knowledge').splitlines()
    return {line.split('\t', 1)[1]: line.split()[2] for line in entries}


def stats(path):
    log = path.read_text()
    return {'tsc': 0, 'vitest': 0,
            'files': sum(map(int, re.findall(r'Test Files\s+(\d+) passed', log))),
            'cases': sum(map(int, re.findall(r'Tests\s+(\d+) passed', log)))}


try:
    META['source_commit'] = git('rev-parse', 'HEAD', cwd=SOURCE)
    META['branch'] = git('branch', '--show-current', cwd=SOURCE)
    META['initial_head'] = git('rev-parse', 'HEAD')
    save()
    print('锁内等待知识刷新完成', flush=True)
    subprocess.run(['bash', '-c', "while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done"], check=True)
    if git('diff', '--cached', '--name-only'):
        raise RuntimeError('live已有暂存项，停止以免混入提交')
    META['refresh'] = git('diff', '--name-only', '--', 'knowledge', 'notes/fight-value-backtest.md').splitlines()
    git('add', 'notes/fight-value-backtest.md', 'knowledge')
    if git('diff', '--cached', '--name-only'):
        scan_staged('live-refresh')
        git(*AUTHOR, 'commit', '-m', 'Refresh knowledge data', '-m', FOOTER)
        META['refresh_commit'] = git('rev-parse', 'HEAD')
    else:
        META['refresh_commit'] = None
    META['base'] = git('rev-parse', 'HEAD')
    fork = git('merge-base', 'HEAD', META['source_commit'])
    META['fork'] = fork
    META['incoming_knowledge'] = git('diff', '--name-only', fork, META['source_commit'], '--', 'knowledge').splitlines()
    before = knowledge_tree()
    META['knowledge_before'] = before
    META['overlap'] = sorted(set(META['refresh']) & set(META['incoming_knowledge']))
    conflict = [path for path in META['overlap'] if before.get(path) != git('rev-parse', META['source_commit'] + ':' + path)]
    META['conflicting_overlap'] = conflict
    save()
    if conflict:
        raise RuntimeError('知识刷新与待合分支存在不同blob重叠，停止')
    incoming = set(git('diff', '--name-only', fork, META['source_commit']).splitlines())
    dirty = set(git('diff', '--name-only').splitlines())
    if dirty & incoming:
        raise RuntimeError('live未提交文件与待合分支重叠，停止')
    with (OUT / 'merge-tree.log').open('w') as log:
        preview = subprocess.run(['git', '-C', str(LIVE), 'merge-tree', '--write-tree', 'HEAD', META['source_commit']],
                                 stdout=log, stderr=subprocess.STDOUT)
    META['preview_rc'] = preview.returncode
    save()
    history_merge = None
    if preview.returncode:
        conflicts = set(re.findall(r'^\d{6} [0-9a-f]+ [123]\t(.+)$', (OUT / 'merge-tree.log').read_text(), re.MULTILINE))
        if conflicts != {'paper/materials/decision-log.md'}:
            raise RuntimeError('预合并存在非追加日志冲突，未修改live合并状态')
        path = 'paper/materials/decision-log.md'
        def blob(ref):
            return subprocess.check_output(['git', '-C', str(LIVE), 'show', ref + ':' + path])
        common, ours, theirs = blob(fork), blob('HEAD'), blob(META['source_commit'])
        if not ours.startswith(common) or not theirs.startswith(common):
            raise RuntimeError('日志不是共同前缀后的纯追加，停止')
        # Preserve every original byte on both sides; only their append order is integrated.
        history_merge = common + theirs[len(common):] + ours[len(common):]
        META['history_only_conflict'] = True
        save()
        print('仅追加日志冲突：共同前缀与双方追加原文均保留', flush=True)
    with (OUT / 'git-merge-live.log').open('w') as log:
        merge = subprocess.run(['git', '-C', str(LIVE), *AUTHOR, 'merge', '--no-edit', META['branch'],
                        '-m', 'Merge Silent Permafrost first-Power Block fix\n\n' + FOOTER],
                       stdout=log, stderr=subprocess.STDOUT)
    if merge.returncode:
        unmerged = git('diff', '--name-only', '--diff-filter=U').splitlines()
        if history_merge is None or unmerged != ['paper/materials/decision-log.md']:
            git('merge', '--abort')
            raise RuntimeError('实际合入出现非预期冲突，已中止合并')
        subprocess.run(['date'], check=True)
        (LIVE / unmerged[0]).write_bytes(history_merge)
        git('add', unmerged[0])
        scan_staged('live-merge-history')
        git(*AUTHOR, 'commit', '-m', 'Merge Silent Permafrost first-Power Block fix', '-m', FOOTER)
    META['merged'] = git('rev-parse', 'HEAD')
    after = knowledge_tree()
    META['untouched_knowledge_blobs_preserved'] = all(after.get(path) == blob for path, blob in before.items()
                                                     if path not in META['incoming_knowledge'])
    save()
    META['refreshed_blobs_preserved'] = all(after.get(path) == before.get(path) for path in META['refresh'])
    save()
    if not META['untouched_knowledge_blobs_preserved'] or not META['refreshed_blobs_preserved']:
        git('reset', '--merge', META['base'])
        META['failed_merge'] = META['merged']
        META['merged'] = None
        save()
        raise RuntimeError('合入后知识blob核对失败，已回退并保留刷新数据')
    print('实际live合入 ' + META['merged'] + '，开始合后沙箱测试', flush=True)
    with (OUT / 'live-sandbox.log').open('w') as log:
        test = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', stdout=log, stderr=subprocess.STDOUT)
    META['test_first_rc'] = test.returncode
    test_path = OUT / 'live-sandbox.log'
    if test.returncode and re.search(r'(Test timed out|TimeoutError|timed out in)', test_path.read_text()):
        print('合后测试出现超时，按任务要求同树重跑一次', flush=True)
        test_path = OUT / 'live-sandbox-retry.log'
        with test_path.open('w') as log:
            test = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', stdout=log, stderr=subprocess.STDOUT)
        META['retried'] = True
    META['test_rc'] = test.returncode
    save()
    if test.returncode:
        git('reset', '--merge', META['base'])
        META['rolled_back_to'] = git('rev-parse', 'HEAD')
        META['failed_merge'] = META['merged']
        META['merged'] = None
        save()
        raise RuntimeError('合后测试失败，已回退合前提交并保留刷新数据')
    META['source_tests'] = stats(OUT / 'source-sandbox.log')
    META['live_tests'] = stats(test_path)
    if not META['live_tests']['cases']:
        raise RuntimeError('测试统计为空，停止上线登记')
    paths = ['paper/materials/decision-log.md', 'eval/versions.json']
    if git('diff', '--cached', '--name-only') or git('diff', '--name-only', '--', *paths):
        raise RuntimeError('上线记录路径存在未提交修改，停止登记')
    versions_path = LIVE / paths[1]
    versions = json.loads(versions_path.read_text())
    fix_numbers = [int(m.group(1)) for entry in versions['versions'] if (m := re.fullmatch(r'S1\.fix(\d+)', entry['name']))]
    version = 'S1.fix' + str(max(fix_numbers) + 1)
    stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M'], text=True).strip()
    print('date: ' + stamp, flush=True)
    message = (f'Codex学习者纯bug自测后上线：fix-queue-v4 2026-10-06 11:33永冻首次能力漏7挡；源码{META["source_commit"]}→实际live代码{META["merged"]}，eval {version}。'
               '证据25226ZFLNR1J SILENT A10 F29 T1（首次灵动步法0→7挡）及PJ2LL9KU7FHD SILENT A10 F17第3次T4（幻影0→7挡，敏捷药水后两防御各7，合21抵21、57血不变）；账本bug-infra silent-0172、机制silent-0173。'
               '0172首证25226/A10、prior=no保持；0173首证10GPK5XGHCK3/A3、prior=yes及既有shipped/S1.exp42不改。'
               '只补已观察首次能力7挡，ScreenMemory及日志回放跟踪已用/可用/未知，成功SL重置；跨回合rollout携带剩余触发，续行不重算已有7挡，缺历史/计数/跨越未观察回合保留未知，能力重放触发未验证显式标注未知。'
               '固定夹具取两局18帧，不依赖刷新知识；铁甲与无遗物数值等价，不调整保血、留药、时钟、路线、休息、SL阈值或小偷优先级，不过滤或否决任何药水/动作；没有受控替代整场，不声称修复转胜。'
               f'最终撤6处生产源码6失败6通过/exit1，恢复新12例及相关3文件28例通过；源tsc0/{META["source_tests"]["files"]}文件{META["source_tests"]["cases"]}例、合后tsc0/{META["live_tests"]["files"]}文件{META["live_tests"]["cases"]}例/vitest0。'
               + ('合后超时同树重跑一次通过，原失败日志保持。' if META.get('retried') else '合后首轮沙箱通过，无超时重跑。')
               + '初稿类型导入、断言字段及抽牌夹具错误已修正，失败记录保留。'
               f'刷新提交{META["refresh_commit"]}、合前{META["base"]}，知识不同blob重叠0，非incoming知识逐blob保留；无生成器改动不重建，gitleaks0。'
               + ('仅decision-log纯追加冲突，共同前缀及双方全部原文保持。' if META.get('history_only_conflict') else '')
               + '0172仅经CLI/by=learner:fix-batch追加源码提交和proposed；交运维据fix-done及learner/runs/20261007-014302-fix-batch/handoff-ops.md核实际发布后登记shipped，完整外部套件由调度器补跑。'
               '127项既有修复未重复提交，mod自愈/缓存缺证、boss性能专项及策略项保持；队列未改，不停对局、不运行play、不推送。')
    with (LIVE / paths[0]).open('a') as log:
        log.write('\n- ' + stamp + ' ' + message + '\n')
    versions['versions'].append({'name': version, 'family': 'Silent', 'commit': META['merged'], 'source': stamp + ' ' + message})
    versions_path.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
    git('add', *paths)
    git('diff', '--cached', '--check')
    scan_staged('live-release')
    git(*AUTHOR, 'commit', '-m', 'Record Silent Permafrost first-Power Block fix deployment', '-m', FOOTER)
    META.update(release_commit=git('rev-parse', 'HEAD'), eval_version=version, release_time=stamp)
    save()
    print('上线登记 ' + META['release_commit'] + ' / ' + version, flush=True)
except Exception as error:
    META['error'] = str(error)
    save()
    print('停止：' + str(error), flush=True)
    sys.exit(1)
