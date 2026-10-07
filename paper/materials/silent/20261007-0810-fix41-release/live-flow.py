import json
from collections import Counter
import os
from pathlib import Path
import subprocess
import sys
import time

RUN = Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-072650-fix-batch')
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
SOURCE, FIX = sys.argv[1:]
result = {'source_branch': SOURCE, 'fix': FIX, 'merged': None, 'stage': 'preflight'}

def save():
    (RUN / 'live-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

def command(args, *, cwd=LIVE, check=True, input=None):
    p = subprocess.run(args, cwd=cwd, text=True, input=input, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    with (RUN / 'live-flow.txt').open('a') as f:
        f.write('$ ' + ' '.join(args) + '\n' + p.stdout + '\nexit=' + str(p.returncode) + '\n')
    if check and p.returncode:
        result['failure'] = {'args': args, 'rc': p.returncode}
        save()
        raise RuntimeError('command failed: ' + ' '.join(args))
    return p

def git(*args, **kwargs):
    return command(['git', *args], **kwargs)

def scan(name, refs=None):
    diff = subprocess.check_output(['git', 'diff', '--binary', *(refs or ['--cached'])], cwd=LIVE, text=True)
    p = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--redact', '--no-banner'],
                       input=diff, text=True, cwd=LIVE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    (RUN / name).write_text(p.stdout)
    if p.returncode:
        raise RuntimeError('gitleaks failed')

def commit(message):
    return git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'commit', '-m',
               message + '\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>')

def knowledge_blobs(commit):
    data = git('ls-tree', '-r', commit, '--', 'knowledge').stdout
    return {line.split('\t', 1)[1]: line.split()[2] for line in data.splitlines()}

try:
    while subprocess.run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], stdout=subprocess.DEVNULL).returncode == 0:
        time.sleep(10)
    if git('diff', '--cached', '--quiet', check=False).returncode:
        raise RuntimeError('live already has staged changes')
    if git('rev-parse', SOURCE).stdout.strip() != FIX:
        raise RuntimeError('source branch moved after validation')
    git('status', '--short')
    git('add', '--', 'notes/fight-value-backtest.md', 'knowledge')
    if git('diff', '--cached', '--quiet', check=False).returncode:
        scan('live-refresh-gitleaks.txt')
        commit('Refresh knowledge data')
        result['refresh'] = git('rev-parse', 'HEAD').stdout.strip()
    else:
        result['refresh'] = None
    pre = git('rev-parse', 'HEAD').stdout.strip()
    result['pre_merge'] = pre
    before = knowledge_blobs(pre)
    base = git('merge-base', pre, FIX).stdout.strip()
    branch_paths = set(git('diff', '--name-only', base, FIX, '--', 'knowledge').stdout.splitlines())
    live_paths = set(git('diff', '--name-only', base, pre, '--', 'knowledge').stdout.splitlines())
    source_blobs = knowledge_blobs(FIX)
    overlap = sorted(p for p in branch_paths & live_paths if before.get(p) != source_blobs.get(p))
    result['knowledge_overlap'] = overlap
    if overlap:
        raise RuntimeError('refreshed knowledge overlaps source changes')
    result['stage'] = 'merge-precheck'
    save()
    precheck = git('merge-tree', '--write-tree', pre, FIX, check=False)
    (RUN / 'live-merge-precheck.txt').write_text(precheck.stdout)
    conflicts = {line.split('\t', 1)[1] for line in precheck.stdout.splitlines() if '\t' in line}
    if precheck.returncode and conflicts != {'paper/materials/decision-log.md'}:
        raise RuntimeError('merge precheck found non-record conflicts; live kept at pre_merge')
    scan('live-source-gitleaks.txt', [pre, FIX])
    if conflicts:
        log_path = 'paper/materials/decision-log.md'
        ours = subprocess.check_output(['git', 'show', pre + ':' + log_path], cwd=LIVE, text=True)
        theirs = subprocess.check_output(['git', 'show', FIX + ':' + log_path], cwd=LIVE, text=True)
        # Keep the complete live history, then append only the missing source occurrences.
        counts = Counter(ours.splitlines())
        seen = Counter()
        missing = []
        for line in theirs.splitlines():
            seen[line] += 1
            if line and seen[line] > counts[line]:
                missing.append(line)
        merged_log = ours + ('\n' if not ours.endswith('\n') else '') + '\n'.join(missing) + '\n'
        merged_counts = Counter(merged_log.splitlines())
        assert merged_log.startswith(ours)
        assert all(not line or merged_counts[line] >= n for line, n in Counter(theirs.splitlines()).items())
        merge = git('merge', '--no-edit', SOURCE, check=False)
        unresolved = git('diff', '--name-only', '--diff-filter=U').stdout.splitlines()
        if merge.returncode == 0 or unresolved != [log_path]:
            raise RuntimeError('actual merge conflicts differ from record precheck; stopped')
        command(['date'])
        (LIVE / log_path).write_text(merged_log)
        git('add', '--', log_path)
        scan('live-merge-gitleaks.txt')
        commit('Merge ' + SOURCE + ' into live; preserve both decision histories')
        result['record_conflict_resolution'] = {'path': log_path, 'live_prefix_preserved': True,
                                                'source_occurrences_preserved': True, 'appended_lines': len(missing)}
    else:
        git('merge', '--no-edit', SOURCE)
    result['code_merge'] = git('rev-parse', 'HEAD').stdout.strip()
    if knowledge_blobs(result['code_merge']) != before:
        git('reset', '--merge', pre)
        raise RuntimeError('merged knowledge blobs changed unexpectedly; rolled back')
    result['stage'] = 'merged-tests'
    save()
    with (RUN / 'live-suite.txt').open('w') as f:
        rc = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent',
                            stdout=f, stderr=subprocess.STDOUT).returncode
    (RUN / 'live-suite.exit').write_text(str(rc) + '\n')
    result['tests_rc'] = rc
    if rc:
        git('reset', '--merge', pre)
        result['rolled_back'] = git('rev-parse', 'HEAD').stdout.strip()
        raise RuntimeError('merged sandbox tests failed; source merge rolled back')
    git('diff', '--exit-code', FIX, 'HEAD', '--', 'agent/src/reflex/turn-solver.ts',
        'agent/tests/silent-poison-held.test.ts', 'agent/tests/silent-poison-held-evidence.json')
    stamp = command(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
    versions_path = LIVE / 'eval/versions.json'
    versions = json.loads(versions_path.read_text())
    number = max(int(v['name'][6:]) for v in versions['versions'] if v['name'].startswith('S1.fix')) + 1
    version = 'S1.fix' + str(number)
    result['version'] = version
    entry = (f'{stamp} Codex学习者纯bug自测后上线：fix-queue-v4 2026-10-07 07:04毒杀胜利分支漏算持牌伤；'
             f'源码{FIX}→实际live代码{result["code_merge"]}，eval {version}。'
             '证据TKXQ6L4N9A6U SILENT A10 F22 T6，bug-infra silent-0213；独立毒素机制0214及既有0059不重置。'
             '7血0挡留两张各5伤毒素，完整末伤10、余−3，玩家先死亡时不预支11/14毒或敌9+21攻击；'
             '安全毒杀仍支付持牌伤，即时攻击胜利维持免末伤，既有移牌/格挡/回血模型保持。'
             '共用求解器仅纠正经过回合末的毒终结；铁甲无毒及即时胜利路径等价，若铁甲走同型毒终结也按共用缺陷修正，此差异来自同一结算错误而非新增铁甲知识。'
             '不加药水代价/过滤/否决、提前或留药规则，不改保血/时钟/路线/休息/击杀优先/SL阈值或构筑估值，不声称整场转胜。'
             '固定9例撤全部生产源码7失败2通过、恢复9通过；初稿字段错误与补回血期间旧源码整套失败日志保留，冻结定稿源及合后沙箱tsc/vitest0，gitleaks0。'
             '自动知识刷新逐blob保持，无生成器修改、不重建；学习者仅CLI/by=learner:fix-batch登记0213 proposed与源码提交。'
             '交运维据fix-done及learner/runs/20261007-072650-fix-batch/handoff-ops.md确认实际发布后CLI登记shipped，完整外部套件由调度器补跑。'
             '130项旧修复不重复提交；自愈根因/缓存实测/性能专项和策略待定保持，boss跨进阶校准留独立专用功能批次。'
             '队列未改，不停对局、不运行play、不推送。')
    with (LIVE / 'paper/materials/decision-log.md').open('a') as f:
        f.write('\n- ' + entry + '\n')
    versions['versions'].append({'name': version, 'family': 'Silent', 'commit': result['code_merge'], 'source': entry})
    versions_path.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
    git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
    scan('live-release-gitleaks.txt')
    commit('Record held-card damage before poison finish deployment')
    result['merged'] = git('rev-parse', 'HEAD').stdout.strip()
    result['tree'] = git('rev-parse', 'HEAD^{tree}').stdout.strip()
    result['knowledge_preserved'] = knowledge_blobs(result['merged']) == before
    result['stage'] = 'released'
    save()
    print(json.dumps(result, ensure_ascii=False))
except Exception as exc:
    result['error'] = str(exc)
    save()
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(1)
