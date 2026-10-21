from pathlib import Path
import fcntl
import hashlib
import json
import os
import re
import subprocess
import time

r = Path('/home/dw/Projects/agent-sts2')
a = Path(__file__).resolve().parent
m = r / 'paper/materials/20261021-github-issues-ops'
state_path = r / 'notes/issue-4-elite-calibration-dispatch.json'
state = json.loads(state_path.read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()


def stamp():
    return subprocess.check_output(['date', '-Iseconds'], text=True).strip()


def save():
    raw = json.dumps(state, ensure_ascii=False, indent=2) + '\n'
    for path in [state_path, a / 'issue-4-dispatch.json']:
        temp = path.with_name(path.name + '.tmp')
        temp.write_text(raw)
        os.replace(temp, path)


try:
    with (r / 'ops/codex-ops/learner/issue-4-elite-calibration.lock').open('a') as lease:
        fcntl.flock(lease, fcntl.LOCK_EX | fcntl.LOCK_NB)
        (a / 'issue-4-started-once').mkdir()
        assert state['state'] == 'prepared-not-dispatched'
        manifest = Path(state['manifest'])
        assert sha(manifest.read_bytes()) == state['manifest_sha256']
        for entry in json.loads(manifest.read_text())['files']:
            raw = Path(entry['path']).read_bytes()
            assert len(raw) == entry['bytes'] and sha(raw) == entry['sha256']
        tree = Path(state['worktree'])
        assert not subprocess.check_output(['git', '-C', str(tree), 'status', '--porcelain'])
        assert sha(Path(state['taskfile']).read_bytes()) == state['task_sha256']
        directory = r / 'ops/codex-ops'
        learner_home = (directory / 'codex-home').read_text().strip()
        assert learner_home == str(directory / 'accounts/codex1/learner')
        batch = state['batch']
        out_path = directory / 'learner' / (batch + '.out')
        err_path = directory / 'learner' / (batch + '.err')
        command = ['nice', '-n', '19', 'ionice', '-c', '3', str(r / 'agent/node_modules/.bin/tsx'),
                   str(r / 'learner/run.ts'), '--engine', 'codex', '--task', state['taskfile'],
                   '--cwd', str(tree), '--character', 'silent', '--model', 'gpt-6.1-sol',
                   '--effort', 'high', '--timeout-min', '240', '--set', 'batch=' + batch,
                   '--set', 'evidence=' + str(manifest)]
        env = {**os.environ, 'LEARNER_CODEX_HOME': learner_home,
               'LEARNER_CODEX_BIN': str(r / 'ops/codex-learner.sh'), 'STS2_WORKSPACE': str(r),
               'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH']}
        state.update(state='launching-original-sandbox', at=stamp(), supervisor_pid=os.getpid(),
                     stdout=str(out_path), stderr=str(err_path), command=command,
                     source_of_launch='existing learner/run.ts, fresh native session, no resume',
                     native_consumption='pending original native launch/turn receipt',
                     herdr_pane=os.environ.get('HERDR_PANE_ID'), account='original codex1 learner')
        save()
        with out_path.open('xb') as out, err_path.open('xb') as err:
            child = subprocess.Popen(command, cwd=r / 'agent', env=env, stdout=out, stderr=err)
            state.update(state='launcher-running-await-native-first-reply', launcher_pid=child.pid)
            save()
            print(f'Issue #4 original sandbox learner submitted: {batch}, launcher PID {child.pid}', flush=True)
            rc = child.wait()
        state.update(state='launcher-exited-awaiting-original-ops-audit', rc=rc, finished_at=stamp())
        match = re.search(r'(?:日志[:：]?\s+)(\S+\.jsonl)', err_path.read_text())
        if match:
            event_path = Path(match[1]); state['event_log'] = str(event_path)
            if event_path.is_file():
                with event_path.open() as fp:
                    for line in fp:
                        event = json.loads(line)
                        if event.get('type') == 'learner_launch':
                            state['scratch'] = event.get('params', {}).get('scratch')
                        elif event.get('type') == 'thread.started':
                            state['thread_id'] = event.get('thread_id')
        save()
except BaseException as error:
    state.update(state='blocked-original-issue-4-launch-no-auto-retry', at=stamp(),
                 error=type(error).__name__, reason=str(error))
    save()
finally:
    event = r / 'ops/codex-ops/queue' / f'{time.time_ns()}-manual.md'
    event.write_text('Issue #4 原精英模拟偏差一次性学习批次终局：' + json.dumps(state, ensure_ascii=False)
                     + '。只核原输入/证据/误差/反证及提案，按GitHub Issues规范在#4评论；'
                       '不据批次退出关科学父/正式发布，不自动续批/full/API，不改live/当前局。\n')
