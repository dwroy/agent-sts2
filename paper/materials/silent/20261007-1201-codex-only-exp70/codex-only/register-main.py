"""Append the verified main synchronization facts without changing released code."""
import fcntl
import json
from pathlib import Path
import subprocess

P = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
OWN = ROOT / '.worktrees/codex-only-brain'
state = json.loads((P / 'deployment.json').read_text())


def run(*args, cwd=OWN, check=True):
    r = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if check and r.returncode:
        raise RuntimeError(r.stdout[-800:] + r.stderr[-800:])
    return r


def git(*args, cwd=OWN):
    return run('git', *args, cwd=cwd).stdout.strip()


with (ROOT / 'ops/live-merge.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    assert not git('status', '--porcelain')
    assert not git('diff', '--cached', '--name-only', cwd=ROOT)
    source_sync = state['main_synced']
    assert git('rev-parse', 'HEAD') == source_sync
    assert git('rev-parse', 'HEAD', cwd=ROOT) == source_sync
    stamp = run('date', '+%Y-%m-%d %H:%M').stdout.strip()
    line = f"- {stamp} Codex学习者登记Roy已授权Codex-only独立功能主检出同步：实际源码/记录合入{source_sync}，54个功能文件与live固定发布{state['release_commit']}逐blob一致；live检查树{state['fixed_check_tree']}、固定发布树{state['release_tree']}、唯一版本{state['version']}。主检出候选43847ae4af6ebbf012f4e019679853649e0566e9的tsc0、Vitest223文件2363例及paths11通过；主检出测试期间运维追加记录导致快进受阻，原失败保留，仅在独占工作树合并双方追加记录/数据，未改他人已提交转录/CSV字节及运行时脏数据，无源码变化故不重跑已通过检查。shipped和固定发布树完整沙箱外检查/运行中脚本加载由运维核实；报告{P}/report.md与report.json，完成沿fix-batch通道回报。\n"
    with (OWN / 'paper/materials/decision-log.md').open('a') as f:
        f.write('\n' + line)
    run('git', 'add', '--', 'paper/materials/decision-log.md')
    run('git', 'diff', '--cached', '--check')
    delta = subprocess.check_output(['git', 'diff', '--cached', '--binary'], cwd=OWN)
    scan = subprocess.run(['gitleaks', 'stdin', '--redact'], input=delta, capture_output=True)
    (P / 'gitleaks-main-registration.log').write_bytes(scan.stdout + scan.stderr)
    assert scan.returncode == 0
    run('git', 'commit', '-m', 'Record verified Codex-only main synchronization and fixed release tree\n\nCo-Authored-By: Codex GPT-6 <noreply@openai.com>')
    records_commit = git('rev-parse', 'HEAD')
    run('git', 'merge', '--ff-only', records_commit, cwd=ROOT)
    state['main_feature_source_sync_commit'] = source_sync
    state['main_sync_log_commit'] = records_commit
    state['main_records_source'] = records_commit
    state['main_synced'] = git('rev-parse', 'HEAD', cwd=ROOT)
    state['main_tree'] = git('rev-parse', 'HEAD^{tree}', cwd=ROOT)
    state['main_sync_registration_date'] = stamp
    state['main_sync_registration_line'] = line
    state['main_sync_registration_tests'] = 'records-only; inherited code blobs equal tested candidate and fixed live release'
    (P / 'deployment.json').write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'registration_commit': records_commit, 'source_sync': source_sync}))
