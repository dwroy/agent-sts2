import collections
import json
import re
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
DEV = ROOT / '.worktrees/codex-dev'
LIVE = ROOT / '.worktrees/live'
SCRATCH = ROOT / 'learner/runs/20261007-024302-fix-batch'
IDENTITY = ['-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com']
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
result = {'task': 'fix-batch', 'merged': None}
log = (SCRATCH / 'live-flow.txt').open('a')

def run(args, check=True, cwd=LIVE):
    done = subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    log.write('$ ' + ' '.join(args) + '\n' + done.stdout + f'\nexit={done.returncode}\n')
    log.flush()
    if check and done.returncode:
        raise RuntimeError(f'{args[0]} exit={done.returncode}，详见live-flow.txt')
    return done

def git(*args):
    return run(['git', *args]).stdout.strip()

def names(*args):
    return set(git('diff', '--name-only', *args).splitlines())

def knowledge_blobs(ref):
    return {path: meta.split()[2] for line in git('ls-tree', '-r', ref, '--', 'knowledge').splitlines()
            for meta, path in [line.split('\t', 1)]}

def scan(name):
    patch = subprocess.check_output(['git', 'diff', '--cached'], cwd=LIVE)
    with (SCRATCH / f'{name}.txt').open('w') as output:
        done = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--no-banner', '--redact', '--no-color'],
                              cwd=LIVE, input=patch, stdout=output, stderr=subprocess.STDOUT)
    assert done.returncode == 0, '敏感信息扫描失败，停止提交'

def history_union(base, ours, theirs):
    # Only append-only histories are resolved; retain every nonempty line, including duplicate multiplicity.
    nonempty = lambda value: collections.Counter(line for line in value.splitlines() if line.strip())
    bc, oc, tc = map(nonempty, [base, ours, theirs])
    assert not (bc - oc) and not (bc - tc), 'decision-log有历史修改，停止合入'
    missing = oc - tc
    extra = []
    for line in ours.splitlines():
        if missing[line] > 0:
            extra.append(line)
            missing[line] -= 1
    merged = theirs.rstrip('\n') + '\n' + ('\n' + '\n'.join(extra) + '\n' if extra else '')
    mc = nonempty(merged)
    assert not (oc - mc) and not (tc - mc), 'decision-log原文未完整保留'
    return merged

def sandbox(name):
    print('开始合后固定沙箱检查。', flush=True)
    with (SCRATCH / f'{name}.txt').open('w') as output:
        done = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent',
                              stdout=output, stderr=subprocess.STDOUT)
    (SCRATCH / f'{name}.exit').write_text(str(done.returncode) + '\n')
    return done.returncode

try:
    print('已取得live锁，等待后台知识刷新完成。', flush=True)
    run(['date'])
    assert git('branch', '--show-current') == 'live'
    assert not names('--cached'), 'live存在其他暂存内容，停止'
    run(['bash', '-c', "while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done"])
    branch = run(['git', 'branch', '--show-current'], cwd=DEV).stdout.strip()
    source = run(['git', 'rev-parse', 'HEAD'], cwd=DEV).stdout.strip()
    result.update(branch=branch, source=source, before_refresh=git('rev-parse', 'HEAD'))
    common = git('merge-base', 'HEAD', source)
    incoming = names(common, source)
    incoming_knowledge = {path for path in incoming if path.startswith('knowledge/')}
    work = names()
    refresh = {path for path in work if path.startswith('knowledge/')}
    other_overlap = incoming & (work - refresh - {'notes/fight-value-backtest.md'})
    assert not other_overlap, f'未提交内容与合入重叠：{sorted(other_overlap)}'
    for path in incoming_knowledge & refresh:
        assert git('hash-object', path) == git('rev-parse', f'{source}:{path}'), f'知识刷新冲突：{path}'
    run(['git', 'add', 'notes/fight-value-backtest.md', 'knowledge'])
    if names('--cached'):
        scan('live-refresh-gitleaks')
        run(['git', *IDENTITY, 'commit', '-m', 'Refresh knowledge data', '-m', COAUTHOR])
        result['refresh_commit'] = git('rev-parse', 'HEAD')
    else:
        result['refresh_commit'] = None
    baseline = git('rev-parse', 'HEAD')
    result['rollback_target'] = baseline
    before_blobs = knowledge_blobs('HEAD')
    committed_knowledge = names(common, baseline, '--', 'knowledge')
    for path in incoming_knowledge & committed_knowledge:
        assert git('rev-parse', f'HEAD:{path}') == git('rev-parse', f'{source}:{path}'), f'已提交知识刷新冲突：{path}'
    result['knowledge_overlap'] = sorted(incoming_knowledge & (refresh | committed_knowledge))
    preflight = run(['git', 'merge-tree', '--write-tree', 'HEAD', source], check=False)
    conflicts = set(re.findall(r'^\d{6} [0-9a-f]+ [123]\t(.+)$', preflight.stdout, re.MULTILINE))
    merged_history = None
    if preflight.returncode:
        assert conflicts == {'paper/materials/decision-log.md'}, f'合并预检冲突，停止：{sorted(conflicts)}'
        texts = [subprocess.check_output(['git', 'show', f'{ref}:paper/materials/decision-log.md'], cwd=LIVE, text=True)
                 for ref in [common, baseline, source]]
        merged_history = history_union(*texts)
        result['decision_log_append_resolution'] = True
    print('知识重叠检查通过，合入源码并保留双方decision-log历史。', flush=True)
    merge = run(['git', *IDENTITY, 'merge', '--no-edit', '-m', f'Merge tested fix-batch source\n\n{COAUTHOR}', branch], check=False)
    if merge.returncode:
        assert names('--diff-filter=U') == {'paper/materials/decision-log.md'} and merged_history is not None, '实际合并出现其他冲突，停止'
        run(['date'])
        (LIVE / 'paper/materials/decision-log.md').write_text(merged_history)
        run(['git', 'add', 'paper/materials/decision-log.md'])
        run(['git', *IDENTITY, 'commit', '-m', 'Merge tested fix-batch and preserve decision history', '-m', COAUTHOR])
    merged = git('rev-parse', 'HEAD')
    result['code_merge'] = merged
    changed_sources = names('9b134d61e7cf4b4be2af6bbb51a57f72e315242b', source)
    assert all(git('rev-parse', f'HEAD:{path}') == git('rev-parse', f'{source}:{path}') for path in changed_sources), '合后源码或夹具不一致'
    assert knowledge_blobs('HEAD') == before_blobs, '知识刷新blob被改变，停止'
    rc = sandbox('live-suite')
    if rc and re.search(r'timed out|timeout', (SCRATCH / 'live-suite.txt').read_text(), re.IGNORECASE):
        print('合后检查出现超时，按任务要求同树重跑一次。', flush=True)
        result['timeout_retry'] = True
        rc = sandbox('live-suite-retry')
    result['sandbox_exit'] = rc
    if rc:
        rollback = run(['git', 'reset', '--merge', baseline], check=False)
        result.update(rollback_exit=rollback.returncode, live_after_failure=git('rev-parse', 'HEAD'))
        raise RuntimeError('合后检查失败，已回退并保留刷新数据；不登记版本')
    result['merged'] = merged
    assert knowledge_blobs('HEAD') == before_blobs, '合后检查期间已提交知识blob改变'
    stamp = run(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
    versions_path = LIVE / 'eval/versions.json'
    versions = json.loads(versions_path.read_text())
    numbers = [int(m.group(1)) for item in versions['versions']
               if (m := re.fullmatch(r'S1\.fix(\d+)', item.get('name', '')))]
    version = f'S1.fix{max(numbers, default=0) + 1}'
    commits = run(['git', 'log', '--format=%H', '9b134d61e7cf4b4be2af6bbb51a57f72e315242b..HEAD'], cwd=DEV).stdout.splitlines()
    assert len(commits) == 2, '本批源码提交数不是两个，停止登记'
    replay_commit, meta_commit = commits
    detail = (f'fix-queue-v4 2026-10-07 02:20重放跨回合计数与02:31羽化即时抽牌；源码{meta_commit}/{replay_commit}→实际live代码{merged}。'
              '来源notes/lessons.md的DPYF2BAA3DKT末次F48 T1/T7、HUVEPWQAHWFU F35 T2及首证C48LLXBGKXQ9 F24 T1；'
              'bug-infra silent-0199/silent-0202，独立mechanic silent-0200/silent-0203不冒记shipped。'
              '重放仅保存已接受动作的附魔额外次数，跨轮原始累计25加重放1为26，T7串刺达到30后新增9伤凋萎；'
              '完整需损35/28血差−7，持牌伤18，原始每轮均值保持25/6，投斧单独计数；续行/重读/重启/SL与失败动作固定覆盖。'
              '羽化仅静默已观察普通Cards=3分支不再抽3；随机生成的未来收益保留未建模，无虚构即时抽牌/随机牌收益。'
              '铁甲等价，不改保血/留药/时钟/路线/休息/SL阈值/无色估值，不增加药水代价、过滤或否决，全部选项保留，不声称整场转胜。'
              '羽化4例撤源码2失败2通过，重放10例撤全部源码9失败1通过；恢复相关回归3文件50例通过，源每提交及合后固定沙箱tsc/vitest0。'
              '敏感信息扫描0，知识刷新逐blob保留，无生成器改动不重建；仅decision-log追加冲突保留双方全部非空原文/重复次数。'
              '0202第一次where.commits误写a-placeholder已明确无效并CLI追加正式提交勘误，原历史保留；两bug条目仅CLI/by=learner:fix-batch proposed。'
              f'交运维据fix-done和{SCRATCH}/handoff-ops.md确认实际合入后CLI登记shipped/{version}，完整外部套件交调度器；'
              '128项旧修复不重复提交，缓存实测/自愈根因/性能专项与策略待定保持，队列未改，不停对局、不运行play、不推送。')
    with (LIVE / 'paper/materials/decision-log.md').open('a') as output:
        output.write(f'\n- {stamp} Codex学习者纯bug自测后上线：{detail} eval {version}。\n')
    versions['versions'].append({'name': version, 'family': 'Silent', 'commit': merged, 'source': f'decision-log {stamp}（{detail}）'})
    versions_path.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
    run(['git', 'add', 'paper/materials/decision-log.md', 'eval/versions.json'])
    run(['git', 'diff', '--cached', '--check'])
    scan('live-release-gitleaks')
    run(['git', *IDENTITY, 'commit', '-m', 'Record Silent replay-count and Metamorphosis bug release', '-m', COAUTHOR])
    result.update(version=version, release=git('rev-parse', 'HEAD'), release_tree=git('rev-parse', 'HEAD^{tree}'), remaining_status=git('status', '--short'))
    print(f'{version}已上线，结果写入live-result.json。', flush=True)
except Exception as error:
    result['error'] = str(error)
    print(str(error), flush=True)
    raise
finally:
    (SCRATCH / 'live-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    log.close()
