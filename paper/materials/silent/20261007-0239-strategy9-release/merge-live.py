import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
SCRATCH = ROOT / 'learner/runs/20261007-021220-strategy-proposal'
BRANCH = 'strategy-proposal-20261007-021220'
IDENTITY = ['-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com']
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
PATHS = ['agent/src/sim/build-sim-facts.ts', 'agent/tests/silent-rest-sim-hp.test.ts', 'agent/tests/silent-rest-sim-hp-evidence.json']
result = dict(task='strategy-proposal', branch=BRANCH, merged=None, tests={}, version=None)
log = (SCRATCH / 'live-merge.log').open('a')

def run(args, check=True):
    done = subprocess.run(args, cwd=LIVE, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    log.write('$ ' + ' '.join(args) + '\n' + done.stdout + f'\nexit={done.returncode}\n'); log.flush()
    if check and done.returncode:
        raise RuntimeError(f'命令失败：{args[0]}，exit={done.returncode}；详见live-merge.log')
    return done

def git(*args):
    return run(['git', *args]).stdout.strip()

def names(*args):
    return set(git('diff', '--name-only', *args).splitlines())

def scan(name):
    patch = SCRATCH / (name + '.patch')
    patch.write_text(git('diff', '--cached') + '\n')
    with patch.open() as source, (SCRATCH / (name + '.log')).open('w') as output:
        done = subprocess.run(['nice', '-n', '19', 'gitleaks', 'stdin', '--no-banner', '--redact', '--no-color'],
                              cwd=LIVE, stdin=source, stdout=output, stderr=subprocess.STDOUT)
    (SCRATCH / (name + '.exit')).write_text(str(done.returncode) + '\n')
    assert done.returncode == 0, 'gitleaks扫描未通过，停止提交'

def blobs(ref):
    return {path: blob for line in git('ls-tree', '-r', ref, '--', 'knowledge').splitlines()
            for meta, path in [line.split('\t', 1)] for blob in [meta.split()[2]]}

try:
    assert git('branch', '--show-current') == 'live'
    assert not names('--cached'), 'live有其他暂存内容，停止'
    print('已取得live锁，等待知识刷新完成。', flush=True)
    run(['bash', '-c', "while pgrep -f 'knowledge/builders/buil[d]-' >/dev/null; do sleep 10; done"])
    source = git('rev-parse', BRANCH)
    result['source'] = source
    before = git('rev-parse', 'HEAD')
    common = git('merge-base', 'HEAD', source)
    incoming = names(common, source)
    work = names()
    assert not (incoming & {path for path in work if not path.startswith('knowledge/') and path != 'notes/fight-value-backtest.md'}), '合入路径与未提交内容重叠'
    incoming_knowledge = {path for path in incoming if path.startswith('knowledge/')}
    refresh = {path for path in work if path.startswith('knowledge/')}
    result['incoming_knowledge'] = sorted(incoming_knowledge)
    result['refreshed_paths'] = sorted(refresh)
    overlap = incoming_knowledge & refresh
    for path in overlap:
        assert git('hash-object', path) == git('rev-parse', f'{source}:{path}'), f'知识刷新与源码分支重叠且不同：{path}'
    run(['git', 'add', 'notes/fight-value-backtest.md', 'knowledge'])
    if names('--cached'):
        scan('gitleaks-refresh')
        run(['git', *IDENTITY, 'commit', '-m', f'Refresh knowledge data\n\n{COAUTHOR}'])
        result['refresh_commit'] = git('rev-parse', 'HEAD')
    else:
        result['refresh_commit'] = None
    baseline = git('rev-parse', 'HEAD')
    knowledge_before = blobs('HEAD')
    result['before'] = before
    result['rollback_target'] = baseline
    result['other_work_before'] = sorted(path for path in work if path not in refresh and path != 'notes/fight-value-backtest.md')
    committed_overlap = incoming_knowledge & names(common, baseline, '--', 'knowledge')
    for path in committed_overlap:
        assert git('rev-parse', f'HEAD:{path}') == git('rev-parse', f'{source}:{path}'), f'已提交知识刷新冲突：{path}'
    result['knowledge_overlap'] = sorted(overlap | committed_overlap)
    preflight = run(['git', 'merge-tree', '--write-tree', 'HEAD', source], check=False)
    result['preflight_exit'] = preflight.returncode
    assert preflight.returncode == 0, '合并预检冲突，停止，不覆盖刷新或历史'
    print('刷新已提交，知识重叠及合并预检通过，合入源码。', flush=True)
    run(['git', *IDENTITY, 'merge', '--no-edit', BRANCH])
    code_merge = git('rev-parse', 'HEAD')
    result['code_merge_attempt'] = code_merge
    result['source_blobs_equal'] = all(git('rev-parse', f'HEAD:{path}') == git('rev-parse', f'{source}:{path}') for path in PATHS)
    assert result['source_blobs_equal'], '合后本项源码blob不一致'
    result['knowledge_blobs_equal'] = knowledge_before == blobs('HEAD')
    assert result['knowledge_blobs_equal'], '已提交知识刷新被改变'
    print('开始合后固定沙箱检查。', flush=True)
    with (SCRATCH / 'live-suite.log').open('w') as output:
        done = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', stdout=output, stderr=subprocess.STDOUT)
    (SCRATCH / 'live-suite.exit').write_text(str(done.returncode) + '\n')
    result['tests']['sandbox_exit'] = done.returncode
    if done.returncode:
        rollback = run(['git', 'reset', '--merge', baseline], check=False)
        result['rollback_exit'] = rollback.returncode
        result['live_after_failure'] = git('rev-parse', 'HEAD')
        raise RuntimeError('合后沙箱检查失败，已按流程回退并保留知识刷新；不登记版本')
    result['merged'] = code_merge
    result['knowledge_blobs_equal_after_tests'] = knowledge_before == blobs('HEAD')
    assert result['knowledge_blobs_equal_after_tests']
    print('合后检查通过，追加上线记录和eval版本。', flush=True)
    stamp = run(['date', '+%Y-%m-%d %H:%M']).stdout.strip()
    versions_path = LIVE / 'eval/versions.json'
    versions = json.loads(versions_path.read_text())
    numbers = [int(match.group(1)) for item in versions['versions'] if (match := re.fullmatch(r'S1\.strategy(\d+)', item.get('name', '')))]
    version = f'S1.strategy{max(numbers, default=0) + 1}'
    result['version'] = version
    detail = (f'静默休息题逐选项即时HP／路线耗尽／boss模拟输入事实；来源{SCRATCH}/proposal.md、fix-queue-v4 2026-10-05 08:33授权，'
              'LS8035TB32P3 SILENT A10 F40及F16休息题（回合不适用）、F42末试T8，账本silent-0201，既有0019／0020／0139保持。'
              f'源码{source}→实际live代码{code_merge}；F40实回4→28，两线首次中位耗尽F42／F45，原投影−18.5／−27.9均按1血模拟，'
              '不把相同输入或胜率读为即时回血无用；F16保留42／65的正常投影。只为HEAL／SMITH单列当前／动作后HP、增量、'
              '未下限投影、实际模拟输入、首次耗尽节点和未来默认回血营火，相同输入HP指标并列；未知保持未知，不预支后续营火或定确定死亡。'
              '全部原选项、动作、模拟／校准／样本门槛及铁甲行为保持，无新增药水代价／过滤／否决／提前或留药规则，无统一血线或整战转胜结论。'
              '固定9例撤源码6失败3通过exit1、恢复9通过exit0；源及合后固定沙箱tsc/vitest0，gitleaks0，首轮通过、无高负载超时重跑。'
              '知识刷新逐blob保持，无生成器改动、不重建。0201仅CLI/by=learner:strategy-proposal proposed；'
              '交strategy-done与handoff-ops.md通知运维核实际合入后CLI shipped，完整外部由调度器补跑；不停对局、不运行play、不推送。')
    with (LIVE / 'paper/materials/decision-log.md').open('a') as output:
        output.write(f'\n- {stamp} Codex学习者策略自测后上线：{detail} eval {version}。\n')
    versions['versions'].append(dict(name=version, family='Silent', commit=code_merge, source=f'decision-log {stamp}（{detail}）'))
    versions_path.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
    run(['git', 'add', 'paper/materials/decision-log.md', 'eval/versions.json'])
    run(['git', 'diff', '--cached', '--check'])
    scan('gitleaks-release')
    run(['git', *IDENTITY, 'commit', '-m', f'Record Silent rest HP projection strategy release\n\n{COAUTHOR}'])
    result['release'] = git('rev-parse', 'HEAD')
    result['release_tree'] = git('rev-parse', 'HEAD^{tree}')
    result['remaining_status'] = git('status', '--short')
    print(f'{version}已上线；实际提交写入live-result.json。', flush=True)
except Exception as error:
    result['error'] = str(error)
    print(str(error), flush=True)
    raise
finally:
    (SCRATCH / 'live-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    log.close()
